import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');

test('auth UI exposes only email, Telegram and disabled VK ID', () => {
  const social = read('src/components/SocialAuth.tsx');
  const login = read('src/app/login/page.tsx');
  const signup = read('src/app/signup/page.tsx');

  assert.match(login, /signInWithPassword/);
  assert.match(social, /custom:telegram|TELEGRAM_PROVIDER/);
  assert.match(social, /VK ID/);
  assert.match(social, /VK ID — скоро/);
  assert.doesNotMatch(social, /google|yandex/i);
  assert.match(login, /<SocialAuth \/>/);
  assert.match(signup, /<SocialAuth \/>/);
});

test('Telegram OAuth requires preflight consent and callback records current versions', () => {
  const social = read('src/components/SocialAuth.tsx');
  const intent = read('src/app/api/auth/oauth-consent/route.ts');
  const callback = read('src/app/auth/callback/route.ts');

  assert.match(social, /legalAccepted/);
  assert.match(social, /\/api\/auth\/oauth-consent/);
  assert.match(intent, /httpOnly: true/);
  assert.match(intent, /sameSite: 'lax'/);
  assert.match(intent, /Invalid origin/);
  assert.match(callback, /consentIntent !== OAUTH_CONSENT_VALUE/);
  assert.match(callback, /CURRENT_CONSENT_VERSIONS\.privacy/);
  assert.match(callback, /CURRENT_CONSENT_VERSIONS\.personal_data/);
  assert.match(callback, /user_consents/);
  assert.match(callback, /await supabase\.auth\.signOut\(\)/);
});

test('OAuth callback does not trust an external next URL', () => {
  const callback = read('src/app/auth/callback/route.ts');
  assert.match(callback, /startsWith\('\/'\)/);
  assert.match(callback, /!requestedNext\.startsWith\('\/\/'\)/);
});
