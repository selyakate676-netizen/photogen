import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');

test('signup requires explicit current-version legal consent', () => {
  const signup = read('src/app/signup/page.tsx');
  assert.match(signup, /type="checkbox"/);
  assert.match(signup, /checked=\{legalAccepted\}/);
  assert.match(signup, /required/);
  assert.match(signup, /\/privacy/);
  assert.match(signup, /\/personal-data-consent/);
  assert.match(signup, /legal_consents/);
  assert.doesNotMatch(signup, /<SocialAuth/);
});

test('persona creation and photo upload require current generation consent', () => {
  for (const path of [
    'src/app/api/personas/route.ts',
    'src/app/api/personas/bootstrap/route.ts',
    'src/app/api/personas/[personaId]/photos/route.ts',
  ]) {
    assert.match(read(path), /requireGenerationConsent/);
  }
  const profile = read('src/app/account/profile/ProfileWorkspace.tsx');
  assert.match(profile, /\/generation-consent/);
  assert.match(profile, /consentType: 'generation'/);
});

test('consent records are append-only and versioned', () => {
  const migration = read('supabase_user_consents.sql');
  assert.match(migration, /unique \(user_id, consent_type, document_version\)/);
  assert.match(migration, /grant select, insert on table public\.user_consents to authenticated/);
  assert.doesNotMatch(migration, /grant .*update.*authenticated/i);
  assert.doesNotMatch(migration, /grant .*delete.*authenticated/i);
  assert.match(migration, /set search_path = public, pg_temp/);
});
