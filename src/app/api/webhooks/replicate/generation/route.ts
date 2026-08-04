import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getS3BucketName, getSupabaseServiceRoleConfig, getWebhookSecret } from "@/lib/env";
import {
  ProviderOutputError,
  downloadReplicateImage,
  normalizeReplicateOutputUrls,
} from "@/lib/ai/image-generation-provider";
import { updatePhotoshootGenerationStatus } from "@/lib/photoshoots/status";
import type { Database, PhotoshootStatus } from "@/types/database";

interface ReplicateGenerationPayload {
  id?: string;
  status?: string;
  output?: unknown;
}

function getStableKeyPart(value: string): string {
  return Buffer.from(value).toString("base64url").slice(0, 32);
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function getGenerationIds(generationId: string | null | undefined): string[] {
  if (!generationId) {
    return [];
  }

  return generationId
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function getCompletedImagesThreshold(generationId: string | null | undefined): number {
  const ids = getGenerationIds(generationId);
  if (ids.length <= 1) return 1;

  // Hero Composition sets should complete with one tolerated provider failure instead of leaving the UI stuck forever.
  return Math.max(1, ids.length - 1);
}

function getRequiredImagesCount(generationId: string | null | undefined): number {
  const ids = getGenerationIds(generationId);
  return ids.length || 1;
}

function sortImagesByGenerationOrder(images: string[], generationId: string | null | undefined): string[] {
  const ids = getGenerationIds(generationId);

  if (ids.length <= 1) {
    return images;
  }

  const order = new Map(ids.map((id, index) => [getStableKeyPart(id), index]));

  return [...images].sort((a, b) => {
    const aIndex = Array.from(order.entries()).find(([key]) => a.includes(key))?.[1] ?? Number.MAX_SAFE_INTEGER;
    const bIndex = Array.from(order.entries()).find(([key]) => b.includes(key))?.[1] ?? Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
}

export async function POST(request: Request) {
  try {
    // 1. РџСЂРѕРІРµСЂСЏРµРј СЃРµРєСЂРµС‚РЅС‹Р№ РєР»СЋС‡
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    const photoshootId = searchParams.get("photoshootId");

    if (secret !== getWebhookSecret()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!photoshootId) {
      return NextResponse.json({ error: "Missing photoshootId" }, { status: 400 });
    }

    // 2. РџРѕР»СѓС‡Р°РµРј С‚РµР»Рѕ Р·Р°РїСЂРѕСЃР° РѕС‚ Replicate
    const payload = (await request.json()) as ReplicateGenerationPayload;
    console.log(`Replicate Generation Webhook received for photoshoot: ${photoshootId}. Status: ${payload.status}`);

    // Р’Р°Р¶РЅРѕ: РРЎРџРћР›Р¬Р—РЈР•Рњ SERVICE ROLE KEY РґР»СЏ РѕР±С…РѕРґР° RLS
    // РРЅР°С‡Рµ Р°РЅРѕРЅРёРјРЅС‹Р№ РІРµР±С…СѓРє РЅРµ СЃРјРѕР¶РµС‚ РѕР±РЅРѕРІРёС‚СЊ РІР°С€Сѓ Р±Р°Р·Сѓ РґР°РЅРЅС‹С…!
    const supabaseConfig = getSupabaseServiceRoleConfig();
    const supabase = createClient<Database>(supabaseConfig.url, supabaseConfig.serviceRoleKey);

    if (!payload.id) {
      return NextResponse.json({ error: "Missing prediction id." }, { status: 400 });
    }

    const { data: currentShoot, error: currentShootError } = await supabase
      .from("photoshoots")
      .select("result_images,status,generation_id")
      .eq("id", photoshootId)
      .single();

    if (currentShootError || !currentShoot) {
      console.error("[generation-webhook] Photoshoot lookup failed", {
        photoshootId,
        predictionId: payload.id,
      });
      return NextResponse.json({ error: "Photoshoot not found." }, { status: 404 });
    }

    if (!getGenerationIds(currentShoot.generation_id).includes(payload.id)) {
      console.warn("[generation-webhook] Ignored unassociated prediction", {
        photoshootId,
        predictionId: payload.id,
      });
      return NextResponse.json({ message: "Prediction is not associated with this photoshoot." }, { status: 202 });
    }

    if (["completed", "failed", "cancelled"].includes(currentShoot.status)) {
      return NextResponse.json({ message: "Terminal photoshoot status already recorded." });
    }

    // Р•СЃР»Рё РіРµРЅРµСЂР°С†РёСЏ Р·Р°РІРµСЂС€РёР»Р°СЃСЊ СЃ РѕС€РёР±РєРѕР№
    if (payload.status === "failed" || payload.status === "canceled") {
      const existingCount = (currentShoot?.result_images || []).length;
      const expectedCount = getCompletedImagesThreshold(currentShoot?.generation_id);
      const nextStatus: PhotoshootStatus = existingCount >= expectedCount ? 'completed' : 'failed';

      const updated = await updatePhotoshootGenerationStatus(supabase, photoshootId, nextStatus);
      if (!updated) {
        return NextResponse.json({ message: `Generation failed/canceled. Status transition to ${nextStatus} was ignored.` });
      }

      return NextResponse.json({ message: `Generation failed/canceled. Status updated to ${nextStatus}.` });
    }

    // 3. РЈСЃРїРµС€РЅР°СЏ РіРµРЅРµСЂР°С†РёСЏ
    if (payload.status === "succeeded") {
      let images: string[];

      try {
        images = normalizeReplicateOutputUrls(payload.output);
      } catch (error) {
        console.error("[generation-webhook] Invalid provider output", {
          photoshootId,
          predictionId: payload.id,
          errorCode:
            error instanceof ProviderOutputError
              ? error.code
              : "MALFORMED_PROVIDER_OUTPUT",
        });
        await updatePhotoshootGenerationStatus(supabase, photoshootId, "failed");
        return NextResponse.json({ error: "Generation output is unavailable." }, { status: 400 });
      }

      if (images.length === 0) {
        await updatePhotoshootGenerationStatus(supabase, photoshootId, 'failed');
        return NextResponse.json({ error: "Generation output is unavailable." }, { status: 400 });
      }

      const { PutObjectCommand } = await import("@aws-sdk/client-s3");
      const { s3Client } = await import("@/lib/s3");
      
      const savedS3Keys: string[] = [];
      const stablePredictionKey = getStableKeyPart(payload.id);
      const existingImages = currentShoot.result_images || [];

      if (existingImages.some((key) => key.includes(`result_${stablePredictionKey}_`))) {
        return NextResponse.json({ message: "Prediction output already recorded." });
      }

      // РЎРєР°С‡РёРІР°РµРј РєР°Р¶РґСѓСЋ РєР°СЂС‚РёРЅРєСѓ РёР· Replicate Рё СЃРѕС…СЂР°РЅСЏРµРј РІ РЅР°С€Рµ РґРѕР»РіРѕРІРµС‡РЅРѕРµ S3-С…СЂР°РЅРёР»РёС‰Рµ (Beget)
      for (let i = 0; i < images.length; i++) {
        try {
           const { buffer, contentType } = await downloadReplicateImage(images[i]);
           // Р”РѕР±Р°РІР»СЏРµРј timestamp, С‡С‚РѕР±С‹ РєР»СЋС‡Рё Р±С‹Р»Рё СѓРЅРёРєР°Р»СЊРЅС‹РјРё РґР»СЏ РїР°СЂР°Р»Р»РµР»СЊРЅС‹С… РІРµР±С…СѓРєРѕРІ
           const s3Key = `photoshoots/generations/${photoshootId}/result_${stablePredictionKey}_${i}.jpg`;
           
           await s3Client.send(new PutObjectCommand({
             Bucket: getS3BucketName(),
             Key: s3Key,
             Body: buffer,
             ContentType: contentType,
           }));
           
           savedS3Keys.push(s3Key);
        } catch (error) {
           console.error("[generation-webhook] Output persistence failed", {
             photoshootId,
             predictionId: payload.id,
             errorCode:
               error instanceof ProviderOutputError
                 ? error.code
                 : "S3_PERSISTENCE_FAILED",
           });
           await updatePhotoshootGenerationStatus(supabase, photoshootId, "failed");
           return NextResponse.json({ error: "Generation output could not be saved." }, { status: 502 });
        }
      }

      // Рў.Рє. С‚РµРїРµСЂСЊ РІРµР±С…СѓРє РјРѕР¶РµС‚ РІС‹Р·С‹РІР°С‚СЊСЃСЏ 4 СЂР°Р·Р° (РёР·-Р·Р° 4 СЂР°Р·РЅС‹С… РїСЂРѕРјРїС‚РѕРІ),
      // РЅР°Рј РЅСѓР¶РЅРѕ Р°РєРєСѓСЂР°С‚РЅРѕ РґРѕР±Р°РІРёС‚СЊ РєР»СЋС‡Рё Рє СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓСЋС‰РёРј (РІ СЂР°РјРєР°С… РћР”РќРћР™ РіРµРЅРµСЂР°С†РёРё)
      
      // РќРµР±РѕР»СЊС€Р°СЏ СЃР»СѓС‡Р°Р№РЅР°СЏ Р·Р°РґРµСЂР¶РєР° РґР»СЏ РјРёРЅРёРјРёР·Р°С†РёРё race conditions РїСЂРё РїР°СЂР°Р»Р»РµР»СЊРЅС‹С… Р°РїРґРµР№С‚Р°С…
      
      const { data: latestShoot } = await supabase
          .from('photoshoots')
          .select('result_images, status, generation_id')
          .eq('id', photoshootId)
          .single();
          
      // Р‘РµСЂС‘Рј С‚РѕР»СЊРєРѕ РёР·РѕР±СЂР°Р¶РµРЅРёСЏ, РЅР°РєРѕРїР»РµРЅРЅС‹Рµ РІ СЂР°РјРєР°С… РўР•РљРЈР©Р•Р™ РіРµРЅРµСЂР°С†РёРё
      // Р•СЃР»Рё generation_id РёР·РјРµРЅРёР»СЃСЏ СЃ РїРѕСЃР»РµРґРЅРµРіРѕ Р·Р°РїСѓСЃРєР° вЂ” СЃР±СЂР°СЃС‹РІР°РµРј СЃС‚Р°СЂС‹Рµ
      const newImages = sortImagesByGenerationOrder(
        uniqueStrings([...(latestShoot?.result_images || []), ...savedS3Keys]),
        latestShoot?.generation_id,
      );
      // Successful runs wait for every Hero Composition; error recovery allows one provider failure.
      const expectedCount =
        latestShoot?.status === 'failed'
          ? getCompletedImagesThreshold(latestShoot?.generation_id)
          : getRequiredImagesCount(latestShoot?.generation_id);
      const isCompleted = newImages.length >= expectedCount;

      const nextStatus: PhotoshootStatus = isCompleted ? 'completed' : latestShoot?.status === 'failed' ? 'failed' : 'generating';
      const updated = await updatePhotoshootGenerationStatus(supabase, photoshootId, nextStatus, newImages);
      if (!updated) {
        return NextResponse.json({ message: `Image saved, but status transition to ${nextStatus} was ignored. Total: ${newImages.length}` });
      }

      return NextResponse.json({ message: `Image added. Status updated to ${isCompleted ? 'completed' : 'generating'}. Total: ${newImages.length}` });

    }

    return NextResponse.json({ message: "Status received but no action required." });

  } catch (error: unknown) {
    console.error("Generation Webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
