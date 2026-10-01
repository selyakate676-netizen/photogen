export const ATTRIBUTION_STORAGE_KEY = 'photogen-marketing-attribution';
export const ATTRIBUTION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const KEYS = ['source', 'medium', 'campaign', 'content', 'term'] as const;
type Key = (typeof KEYS)[number];
export type AttributionTouch = Partial<Record<Key, string>> & { yclid?: string; referrer?: string; capturedAt: string };
export type AttributionSnapshot = { first: AttributionTouch; last: AttributionTouch };
type AttributionStorage = Pick<Storage, 'getItem' | 'setItem'>;
type StoredAttribution = { snapshot: AttributionSnapshot; expiresAt: string };
const clean = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim().slice(0, 200) : undefined;

export const FIRST_PARTY_ATTRIBUTION_BOOTSTRAP_SCRIPT = `
(function () {
  try {
    var key = 'photogen-marketing-attribution';
    var ttl = ${90 * 24 * 60 * 60 * 1000};
    var now = new Date().toISOString();
    var page = new URL(window.location.href);
    var touch = { capturedAt: now };
    ['source','medium','campaign','content','term'].forEach(function (name) {
      var value = page.searchParams.get('utm_' + name);
      if (value && value.trim()) touch[name] = value.trim().slice(0, 200);
    });
    var yclid = page.searchParams.get('yclid');
    if (yclid && yclid.trim()) touch.yclid = yclid.trim().slice(0, 200);
    if (document.referrer) {
      var referrer = new URL(document.referrer);
      if (referrer.origin !== page.origin) touch.referrer = referrer.origin.slice(0, 200);
    }
    var attributed = Object.keys(touch).length > 1;
    if (!attributed) { touch.source = 'direct'; touch.medium = 'none'; }
    var parsed = JSON.parse(localStorage.getItem(key) || 'null');
    var stored = parsed && parsed.snapshot ? parsed : (parsed && parsed.first && parsed.last ? { snapshot: parsed } : null);
    var expiresAt = stored && stored.expiresAt;
    if (!expiresAt && stored) expiresAt = new Date(Date.parse(stored.snapshot.first.capturedAt) + ttl).toISOString();
    if (!stored || !expiresAt || Date.parse(expiresAt) <= Date.parse(now)) {
      stored = { snapshot: { first: touch, last: touch }, expiresAt: new Date(Date.parse(now) + ttl).toISOString() };
    } else {
      stored = { snapshot: { first: stored.snapshot.first, last: attributed ? touch : stored.snapshot.last }, expiresAt: expiresAt };
    }
    localStorage.setItem(key, JSON.stringify(stored));
  } catch (_) {}
})();`;

export function parseAttribution(url: string, referrer = '', now = new Date().toISOString()): AttributionTouch {
  const parsed = new URL(url, 'https://photogen.invalid');
  const touch: AttributionTouch = { capturedAt: now };
  KEYS.forEach((key) => { const value = clean(parsed.searchParams.get('utm_' + key)); if (value) touch[key] = value; });
  const yclid = clean(parsed.searchParams.get('yclid'));
  if (yclid) touch.yclid = yclid;
  try {
    const source = referrer ? new URL(referrer) : null;
    if (source && source.origin !== parsed.origin) touch.referrer = source.origin.slice(0, 200);
  } catch { /* Invalid referrers are ignored. */ }
  if (Object.keys(touch).length === 1) { touch.source = 'direct'; touch.medium = 'none'; }
  return touch;
}

function sanitizeTouch(value: unknown): AttributionTouch | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const capturedAt = clean(input.capturedAt);
  if (!capturedAt) return null;
  const output: AttributionTouch = { capturedAt };
  [...KEYS, 'yclid', 'referrer'].forEach((key) => { const field = clean(input[key]); if (field) Object.assign(output, { [key]: field }); });
  return output;
}

export function sanitizeAttributionSnapshot(value: unknown): AttributionSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const first = sanitizeTouch(input.first);
  const last = sanitizeTouch(input.last);
  return first && last ? { first, last } : null;
}

function readStoredAttribution(storage: AttributionStorage, now: string): StoredAttribution | null {
  try {
    const value = JSON.parse(storage.getItem(ATTRIBUTION_STORAGE_KEY) ?? 'null') as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const stored = value as Partial<StoredAttribution>;
    if (typeof stored.expiresAt === 'string' && stored.snapshot) {
      if (Date.parse(stored.expiresAt) <= Date.parse(now)) return null;
      const snapshot = sanitizeAttributionSnapshot(stored.snapshot);
      return snapshot ? { snapshot, expiresAt: stored.expiresAt } : null;
    }
    const snapshot = sanitizeAttributionSnapshot(value);
    if (!snapshot) return null;
    const expiresAt = new Date(Date.parse(snapshot.first.capturedAt) + ATTRIBUTION_TTL_MS).toISOString();
    return Date.parse(expiresAt) > Date.parse(now) ? { snapshot, expiresAt } : null;
  } catch { return null; }
}

export function captureAttribution(storage: AttributionStorage, url: string, referrer = '', now?: string, taggedOnly = false): AttributionSnapshot | null {
  const capturedAt = now ?? new Date().toISOString();
  const current = readStoredAttribution(storage, capturedAt);
  const touch = parseAttribution(url, referrer, capturedAt);
  const parsed = new URL(url, 'https://photogen.invalid');
  const hasCampaignTag = KEYS.some((key) => Boolean(clean(parsed.searchParams.get('utm_' + key))))
    || Boolean(clean(parsed.searchParams.get('yclid')));
  const hasAttribution = hasCampaignTag || Boolean(touch.referrer);
  if (current && (!hasAttribution || (taggedOnly && !hasCampaignTag))) return current.snapshot;
  const next = { first: current?.snapshot.first ?? touch, last: touch };
  const expiresAt = current?.expiresAt ?? new Date(Date.parse(capturedAt) + ATTRIBUTION_TTL_MS).toISOString();
  try { storage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify({ snapshot: next, expiresAt })); } catch { /* storage is optional */ }
  return next;
}

export function captureBrowserAttribution(taggedOnly = false): AttributionSnapshot | null {
  if (typeof window === 'undefined') return null;
  return captureAttribution(window.localStorage, window.location.href, document.referrer, undefined, taggedOnly);
}

export function getBrowserAttribution(): AttributionSnapshot | null {
  if (typeof window === 'undefined') return null;
  return readStoredAttribution(window.localStorage, new Date().toISOString())?.snapshot ?? null;
}

export function attributionAnalyticsParams(snapshot: AttributionSnapshot | null) {
  return snapshot ? { source: snapshot.last.source, medium: snapshot.last.medium, campaign: snapshot.last.campaign, content: snapshot.last.content } : {};
}
