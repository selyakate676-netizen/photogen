import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('signup requires the current personal-data consent and links all referenced documents', () => {
  const signup = read('src/app/signup/page.tsx');
  const constants = read('src/lib/consents.ts');
  assert.match(signup, /type="checkbox"[\s\S]*required/);
  assert.match(signup, /\/personal-data-consent/);
  assert.match(signup, /\/privacy/);
  assert.match(signup, /\/offer/);
  assert.match(signup, /personal_data_consent_accepted: true/);
  assert.match(constants, /version: '2026-10-10'/);
});

test('OAuth callback and existing-user profile gate persist consent through the trusted RPC', () => {
  const callback = read('src/app/auth/callback/route.ts');
  const profile = read('src/app/account/profile/page.tsx');
  const action = read('src/app/account/profile/consent-actions.ts');
  assert.match(callback, /accept_personal_data_consent/);
  assert.match(profile, /has_current_personal_data_consent/);
  assert.match(profile, /PersonalDataConsentGate/);
  assert.match(action, /accept_personal_data_consent/);
  assert.match(action, /formData\.get\(.accepted.\)\s*!==\s*.on./);
});

test('database migration blocks direct Persona and order writes without current consent', () => {
  const sql = read('supabase_user_consents.sql');
  assert.match(sql, /before insert or update on public\.personas/);
  assert.match(sql, /before insert or update on public\.persona_photos/);
  assert.match(sql, /before insert on public\.photoshoots/);
  assert.match(sql, /PERSONAL_DATA_CONSENT_REQUIRED/);
  assert.match(sql, /revoke all on table public\.user_consents from public, anon, authenticated/);
});
