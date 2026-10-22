begin;

create extension if not exists pgtap with schema extensions;
select plan(24);

select has_table('public', 'user_legal_consents', 'consent audit table exists');
select columns_are(
  'public', 'user_legal_consents',
  array['id','user_id','consent_type','document_version','action_context','accepted_at'],
  'consent audit columns are exact'
);
select col_is_pk('public', 'user_legal_consents', 'id', 'consent id is primary key');
select policies_are('public', 'user_legal_consents', array['Users can read own legal consents'], 'only owner-read RLS policy exists');
select table_privs_are('public', 'user_legal_consents', 'authenticated', array['SELECT'], 'authenticated has read-only table access');
select table_privs_are('public', 'user_legal_consents', 'service_role', array['SELECT'], 'service role has read-only table access');
select function_returns('public', 'record_user_legal_consent', array['text','text'], 'boolean', 'consent RPC returns boolean');
select hasnt_function('public', 'record_user_legal_consent', array['text','text','text'], 'client cannot submit a document version');
select is(
  (select count(*) from pg_trigger where tgname = 'record_signup_legal_consents_on_auth_user' and not tgisinternal),
  0::bigint,
  'no Auth signup trigger records consent'
);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
(
  '96000000-0000-4000-8000-000000000096',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'consent-direct@example.invalid', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"legal_consents":{"offer":"2026-10-15","privacy":"2026-10-15","personal_data":"2026-10-15"}}'::jsonb,
  now(), now()
),
(
  '97000000-0000-4000-8000-000000000097',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'consent-oauth@example.invalid', '',
  '{"provider":"github","providers":["github"]}'::jsonb,
  '{"provider_id":"oauth-fixture"}'::jsonb,
  now(), now()
),
(
  '98000000-0000-4000-8000-000000000098',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'consent-admin@example.invalid', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(), now()
);

select is((select count(*) from public.user_legal_consents where user_id = '96000000-0000-4000-8000-000000000096'), 0::bigint, 'direct Auth metadata creates no consent');
select is((select count(*) from public.user_legal_consents where user_id = '97000000-0000-4000-8000-000000000097'), 0::bigint, 'OAuth-created user gets no automatic consent');
select is((select count(*) from public.user_legal_consents where user_id = '98000000-0000-4000-8000-000000000098'), 0::bigint, 'admin-created user gets no automatic consent');
select is(has_function_privilege('anon', 'public.record_user_legal_consent(text,text)', 'EXECUTE'), false, 'anon cannot execute consent RPC');
select is(has_function_privilege('service_role', 'public.record_user_legal_consent(text,text)', 'EXECUTE'), false, 'service role cannot execute consent RPC');
select is(has_function_privilege('authenticated', 'public.record_user_legal_consent(text,text)', 'EXECUTE'), true, 'authenticated can execute consent RPC');

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$select public.record_user_legal_consent('offer', 'registration')$$,
  '42501', 'AUTH_REQUIRED',
  'authenticated role still requires a verified user identity'
);

select set_config('request.jwt.claim.sub', '96000000-0000-4000-8000-000000000096', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(public.record_user_legal_consent('offer', 'registration'), true, 'explicit authenticated action records consent');
select lives_ok($$select public.record_user_legal_consent('offer', 'registration')$$, 'repeat is idempotent');
select is((select count(*) from public.user_legal_consents where consent_type = 'offer'), 1::bigint, 'repeat creates no duplicate');
select is((select user_id from public.user_legal_consents where consent_type = 'offer'), '96000000-0000-4000-8000-000000000096'::uuid, 'RPC binds auth.uid');
select is((select document_version from public.user_legal_consents where consent_type = 'offer'), '2026-10-15', 'server selects published document version');
select isnt((select accepted_at from public.user_legal_consents where consent_type = 'offer'), null::timestamptz, 'server timestamp is recorded');
select throws_ok(
  $$select public.record_user_legal_consent('generation', 'registration')$$,
  '22023', 'INVALID_CONSENT',
  'invalid consent context is rejected'
);
select throws_ok(
  $$insert into public.user_legal_consents(user_id, consent_type, document_version, action_context)
    values ('98000000-0000-4000-8000-000000000098', 'generation', 'other', 'order')$$,
  '42501', null,
  'direct client insert and user spoofing are denied'
);

select * from finish();
rollback;
