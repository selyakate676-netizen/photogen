import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildPinterestRss,
  escapeXml,
  isPinterestMoscowSlot,
  pinterestRssWindowStart,
  PINTEREST_RSS_HEADERS,
} from "../src/lib/pinterest-feed/rss.ts";

function row(overrides = {}) {
  return {
    bundleId: "photogen-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    packId: "SP-031",
    heroCompositionId: "HC-001",
    packUrl: "https://photogenlab.ru/packs/flowers",
    previewPath: "/package-previews/sp031-flowers-model-b-hc001.jpg",
    telegramPromptUrl: "https://t.me/photogeniclab/101?comment=303",
    pinterestExcluded: false,
    rssScheduledAt: "2026-10-28T07:00:00.000Z",
    ...overrides,
  };
}

test("renders valid RSS media with stable bundle GUID and pack destination", () => {
  const xml = buildPinterestRss([row()], new Date("2026-10-28T07:01:00Z"));
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<rss version="2\.0" xmlns:media="http:\/\/search\.yahoo\.com\/mrss\/">/);
  assert.match(xml, /<guid isPermaLink="false">photogen:bundle:photogen-a{32}<\/guid>/);
  assert.match(xml, /<link>https:\/\/photogenlab\.ru\/packs\/flowers<\/link>/);
  assert.match(xml, /<media:content url="https:\/\/photogenlab\.ru\/package-previews\/sp031-/);
  assert.match(xml, /<comments>https:\/\/t\.me\/photogeniclab\/101\?comment=303<\/comments>/);
  assert.doesNotMatch(xml, /prompt/i);
});

test("uses existing pack and frame metadata for SEO copy, never the original prompt", () => {
  const xml = buildPinterestRss([row()], new Date("2026-10-28T07:01:00Z"));
  assert.match(xml, /Розовые пионы/);
  assert.match(xml, /Портрет сидя на полу/);
  assert.match(xml, /Нежная студийная фотосессия/);
  assert.doesNotMatch(xml, /СТРОГО сохранить лицо/);
});

test("recognizes exactly the 10:00 and 18:00 Moscow slots", () => {
  assert.equal(isPinterestMoscowSlot(new Date("2026-10-28T07:00:00Z")), true);
  assert.equal(isPinterestMoscowSlot(new Date("2026-10-28T15:00:00Z")), true);
  assert.equal(isPinterestMoscowSlot(new Date("2026-10-28T06:59:59Z")), false);
  assert.equal(isPinterestMoscowSlot(new Date("2026-10-28T12:00:00Z")), false);
});

test("exposes at most two new items per Moscow day and never future slots", () => {
  const rows = [
    row(),
    row({ bundleId: `photogen-${"b".repeat(32)}`, heroCompositionId: "HC-002",
      previewPath: "/package-previews/sp031-flowers-model-b-hc002.jpg",
      rssScheduledAt: "2026-10-28T15:00:00Z" }),
    row({ bundleId: `photogen-${"c".repeat(32)}`, rssScheduledAt: "2026-10-28T15:00:00Z" }),
    row({ bundleId: `photogen-${"d".repeat(32)}`, rssScheduledAt: "2026-10-29T07:00:00Z" }),
  ];
  const xml = buildPinterestRss(rows, new Date("2026-10-28T20:00:00Z"));
  assert.equal((xml.match(/<item>/g) ?? []).length, 2);
  assert.doesNotMatch(xml, /photogen-c{32}/);
  assert.doesNotMatch(xml, /photogen-d{32}/);
});

test("exclusion consumes its stable slot without removing Telegram history", () => {
  const xml = buildPinterestRss([
    row({ pinterestExcluded: true }),
    row({ bundleId: `photogen-${"b".repeat(32)}`, heroCompositionId: "HC-002",
      previewPath: "/package-previews/sp031-flowers-model-b-hc002.jpg",
      rssScheduledAt: "2026-10-28T15:00:00Z" }),
  ], new Date("2026-10-28T20:00:00Z"));
  assert.equal((xml.match(/<item>/g) ?? []).length, 1);
  assert.doesNotMatch(xml, /photogen-a{32}/);
  assert.match(xml, /photogen-b{32}/);
});

test("retains only the latest 90 Moscow calendar days across more than 1000 rows", () => {
  const rows = [];
  const firstDay = new Date("2025-06-01T07:00:00Z");
  for (let day = 0; day < 503; day += 1) {
    for (const [slot, hour] of [[0, 7], [1, 15]]) {
      const scheduled = new Date(firstDay);
      scheduled.setUTCDate(scheduled.getUTCDate() + day);
      scheduled.setUTCHours(hour);
      rows.push(row({
        bundleId: `bundle-${day}-${slot}`,
        rssScheduledAt: scheduled.toISOString(),
      }));
    }
  }
  const now = new Date("2026-10-16T20:59:59Z");
  const xml = buildPinterestRss(rows, now);
  assert.equal(rows.length, 1006);
  assert.equal((xml.match(/<item>/g) ?? []).length, 180);
  assert.doesNotMatch(xml, /bundle-412-/);
  assert.match(xml, /bundle-413-0/);
  assert.match(xml, /bundle-502-1/);
});

test("90-day boundary is inclusive from Moscow midnight", () => {
  const now = new Date("2026-10-28T08:30:00Z"); // 11:30 Moscow
  assert.equal(pinterestRssWindowStart(now).toISOString(), "2026-07-30T21:00:00.000Z");
  const xml = buildPinterestRss([
    row({ bundleId: "before-boundary", rssScheduledAt: "2026-07-30T15:00:00Z" }),
    row({ bundleId: "at-first-slot", rssScheduledAt: "2026-07-31T07:00:00Z" }),
  ], now);
  assert.doesNotMatch(xml, /before-boundary/);
  assert.match(xml, /at-first-slot/);
});

test("window follows the Moscow calendar-day rollover", () => {
  const beforeMidnight = pinterestRssWindowStart(new Date("2026-10-28T20:59:59Z"));
  const afterMidnight = pinterestRssWindowStart(new Date("2026-10-28T21:00:00Z"));
  assert.equal(beforeMidnight.toISOString(), "2026-07-30T21:00:00.000Z");
  assert.equal(afterMidnight.toISOString(), "2026-07-31T21:00:00.000Z");
});

test("filters excluded and future rows inside the 90-day window", () => {
  const xml = buildPinterestRss([
    row({ bundleId: "visible" }),
    row({ bundleId: "excluded", pinterestExcluded: true,
      rssScheduledAt: "2026-10-28T15:00:00Z" }),
    row({ bundleId: "future", rssScheduledAt: "2026-10-29T07:00:00Z" }),
  ], new Date("2026-10-28T20:00:00Z"));
  assert.match(xml, /photogen:bundle:visible/);
  assert.doesNotMatch(xml, /excluded|future/);
});

test("does not emit duplicate GUIDs", () => {
  const xml = buildPinterestRss([
    row({ bundleId: "same-bundle" }),
    row({ bundleId: "same-bundle", heroCompositionId: "HC-002",
      previewPath: "/package-previews/sp031-flowers-model-b-hc002.jpg",
      rssScheduledAt: "2026-10-28T15:00:00Z" }),
  ], new Date("2026-10-28T20:00:00Z"));
  assert.equal((xml.match(/photogen:bundle:same-bundle/g) ?? []).length, 1);
});

test("route bounds the database query independently of Supabase's default row limit", async () => {
  const source = await readFile(
    new URL("../src/app/pinterest.xml/route.ts", import.meta.url), "utf8",
  );
  assert.match(source, /\.eq\("pinterest_excluded", false\)/);
  assert.match(source, /\.gte\("rss_scheduled_at", windowStart\.toISOString\(\)\)/);
  assert.match(source, /\.lte\("rss_scheduled_at", now\.toISOString\(\)\)/);
});

test("previously released items remain stable across repeated feed reads", () => {
  const rows = [row(), row({ bundleId: `photogen-${"b".repeat(32)}`,
    rssScheduledAt: "2026-10-27T15:00:00Z" })];
  const first = buildPinterestRss(rows, new Date("2026-10-28T08:00:00Z"));
  const second = buildPinterestRss(rows, new Date("2026-10-29T08:00:00Z"));
  assert.equal(first, second);
  assert.equal((first.match(/<item>/g) ?? []).length, 2);
});

test("empty feed remains valid and headers are safe for public caching", () => {
  const xml = buildPinterestRss([], new Date("2026-10-28T08:00:00Z"));
  assert.match(xml, /<channel>[\s\S]*<\/channel>/);
  assert.doesNotMatch(xml, /<item>/);
  assert.equal(PINTEREST_RSS_HEADERS["Content-Type"], "application/rss+xml; charset=utf-8");
  assert.match(PINTEREST_RSS_HEADERS["Cache-Control"], /s-maxage=300/);
});

test("escapes XML text and attribute metacharacters", () => {
  assert.equal(escapeXml(`A & B <C> "D" 'E'`), "A &amp; B &lt;C&gt; &quot;D&quot; &apos;E&apos;");
});

test("migration persists two serialized Moscow slots and permits only exclusion updates", async () => {
  const sql = await readFile(new URL("../supabase_pinterest_rss.sql", import.meta.url), "utf8");
  assert.match(sql, /add column if not exists rss_scheduled_at timestamptz/i);
  assert.match(sql, /alter column rss_scheduled_at set not null/i);
  assert.match(sql, /unique index if not exists pinterest_feed_items_rss_scheduled_at_key/i);
  assert.match(sql, /pg_advisory_xact_lock\(188273, 1\)/i);
  assert.match(sql, /time '10:00'[\s\S]+time '18:00'/i);
  assert.match(sql, /at time zone 'Europe\/Moscow'/i);
  assert.match(sql, /where rss_scheduled_at is null[\s\S]+order by received_at, bundle_id/i);
  assert.match(sql, /grant update \(pinterest_excluded\)[\s\S]+to service_role/i);
  assert.doesNotMatch(sql, /grant update on table public\.pinterest_feed_items/i);
});
