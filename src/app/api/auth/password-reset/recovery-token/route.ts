import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { RECOVERY_TOKEN_COOKIE, RECOVERY_TOKEN_MAX_AGE_SECONDS, validRecoveryTokenHash } from '@/lib/auth/password-reset';

export async function GET() {
  const cookieStore = await cookies();
  return NextResponse.json({ ready: validRecoveryTokenHash(cookieStore.get(RECOVERY_TOKEN_COOKIE)?.value) });
}

export async function POST(request: Request) {
  let body: { tokenHash?: unknown; type?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ ready: false }, { status: 400 }); }
  if (body.type !== 'recovery' || !validRecoveryTokenHash(body.tokenHash)) {
    return NextResponse.json({ ready: false }, { status: 400 });
  }
  const response = NextResponse.json({ ready: true });
  response.cookies.set(RECOVERY_TOKEN_COOKIE, body.tokenHash, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth/password-reset', maxAge: RECOVERY_TOKEN_MAX_AGE_SECONDS,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ready: false });
  response.cookies.set(RECOVERY_TOKEN_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth/password-reset', maxAge: 0 });
  return response;
}
