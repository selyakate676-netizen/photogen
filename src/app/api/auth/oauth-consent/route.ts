import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { OAUTH_CONSENT_COOKIE, OAUTH_CONSENT_VALUE } from '@/lib/auth/oauth-consent';

const MAX_AGE_SECONDS = 10 * 60;

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { accepted?: unknown } | null;
  if (body?.accepted !== true) {
    return NextResponse.json({ error: 'Consent required' }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set(OAUTH_CONSENT_COOKIE, OAUTH_CONSENT_VALUE, {
    httpOnly: true,
    maxAge: MAX_AGE_SECONDS,
    path: '/auth/callback',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return NextResponse.json({ accepted: true });
}
