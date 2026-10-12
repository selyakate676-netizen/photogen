begin;
create extension if not exists pgtap;
select plan(24);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, raw_user_meta_data)
values
  ('c1000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'consent-a@example.test', '', now(), now(), '{}'::jsonb),
  ('c2000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'consent-b@example.test', '', now(), now(), '{}'::jsonb),
  ('c3000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'consent-signup@example.test', '', now(), now(),
    '{"personal_data_consent_accepted":true,"personal_data_consent_version":"2026-10-10","personal_data_consent_path":"/personal-data-consent"}'::jsonb);

select is(
  (select count(*) from public.user_consents where user_id = 'c3000000-0000-4000-8000-000000000003'),
  1::bigint,
  'exact current signup metadata creates one audit row'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(public.has_current_personal_data_consent(), false, 'existing user has no fabricated historical consent');
select throws_ok(
  $$select public.create_persona(null, null, null, null, null)$$,
  '42501', 'PERSONAL_DATA_CONSENT_REQUIRED',
  'direct Persona RPC is rejected without consent'
);
select throws_ok(
  $$select public.accept_personal_data_consent('old-version', '/personal-data-consent')$$,
  '23514', 'INVALID_CONSENT_DOCUMENT',
  'stale document version is rejected'
);
select throws_ok(
  $$select public.accept_personal_data_consent('2026-10-10', '/privacy')$$,
  '23514', 'INVALID_CONSENT_DOCUMENT',
  'arbitrary document path is rejected'
);
select lives_ok(
  $$select public.accept_personal_data_consent('2026-10-10', '/personal-data-consent')$$,
  'current consent is accepted'
);
select is(public.has_current_personal_data_consent(), true, 'current consent becomes effective');
select is(
  (select user_id from public.user_consents where user_id = auth.uid()),
  auth.uid(),
  'RPC derives user_id from authenticated session'
);
select ok(
  (select accepted_at between statement_timestamp() - interval '10 seconds' and statement_timestamp() + interval '1 second'
   from public.user_consents where user_id = auth.uid()),
  'accepted_at is assigned by the database clock'
);
select lives_ok(
  $$select public.accept_personal_data_consent('2026-10-10', '/personal-data-consent')$$,
  'duplicate acceptance is idempotent'
);
select is(
  (select count(*) from public.user_consents where user_id = auth.uid()),
  1::bigint,
  'duplicate acceptance does not duplicate evidence'
);
select lives_ok($$select public.create_persona(null, null, null, null, null)$$, 'Persona RPC succeeds after consent');

reset role;
select set_config('request.jwt.claim.sub', '', true);
insert into public.personas(user_id, name, is_default, status)
values ('c2000000-0000-4000-8000-000000000002', 'Legacy Persona', true, 'active');
insert into public.persona_photos(persona_id, storage_path)
select id, 'personas/c2000000-0000-4000-8000-000000000002/' || id || '/one.jpg'
from public.personas where user_id = 'c2000000-0000-4000-8000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c2000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok(
  $$select public.create_photoshoot_with_persona(
    (select id from public.personas where user_id = auth.uid()),
    'consent-test', '{}', 'woman', 'average', '', '', null, null, null, null, null,
    1, '{"id":"consent-test","slug":"consent-test","name":"Consent test","price_crystals":1}'::jsonb,
    null
  )$$,
  '42501', 'PERSONAL_DATA_CONSENT_REQUIRED',
  'direct current order RPC is rejected without consent'
);
select throws_ok(
  $$update public.user_consents set document_version = 'forged' where user_id = 'c3000000-0000-4000-8000-000000000003'$$,
  '42501', null,
  'authenticated user cannot update consent history'
);
select throws_ok(
  $$delete from public.user_consents where user_id = 'c3000000-0000-4000-8000-000000000003'$$,
  '42501', null,
  'authenticated user cannot delete consent history'
);

select ok(has_function_privilege('authenticated', 'public.accept_personal_data_consent(text,text)', 'EXECUTE'), 'authenticated can accept own consent');
select ok(not has_function_privilege('anon', 'public.accept_personal_data_consent(text,text)', 'EXECUTE'), 'anon cannot accept consent');
select ok(not has_function_privilege('service_role', 'public.accept_personal_data_consent(text,text)', 'EXECUTE'), 'service_role cannot impersonate consent acceptance');
select ok(
  not exists (
    select 1 from pg_proc p,
      lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where p.oid = 'public.accept_personal_data_consent(text,text)'::regprocedure
      and acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
  ),
  'PUBLIC cannot accept consent'
);
select ok(
  (select p.prosecdef from pg_proc p where p.oid = 'public.accept_personal_data_consent(text,text)'::regprocedure),
  'acceptance RPC is SECURITY DEFINER'
);
select ok(
  (select coalesce(p.proconfig, '{}'::text[]) @> array['search_path=public']
   from pg_proc p where p.oid = 'public.accept_personal_data_consent(text,text)'::regprocedure),
  'acceptance RPC fixes search_path'
);
select is(
  (select count(*) from information_schema.role_table_grants
   where table_schema = 'public' and table_name = 'user_consents'
     and grantee = 'authenticated' and privilege_type in ('INSERT','UPDATE','DELETE')),
  0::bigint,
  'authenticated has no direct consent mutation grants'
);
select is(
  (select document_version from public.user_consents where user_id = 'c3000000-0000-4000-8000-000000000003'),
  '2026-10-10',
  'signup trigger stores the stable document version'
);
select is(
  (select document_path from public.user_consents where user_id = 'c3000000-0000-4000-8000-000000000003'),
  '/personal-data-consent',
  'signup trigger stores the canonical document reference'
);

select * from finish();
rollback;
