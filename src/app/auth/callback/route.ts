import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { CURRENT_CONSENT_VERSIONS } from '@/lib/legal/consents';
import { OAUTH_CONSENT_COOKIE, OAUTH_CONSENT_VALUE, TELEGRAM_PROVIDER } from '@/lib/auth/oauth-consent';
import { createClient } from '@/utils/supabase/server';

function redirectAfterAuth(request: Request, path: string) {
  const { origin } = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (process.env.NODE_ENV !== 'development' && forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${path}`);
  }
  return NextResponse.redirect(`${origin}${path}`);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const requestedNext = searchParams.get('next');
  const next = requestedNext?.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/dashboard';

  if (!code) return redirectAfterAuth(request, '/auth/auth-code-error');

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) return redirectAfterAuth(request, '/auth/auth-code-error');

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    await supabase.auth.signOut();
    return redirectAfterAuth(request, '/auth/auth-code-error');
  }

  const isTelegram = user.app_metadata.provider === TELEGRAM_PROVIDER
    || user.identities?.some((identity) => identity.provider === TELEGRAM_PROVIDER);

  if (isTelegram) {
    const cookieStore = await cookies();
    const consentIntent = cookieStore.get(OAUTH_CONSENT_COOKIE)?.value;
    cookieStore.delete(OAUTH_CONSENT_COOKIE);

    if (consentIntent !== OAUTH_CONSENT_VALUE) {
      await supabase.auth.signOut();
      return redirectAfterAuth(request, '/login?error=oauth_consent_required');
    }

    const { error: consentError } = await supabase.from('user_consents').upsert([
      {
        user_id: user.id,
        consent_type: 'privacy',
        document_version: CURRENT_CONSENT_VERSIONS.privacy,
      },
      {
        user_id: user.id,
        consent_type: 'personal_data',
        document_version: CURRENT_CONSENT_VERSIONS.personal_data,
      },
    ], { onConflict: 'user_id,consent_type,document_version', ignoreDuplicates: true });

    if (consentError) {
      await supabase.auth.signOut();
      return redirectAfterAuth(request, '/login?error=oauth_consent_record_failed');
    }
  }

  return redirectAfterAuth(request, next);
}
