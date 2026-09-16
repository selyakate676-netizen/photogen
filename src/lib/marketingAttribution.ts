export const ATTRIBUTION_STORAGE_KEY = 'photogen-marketing-attribution';

const KEYS = ['source', 'medium', 'campaign', 'content', 'term'] as const;
type Key = (typeof KEYS)[number];
export type AttributionTouch = Partial<Record<Key, string>> & { yclid?: string; referrer?: string; capturedAt: string };
export type AttributionSnapshot = { first: AttributionTouch; last: AttributionTouch };
type AttributionStorage = Pick<Storage, 'getItem' | 'setItem'>;
let pendingInitialTouch: AttributionTouch | null = null;
const clean = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim().slice(0, 200) : undefined;

export function parseAttribution(url: string, referrer = '', now = new Date().toISOString()): AttributionTouch | null {
  const parsed = new URL(url, 'https://photogen.invalid');
  const touch: AttributionTouch = { capturedAt: now };
  KEYS.forEach((key) => { const value = clean(parsed.searchParams.get('utm_' + key)); if (value) touch[key] = value; });
  const yclid = clean(parsed.searchParams.get('yclid'));
  if (yclid) touch.yclid = yclid;
  try {
    const source = referrer ? new URL(referrer) : null;
    if (source && source.origin !== parsed.origin) touch.referrer = (source.origin + source.pathname).slice(0, 200);
  } catch { /* Invalid referrers are ignored. */ }
  return Object.keys(touch).length > 1 ? touch : null;
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

export function captureAttribution(storage: AttributionStorage, url: string, referrer = '', now?: string): AttributionSnapshot | null {
  return captureAttributionTouch(storage, parseAttribution(url, referrer, now));
}

export function captureAttributionTouch(
  storage: AttributionStorage,
  touch: AttributionTouch | null,
): AttributionSnapshot | null {
  let current: AttributionSnapshot | null = null;
  try { current = sanitizeAttributionSnapshot(JSON.parse(storage.getItem(ATTRIBUTION_STORAGE_KEY) ?? 'null')); } catch { /* ignore */ }
  if (!touch) return current;
  const isTagged = KEYS.some((key) => Boolean(touch[key])) || Boolean(touch.yclid);
  if (current && !isTagged) return current;
  const next = { first: current?.first ?? touch, last: touch };
  try { storage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(next)); } catch { /* storage is optional */ }
  return next;
}

export function stageInitialAttribution(url: string, referrer = '', now?: string): AttributionTouch | null {
  pendingInitialTouch ??= parseAttribution(url, referrer, now);
  return pendingInitialTouch;
}

export function commitStagedAttribution(storage: AttributionStorage): AttributionSnapshot | null {
  const staged = pendingInitialTouch;
  pendingInitialTouch = null;
  return captureAttributionTouch(storage, staged);
}

export function clearStagedAttribution(): void {
  pendingInitialTouch = null;
}

export function captureBrowserAttribution(): AttributionSnapshot | null {
  if (typeof window === 'undefined') return null;
  return captureAttribution(window.localStorage, window.location.href, document.referrer);
}

export function stageBrowserAttribution(): AttributionTouch | null {
  if (typeof window === 'undefined') return null;
  return stageInitialAttribution(window.location.href, document.referrer);
}

export function commitBrowserAttribution(): AttributionSnapshot | null {
  if (typeof window === 'undefined') return null;
  return commitStagedAttribution(window.localStorage);
}

export function getBrowserAttribution(): AttributionSnapshot | null {
  if (typeof window === 'undefined') return null;
  try { return sanitizeAttributionSnapshot(JSON.parse(window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY) ?? 'null')); }
  catch { return null; }
}

export function attributionAnalyticsParams(snapshot: AttributionSnapshot | null) {
  return snapshot ? { source: snapshot.last.source, medium: snapshot.last.medium, campaign: snapshot.last.campaign, content: snapshot.last.content } : {};
}
