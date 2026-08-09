'use client';

export const ANALYTICS_GOALS = [
  'landing_view',
  'catalog_view',
  'pack_view',
  'signup_start',
  'registration_completed',
  'persona_start',
  'persona_complete',
  'persona_created',
  'photo_upload_complete',
  'photoshoot_created',
  'payment_started',
  'payment_completed',
  'generation_started',
  'generation_completed',
  'generation_result_view',
  'image_download',
] as const;

export type AnalyticsGoal = (typeof ANALYTICS_GOALS)[number];

export type AnalyticsParams = Partial<{
  package_slug: string;
  requested_images_count: number;
  order_status: string;
  source_page: string;
  is_test_mode: boolean;
}>;

export type MetrikaFunction = {
  (counterId: number, action: 'init', settings: { defer: boolean }): void;
  (counterId: number, action: 'hit' | 'reachGoal', target: string, params?: { params: AnalyticsParams }): void;
  a?: unknown[];
  l?: number;
};

declare global {
  interface Window {
    ym?: MetrikaFunction;
    __photogenMetrikaPageUrl?: string;
    __photogenMetrikaInitialized?: boolean;
  }
}

export const ANALYTICS_CONSENT_STORAGE_KEY = 'photogen-analytics-consent';
export type AnalyticsConsent = 'granted' | 'denied';

const rawCounterId = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;
export const yandexMetrikaId = process.env.NODE_ENV === 'production'
  && rawCounterId
  && /^\d+$/.test(rawCounterId)
  ? Number(rawCounterId)
  : null;

const pendingGoals: Array<{ goal: AnalyticsGoal; params: AnalyticsParams }> = [];

export function isYandexMetrikaHostAllowed(hostname: string): boolean {
  const normalizedHostname = hostname.trim().toLowerCase().replace(/\.$/, '');

  return normalizedHostname !== 'localhost'
    && !normalizedHostname.endsWith('.localhost')
    && normalizedHostname !== '127.0.0.1'
    && normalizedHostname !== '::1'
    && normalizedHostname !== '[::1]';
}

export function shouldInitializeYandexMetrika(
  consent: AnalyticsConsent | null,
  counterId: number | null,
  hostname: string,
  initialized: boolean,
): boolean {
  return consent === 'granted'
    && Boolean(counterId)
    && isYandexMetrikaHostAllowed(hostname)
    && !initialized;
}

export function canUseYandexMetrika(): boolean {
  return Boolean(
    yandexMetrikaId
    && typeof window !== 'undefined'
    && getAnalyticsConsent() === 'granted'
    && isYandexMetrikaHostAllowed(window.location.hostname),
  );
}

export function parseAnalyticsConsent(value: string | null): AnalyticsConsent | null {
  return value === 'granted' || value === 'denied' ? value : null;
}

export function getAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof window === 'undefined') return null;

  try {
    return parseAnalyticsConsent(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function setAnalyticsConsent(consent: AnalyticsConsent): void {
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, consent);
  } catch {
    // Blocked storage keeps analytics disabled for the next visit.
  }
}

export function shouldSendAnalyticsPageView(
  previousPageUrl: string | null,
  pageUrl: string,
): boolean {
  return previousPageUrl !== pageUrl;
}

function cleanParams(params: AnalyticsParams): AnalyticsParams {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  ) as AnalyticsParams;
}

export function trackAnalyticsGoal(goal: AnalyticsGoal, params: AnalyticsParams = {}) {
  if (!canUseYandexMetrika() || !yandexMetrikaId) return;

  const clean = cleanParams(params);
  if (typeof window.ym !== 'function') {
    pendingGoals.push({ goal, params: clean });
    return;
  }

  try {
    window.ym(yandexMetrikaId, 'reachGoal', goal, { params: clean });
  } catch {
    // Analytics must never affect the product flow.
  }
}

export function flushPendingAnalyticsGoals() {
  if (!canUseYandexMetrika() || !yandexMetrikaId || typeof window.ym !== 'function') return;

  const queuedGoals = pendingGoals.splice(0);
  queuedGoals.forEach(({ goal, params }) => {
    try {
      window.ym?.(yandexMetrikaId, 'reachGoal', goal, { params });
    } catch {
      // A blocked analytics request must not affect the product flow.
    }
  });
}