import {
  buildPinterestRss,
  pinterestRssWindowStart,
  PINTEREST_RSS_HEADERS,
} from "@/lib/pinterest-feed/rss";
import { createServiceRoleClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const RSS_COLUMNS = "bundle_id, pack_id, hero_composition_id, pack_url, preview_path, telegram_prompt_url, pinterest_excluded, rss_scheduled_at" as const;

export async function GET() {
  const now = new Date();
  const windowStart = pinterestRssWindowStart(now);
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("pinterest_feed_items")
    .select(RSS_COLUMNS)
    .eq("pinterest_excluded", false)
    .gte("rss_scheduled_at", windowStart.toISOString())
    .lte("rss_scheduled_at", now.toISOString())
    .order("rss_scheduled_at", { ascending: true });
  if (error) {
    return new Response("Pinterest feed is temporarily unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const rows = (data ?? []).map((row) => ({
    bundleId: row.bundle_id,
    packId: row.pack_id,
    heroCompositionId: row.hero_composition_id,
    packUrl: row.pack_url,
    previewPath: row.preview_path,
    telegramPromptUrl: row.telegram_prompt_url,
    pinterestExcluded: row.pinterest_excluded,
    rssScheduledAt: row.rss_scheduled_at,
  }));
  return new Response(buildPinterestRss(rows, now), { headers: PINTEREST_RSS_HEADERS });
}
