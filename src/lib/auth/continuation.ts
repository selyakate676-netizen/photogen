export const DEFAULT_AUTH_CONTINUATION = '/dashboard';

const INTERNAL_ORIGIN = 'https://photogen.invalid';

function isUnsafePath(value: string): boolean {
  return !value.startsWith('/')
    || value.startsWith('//')
    || value.includes('\\')
    || /[\u0000-\u001f\u007f]/.test(value);
}

export function safeAuthContinuation(
  value: string | null | undefined,
  fallback = DEFAULT_AUTH_CONTINUATION,
): string {
  if (!value || value !== value.trim() || isUnsafePath(value)) return fallback;

  try {
    let decoded = value;
    for (let pass = 0; pass < 2; pass += 1) {
      decoded = decodeURIComponent(decoded);
      if (isUnsafePath(decoded)) return fallback;
    }

    const parsed = new URL(value, INTERNAL_ORIGIN);
    if (parsed.origin !== INTERNAL_ORIGIN) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function authContinuationFromLocation(): string {
  if (typeof window === 'undefined') return DEFAULT_AUTH_CONTINUATION;
  return safeAuthContinuation(new URLSearchParams(window.location.search).get('next'));
}

export function withAuthContinuation(pathname: '/login' | '/signup', continuation: string): string {
  const params = new URLSearchParams({ next: safeAuthContinuation(continuation) });
  return `${pathname}?${params.toString()}`;
}
