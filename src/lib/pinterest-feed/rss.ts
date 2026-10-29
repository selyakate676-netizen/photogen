import { getShortNanoPackDefinition } from "../ai/short-pack-prompts.ts";
import { photoPacks } from "../photoPacks.ts";

const ORIGIN = "https://photogenlab.ru";
const RSS_WINDOW_DAYS = 90;
const MOSCOW_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Moscow",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export const PINTEREST_RSS_HEADERS = {
  "Content-Type": "application/rss+xml; charset=utf-8",
  "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
} as const;

export type PinterestRssRow = Readonly<{
  bundleId: string;
  packId: string;
  heroCompositionId: string;
  packUrl: string;
  previewPath: string;
  telegramPromptUrl: string;
  pinterestExcluded: boolean;
  rssScheduledAt: string;
}>;

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function moscowParts(date: Date): Record<string, string> {
  return Object.fromEntries(
    MOSCOW_FORMATTER.formatToParts(date).map(({ type, value }) => [type, value]),
  );
}

function moscowDayKey(date: Date): string {
  const parts = moscowParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function pinterestRssWindowStart(now: Date): Date {
  if (Number.isNaN(now.getTime())) return new Date(Number.NaN);
  const parts = moscowParts(now);
  // Europe/Moscow has used UTC+03:00 throughout the lifetime of this feed.
  // Day zero is included, so subtract 89 days to retain 90 calendar days.
  return new Date(Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day) - (RSS_WINDOW_DAYS - 1), -3,
  ));
}

export function isPinterestMoscowSlot(date: Date): boolean {
  if (Number.isNaN(date.getTime())) return false;
  const parts = moscowParts(date);
  return parts.minute === "00"
    && parts.second === "00"
    && date.getUTCMilliseconds() === 0
    && (parts.hour === "10" || parts.hour === "18");
}

function visibleRows(rows: readonly PinterestRssRow[], now: Date): PinterestRssRow[] {
  const seenSlots = new Set<string>();
  const seenBundleIds = new Set<string>();
  const dailyCount = new Map<string, number>();
  const visible: PinterestRssRow[] = [];
  const windowStart = pinterestRssWindowStart(now);
  const ordered = [...rows].sort((left, right) => (
    left.rssScheduledAt.localeCompare(right.rssScheduledAt)
      || left.bundleId.localeCompare(right.bundleId)
  ));
  for (const row of ordered) {
    const scheduled = new Date(row.rssScheduledAt);
    if (!isPinterestMoscowSlot(scheduled) || scheduled < windowStart || scheduled > now) continue;
    const slotKey = scheduled.toISOString();
    const dayKey = moscowDayKey(scheduled);
    const count = dailyCount.get(dayKey) ?? 0;
    if (seenSlots.has(slotKey) || seenBundleIds.has(row.bundleId) || count >= 2) continue;
    seenSlots.add(slotKey);
    seenBundleIds.add(row.bundleId);
    dailyCount.set(dayKey, count + 1);
    if (!row.pinterestExcluded) visible.push(row);
  }
  return visible.sort((left, right) => right.rssScheduledAt.localeCompare(left.rssScheduledAt));
}

function renderItem(row: PinterestRssRow): string | null {
  const definition = getShortNanoPackDefinition(row.packId);
  const hero = definition?.heroCompositions.find(
    ({ heroCompositionId }) => heroCompositionId === row.heroCompositionId,
  );
  const pack = definition ? photoPacks.find(({ id }) => id === definition.styleId) : undefined;
  if (!definition || !hero || !pack) return null;
  if (row.packUrl !== `${ORIGIN}/packs/${pack.slug}` || !pack.gallery.includes(row.previewPath)) {
    return null;
  }
  const frameIndex = Number.parseInt(row.heroCompositionId.slice(3), 10) - 1;
  const frameLabel = pack.deliverables[frameIndex] ?? hero.name;
  const title = `${pack.title} — ${frameLabel}`;
  const description = `${pack.description}. ${pack.summary} Композиция «${frameLabel}».`;
  const imageUrl = `${ORIGIN}${row.previewPath}`;
  const pubDate = new Date(row.rssScheduledAt).toUTCString();
  return [
    "    <item>",
    `      <title>${escapeXml(title)}</title>`,
    `      <description>${escapeXml(description)}</description>`,
    `      <link>${escapeXml(row.packUrl)}</link>`,
    `      <guid isPermaLink="false">${escapeXml(`photogen:bundle:${row.bundleId}`)}</guid>`,
    `      <pubDate>${escapeXml(pubDate)}</pubDate>`,
    `      <comments>${escapeXml(row.telegramPromptUrl)}</comments>`,
    `      <media:content url="${escapeXml(imageUrl)}" type="image/jpeg" medium="image" />`,
    `      <media:title>${escapeXml(title)}</media:title>`,
    `      <media:description>${escapeXml(description)}</media:description>`,
    "    </item>",
  ].join("\n");
}

export function buildPinterestRss(rows: readonly PinterestRssRow[], now = new Date()): string {
  const visible = visibleRows(rows, now);
  const items = visible.map(renderItem).filter((item): item is string => item !== null);
  const latest = visible[0];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">',
    "  <channel>",
    "    <title>PhotoGenLab — идеи фотосессий</title>",
    `    <link>${ORIGIN}</link>`,
    "    <description>Готовые образы и идеи фотосессий PhotoGenLab</description>",
    "    <language>ru-RU</language>",
    ...(latest ? [`    <lastBuildDate>${new Date(latest.rssScheduledAt).toUTCString()}</lastBuildDate>`] : []),
    "    <ttl>5</ttl>",
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
