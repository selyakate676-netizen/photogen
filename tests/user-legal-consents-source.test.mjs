import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('signup requires separate unchecked offer and personal-data confirmations', async () => {
  const [signup, login] = await Promise.all([
    read('src/app/signup/page.tsx'),
    read('src/app/login/page.tsx'),
  ]);
  assert.match(signup, /useState\(false\).*offerAccepted/s);
  assert.match(signup, /useState\(false\).*personalDataAccepted/s);
  assert.match(signup, /disabled=\{loading \|\| !offerAccepted \|\| !personalDataAccepted\}/);
  assert.match(signup, /href="\/offer"/);
  assert.match(signup, /href="\/privacy"/);
  assert.match(signup, /href="\/personal-data-consent"/);
  assert.doesNotMatch(`${signup}\n${login}`, /100%|Гарантия качества|верн(?:е|ё)м оплату/iu);
});

test('Auth creation metadata is never accepted as evidence of consent', async () => {
  const [signup, migration, loginActions] = await Promise.all([
    read('src/app/signup/page.tsx'),
    read('supabase_user_legal_consents.sql'),
    read('src/app/login/actions.ts'),
  ]);
  assert.doesNotMatch(signup, /legal_consents|raw_user_meta_data/);
  assert.doesNotMatch(loginActions, /export async function signup/);
  assert.doesNotMatch(migration, /new\.raw_user_meta_data|create trigger record_signup_legal_consents/i);
  assert.match(migration, /drop trigger if exists record_signup_legal_consents_on_auth_user on auth\.users/i);
  assert.match(migration, /drop function if exists public\.record_signup_legal_consents\(\)/i);
});

test('authenticated RPC owns user identity and document versions', async () => {
  const [route, migration, versions] = await Promise.all([
    read('src/app/api/consents/route.ts'),
    read('supabase_user_legal_consents.sql'),
    read('src/lib/legal/consents.ts'),
  ]);
  assert.doesNotMatch(route, /p_user_id|p_document_version|user_id:\s*body/);
  assert.match(migration, /v_user_id uuid := \(select auth\.uid\(\)\)/);
  assert.match(migration, /v_document_version := case p_consent_type/);
  assert.match(migration, /security definer\s+set search_path = public, pg_temp/is);
  assert.match(migration, /unique \(user_id, consent_type, document_version\)/);
  assert.match(migration, /on conflict \(user_id, consent_type, document_version\) do nothing/);
  assert.match(migration, /revoke all on function public\.record_user_legal_consent\(text, text\)\s+from public, anon, service_role/is);
  assert.match(migration, /grant execute on function public\.record_user_legal_consent\(text, text\)\s+to authenticated/is);
  assert.match(versions, /2026-10-15/);
});

test('order, both payment paths, AI dispatch and worker require current consents', async () => {
  const files = await Promise.all([
    read('src/app/dashboard/new/actions.ts'),
    read('src/app/api/payments/cloudpayments/create/route.ts'),
    read('src/app/dashboard/pay/[id]/actions.ts'),
    read('src/lib/ai/mvp-generation-adapter.ts'),
    read('src/lib/payments/cloudpayments-generation-worker.ts'),
  ]);
  for (const source of files) {
    assert.match(source, /(?:requireCurrentConsents|hasCurrentConsents)\([^;]+REQUIRED_ORDER_CONSENTS\)/s);
  }
  assert.match(files[4], /\.select\("id,user_id,photoshoot_id,/);
});

test('email confirmation and existing login pass through explicit consent step', async () => {
  const [callback, login, consentPage] = await Promise.all([
    read('src/app/auth/callback/route.ts'),
    read('src/app/login/page.tsx'),
    read('src/app/consent/page.tsx'),
  ]);
  assert.match(callback, /\/consent\?next=/);
  assert.match(login, /\/consent\?next=/);
  assert.match(consentPage, /consentGroup/);
  assert.match(consentPage, /generation/);
});
