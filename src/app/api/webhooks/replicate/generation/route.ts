import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getS3BucketName, getSupabaseServiceRoleConfig, getWebhookSecret } from "@/lib/env";
import { updatePhotoshootGenerationStatus } from "@/lib/photoshoots/status";
import type { Database, PhotoshootStatus } from "@/types/database";

interface ReplicateGenerationPayload {
  id?: string;
  status?: string;
  output?: unknown;
}

function getOutputImages(output: unknown): string[] {
  if (!Array.isArray(output)) {
    return [];
  }

  return output.filter((item): item is string => typeof item === "string" && item.length > 0);
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

    // Р•СЃР»Рё РіРµРЅРµСЂР°С†РёСЏ Р·Р°РІРµСЂС€РёР»Р°СЃСЊ СЃ РѕС€РёР±РєРѕР№
    if (payload.status === "failed" || payload.status === "canceled") {
      const { data: currentShoot } = await supabase
        .from('photoshoots')
        .select('result_images, generation_id')
        .eq('id', photoshootId)
        .single();

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
      const images = getOutputImages(payload.output);

      if (images.length === 0) {
        await updatePhotoshootGenerationStatus(supabase, photoshootId, 'failed');
        return NextResponse.json({ error: "No images generated." }, { status: 400 });
      }

      const { PutObjectCommand } = await import("@aws-sdk/client-s3");
      const { s3Client } = await import("@/lib/s3");
      
      const savedS3Keys: string[] = [];

      // РЎРєР°С‡РёРІР°РµРј РєР°Р¶РґСѓСЋ РєР°СЂС‚РёРЅРєСѓ РёР· Replicate Рё СЃРѕС…СЂР°РЅСЏРµРј РІ РЅР°С€Рµ РґРѕР»РіРѕРІРµС‡РЅРѕРµ S3-С…СЂР°РЅРёР»РёС‰Рµ (Beget)
      for (let i = 0; i < images.length; i++) {
        try {
           const imageUrl = images[i];
           const response = await fetch(imageUrl);
           
           if (!response.ok) {
              console.error("Failed to fetch image from Replicate:", imageUrl);
              continue;
           }
           
           const buffer = Buffer.from(await response.arrayBuffer());
           // Р”РѕР±Р°РІР»СЏРµРј timestamp, С‡С‚РѕР±С‹ РєР»СЋС‡Рё Р±С‹Р»Рё СѓРЅРёРєР°Р»СЊРЅС‹РјРё РґР»СЏ РїР°СЂР°Р»Р»РµР»СЊРЅС‹С… РІРµР±С…СѓРєРѕРІ
           const stableSource = payload.id || imageUrl;
           const s3Key = `photoshoots/generations/${photoshootId}/result_${getStableKeyPart(stableSource)}_${i}.jpg`;
           
           await s3Client.send(new PutObjectCommand({
             Bucket: getS3BucketName(),
             Key: s3Key,
             Body: buffer,
             ContentType: "image/jpeg",
           }));
           
           savedS3Keys.push(s3Key);
        } catch (err) {
           console.error("Error saving image to S3:", err);
        }
      }

      // Рў.Рє. С‚РµРїРµСЂСЊ РІРµР±С…СѓРє РјРѕР¶РµС‚ РІС‹Р·С‹РІР°С‚СЊСЃСЏ 4 СЂР°Р·Р° (РёР·-Р·Р° 4 СЂР°Р·РЅС‹С… РїСЂРѕРјРїС‚РѕРІ),
      // РЅР°Рј РЅСѓР¶РЅРѕ Р°РєРєСѓСЂР°С‚РЅРѕ РґРѕР±Р°РІРёС‚СЊ РєР»СЋС‡Рё Рє СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓСЋС‰РёРј (РІ СЂР°РјРєР°С… РћР”РќРћР™ РіРµРЅРµСЂР°С†РёРё)
      
      // РќРµР±РѕР»СЊС€Р°СЏ СЃР»СѓС‡Р°Р№РЅР°СЏ Р·Р°РґРµСЂР¶РєР° РґР»СЏ РјРёРЅРёРјРёР·Р°С†РёРё race conditions РїСЂРё РїР°СЂР°Р»Р»РµР»СЊРЅС‹С… Р°РїРґРµР№С‚Р°С…
      
      const { data: currentShoot } = await supabase
          .from('photoshoots')
          .select('result_images, status, generation_id')
          .eq('id', photoshootId)
          .single();
          
      // Р‘РµСЂС‘Рј С‚РѕР»СЊРєРѕ РёР·РѕР±СЂР°Р¶РµРЅРёСЏ, РЅР°РєРѕРїР»РµРЅРЅС‹Рµ РІ СЂР°РјРєР°С… РўР•РљРЈР©Р•Р™ РіРµРЅРµСЂР°С†РёРё
      // Р•СЃР»Рё generation_id РёР·РјРµРЅРёР»СЃСЏ СЃ РїРѕСЃР»РµРґРЅРµРіРѕ Р·Р°РїСѓСЃРєР° вЂ” СЃР±СЂР°СЃС‹РІР°РµРј СЃС‚Р°СЂС‹Рµ
      const existingImages = currentShoot?.result_images || [];
      const newImages = sortImagesByGenerationOrder(
        uniqueStrings([...existingImages, ...savedS3Keys]),
        currentShoot?.generation_id,
      );
      // Successful runs wait for every Hero Composition; error recovery allows one provider failure.
      const expectedCount =
        currentShoot?.status === 'failed'
          ? getCompletedImagesThreshold(currentShoot?.generation_id)
          : getRequiredImagesCount(currentShoot?.generation_id);
      const isCompleted = newImages.length >= expectedCount;

      const nextStatus: PhotoshootStatus = isCompleted ? 'completed' : currentShoot?.status === 'failed' ? 'failed' : 'generating';
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
