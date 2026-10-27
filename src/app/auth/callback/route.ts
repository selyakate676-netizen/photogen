import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { safeAuthContinuation } from '@/lib/auth/continuation';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeAuthContinuation(searchParams.get('next'));
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const base = process.env.NODE_ENV !== 'development' && forwardedHost
        ? `https://${forwardedHost}`
        : origin;
      return NextResponse.redirect(`${base}/consent?next=${encodeURIComponent(next)}`);
    }
  }
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
