import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { RECOVERY_TOKEN_COOKIE, validateNewPassword, validRecoveryTokenHash } from '@/lib/auth/password-reset';
import { terminateRecoverySession } from '@/lib/auth/password-reset-signout';
import { clearCurrentSupabaseAuthCookies, createClient } from '@/utils/supabase/server';

function jsonAndClear(body: object, status: number) {
  const response = NextResponse.json(body, { status });
  response.cookies.set(RECOVERY_TOKEN_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth/password-reset', maxAge: 0 });
  return response;
}

export async function POST(request: Request) {
  let body: { password?: unknown; confirmation?: unknown };
  try { body = await request.json(); } catch { return jsonAndClear({ error: 'INVALID_REQUEST' }, 400); }
  if (typeof body.password !== 'string' || typeof body.confirmation !== 'string') return jsonAndClear({ error: 'INVALID_REQUEST' }, 400);
  const validationError = validateNewPassword(body.password, body.confirmation);
  if (validationError) return jsonAndClear({ error: 'INVALID_PASSWORD', message: validationError }, 400);

  const cookieStore = await cookies();
  const tokenHash = cookieStore.get(RECOVERY_TOKEN_COOKIE)?.value;
  if (!validRecoveryTokenHash(tokenHash)) return jsonAndClear({ error: 'RECOVERY_REQUIRED' }, 401);

  const supabase = await createClient();
  const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
  if (verifyError || !verified.user) return jsonAndClear({ error: 'RECOVERY_INVALID_OR_EXPIRED' }, 401);

  const { data: current, error: userError } = await supabase.auth.getUser();
  if (userError || !current.user || current.user.id !== verified.user.id) return jsonAndClear({ error: 'RECOVERY_USER_MISMATCH' }, 401);

  const { error: updateError } = await supabase.auth.updateUser({ password: body.password });
  if (updateError) return jsonAndClear({ error: 'PASSWORD_UPDATE_FAILED' }, 500);

  const signOutResult = await terminateRecoverySession(supabase.auth);
  if (signOutResult === 'failed') {
    try {
      await clearCurrentSupabaseAuthCookies();
    } catch {
      return jsonAndClear({ error: 'SESSION_TERMINATION_FAILED', passwordUpdated: true }, 500);
    }
  }
  return jsonAndClear({ updated: true }, 200);
}
