begin;
create extension if not exists pgtap;
select plan(16);

select has_table('public', 'user_consents', 'user_consents table exists');
select columns_are('public', 'user_consents', array['id','user_id','consent_type','document_version','accepted_at','created_at'], 'user_consents has the audited contract');
select col_is_pk('public', 'user_consents', 'id', 'consent id is the primary key');
select policies_are('public', 'user_consents', array['Users can read own consents','Users can record own consents'], 'only own read and insert policies exist');

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
values
  ('96000000-0000-4000-8000-000000000096', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'consent-owner@example.test', '', '{"legal_consents":{"privacy":"v1","personal_data":"v1"}}', now(), now()),
  ('97000000-0000-4000-8000-000000000097', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'consent-other@example.test', '', '{}', now(), now());

select is((select count(*) from public.user_consents where user_id = '96000000-0000-4000-8000-000000000096'), 2::bigint, 'signup metadata atomically records two consents');
select is((select document_version from public.user_consents where user_id = '96000000-0000-4000-8000-000000000096' and consent_type = 'privacy'), 'v1', 'privacy document version is explicit');
select is((select document_version from public.user_consents where user_id = '96000000-0000-4000-8000-000000000096' and consent_type = 'personal_data'), 'v1', 'personal data document version is explicit');

set local role authenticated;
select set_config('request.jwt.claim.sub', '96000000-0000-4000-8000-000000000096', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is((select count(*) from public.user_consents), 2::bigint, 'user can read only own consents');
select lives_ok($$insert into public.user_consents(user_id, consent_type, document_version) values ('96000000-0000-4000-8000-000000000096', 'generation', 'v1')$$, 'user can record own generation consent');
select throws_ok($$insert into public.user_consents(user_id, consent_type, document_version) values ('97000000-0000-4000-8000-000000000097', 'generation', 'v1')$$, '42501', null, 'user cannot record consent for another user');
select throws_ok($$update public.user_consents set document_version = 'v2' where user_id = '96000000-0000-4000-8000-000000000096'$$, '42501', null, 'consents cannot be updated by clients');
select throws_ok($$delete from public.user_consents where user_id = '96000000-0000-4000-8000-000000000096'$$, '42501', null, 'consents cannot be deleted by clients');
select throws_ok($$insert into public.user_consents(user_id, consent_type, document_version) values ('96000000-0000-4000-8000-000000000096', 'generation', 'v1')$$, '23505', null, 'same consent version cannot be duplicated');
select lives_ok($$insert into public.user_consents(user_id, consent_type, document_version) values ('96000000-0000-4000-8000-000000000096', 'generation', 'v2')$$, 'new document version can require and record re-consent');
select is((select count(*) from public.user_consents where consent_type = 'generation'), 2::bigint, 'append-only history keeps both generation versions');

reset role;
select is((select count(*) from public.user_consents where user_id = '97000000-0000-4000-8000-000000000097'), 0::bigint, 'users without signup consent metadata get no fabricated consent');
select isnt((select accepted_at from public.user_consents where user_id = '96000000-0000-4000-8000-000000000096' limit 1), null::timestamptz, 'acceptance timestamp is audited');

select * from finish();
rollback;
