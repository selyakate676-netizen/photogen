import { NextResponse } from "next/server";

import { getEnv } from "@/lib/env";
import {
  ingestPinterestFeedEvent,
  validatePinterestFeedEvent,
  verifyPinterestFeedSignature,
  type PinterestFeedRecord,
  type PinterestFeedStore,
} from "@/lib/pinterest-feed/ingest";
import { createServiceRoleClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

function createStore(): PinterestFeedStore {
  const supabase = createServiceRoleClient();
  return {
    async find(bundleId) {
      const { data, error } = await supabase.from("pinterest_feed_items").select("*").eq("bundle_id", bundleId).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        schemaVersion: data.schema_version as 1,
        bundleId: data.bundle_id,
        bundleSha256: data.bundle_sha256,
        packId: data.pack_id,
        heroCompositionId: data.hero_composition_id,
        packUrl: data.pack_url,
        previewPath: data.preview_path,
        previewSha256: data.preview_sha256,
        telegramChannelMessageId: data.telegram_channel_message_id,
        telegramCommentMessageId: data.telegram_comment_message_id,
        telegramPromptUrl: data.telegram_prompt_url,
        pinterestExcluded: data.pinterest_excluded as false,
        contentSha256: data.content_sha256,
      } satisfies PinterestFeedRecord;
    },
    async insert(record) {
      const { error } = await supabase.from("pinterest_feed_items").insert({
        schema_version: record.schemaVersion,
        bundle_id: record.bundleId,
        bundle_sha256: record.bundleSha256,
        pack_id: record.packId,
        hero_composition_id: record.heroCompositionId,
        pack_url: record.packUrl,
        preview_path: record.previewPath,
        preview_sha256: record.previewSha256,
        telegram_channel_message_id: record.telegramChannelMessageId,
        telegram_comment_message_id: record.telegramCommentMessageId,
        telegram_prompt_url: record.telegramPromptUrl,
        pinterest_excluded: record.pinterestExcluded,
        content_sha256: record.contentSha256,
      });
      if (!error) return "inserted";
      if (error.code === "23505") return "conflict";
      throw error;
    },
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let secret: string;
  try {
    secret = getEnv("PINTEREST_FEED_HMAC_SECRET");
  } catch {
    return NextResponse.json({ error: "INGEST_NOT_CONFIGURED" }, { status: 503 });
  }
  if (!verifyPinterestFeedSignature(rawBody, request.headers, secret)) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  try {
    const event = await validatePinterestFeedEvent(parsed);
    const result = await ingestPinterestFeedEvent(event, createStore());
    if (result === "conflict") return NextResponse.json({ error: "BUNDLE_CONFLICT" }, { status: 409 });
    return NextResponse.json({ status: result }, { status: result === "created" ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "INGEST_FAILED";
    const validation = message.startsWith("INVALID_") || message.startsWith("UNKNOWN_") || message.startsWith("PREVIEW_");
    return NextResponse.json({ error: validation ? message : "INGEST_FAILED" }, { status: validation ? 400 : 500 });
  }
}
