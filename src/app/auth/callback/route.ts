import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}

function redirectUrl(request: Request, path: string): URL {
  return new URL(path, new URL(request.url).origin);
}

function authErrorDestination(next: string): string {
  return next === '/reset-password'
    ? '/reset-password?error=invalid_or_expired'
    : '/auth/auth-code-error';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeNextPath(url.searchParams.get('next'));

  if (url.searchParams.get('error') || !code) {
    return NextResponse.redirect(redirectUrl(request, authErrorDestination(next)));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(redirectUrl(request, authErrorDestination(next)));
  }

  return NextResponse.redirect(redirectUrl(request, next));
}