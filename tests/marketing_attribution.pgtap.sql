begin;
create extension if not exists pgtap;
select plan(9);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values ('93000000-0000-4000-8000-000000000093', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'attribution@example.test', '', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000093', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select public.create_persona(null, null, null, 'woman', 'green');
select public.add_persona_photo(
  (select id from public.personas where user_id = auth.uid() and is_default),
  'personas/93000000-0000-4000-8000-000000000093/' ||
    (select id from public.personas where user_id = auth.uid() and is_default) || '/one.jpg'
);

select public.create_photoshoot_with_persona(
  (select id from public.personas where user_id = auth.uid() and is_default),
  'attributed', '{}', 'woman', 'average', 'green', '',
  null, null, null, null, null,
  4, '{"id":"attributed","slug":"attributed","name":"Attributed","price_crystals":1}'::jsonb,
  '{"first":{"source":"yandex","campaign":"launch","yclid":"123","capturedAt":"2026-09-15T10:00:00.000Z"},"last":{"source":"telegram","medium":"social","capturedAt":"2026-09-15T11:00:00.000Z"}}'::jsonb
);

select is(
  (select attribution_snapshot->'first'->>'source' from public.photoshoots where style_id = 'attributed'),
  'yandex', 'first-touch attribution is stored on the photoshoot'
);
select is(
  (select attribution_snapshot->'last'->>'source' from public.photoshoots where style_id = 'attributed'),
  'telegram', 'last-touch attribution is stored on the photoshoot'
);
reset role;
set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select throws_ok(
  $$update public.photoshoots set attribution_snapshot = '{"first":{"source":"changed"}}'::jsonb where style_id = 'attributed'$$,
  '42501', 'PHOTOSHOOT_ATTRIBUTION_IMMUTABLE', 'attribution snapshots remain immutable behind table ACLs'
);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000093', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select public.create_photoshoot_with_persona(
  (select id from public.personas where user_id = auth.uid() and is_default),
  'legacy-null', '{}', 'woman', 'average', 'green', '',
  null, null, null, null, null,
  4, '{"id":"legacy-null","slug":"legacy-null","name":"Legacy","price_crystals":1}'::jsonb
);
select is(
  (select attribution_snapshot from public.photoshoots where style_id = 'legacy-null'),
  null::jsonb, 'legacy create RPC remains compatible with null attribution'
);
reset role;
set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select lives_ok(
  $$select public.transition_photoshoot_status((select id from public.photoshoots where style_id = 'legacy-null'), 'cancelled')$$,
  'orders with null attribution continue through the lifecycle'
);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000093', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$select public.create_photoshoot_with_persona(
    (select id from public.personas where user_id = auth.uid() and is_default),
    'invalid-top-level', '{}', 'woman', 'average', 'green', '',
    null, null, null, null, null,
    4, '{"id":"invalid-top-level","slug":"invalid-top-level","name":"Invalid"}'::jsonb,
    '{"first":{},"last":{},"unexpected":"value"}'::jsonb
  )$$,
  '23514', 'INVALID_ATTRIBUTION_SNAPSHOT',
  'unknown top-level attribution keys are rejected'
);
select throws_ok(
  $$select public.create_photoshoot_with_persona(
    (select id from public.personas where user_id = auth.uid() and is_default),
    'invalid-touch-key', '{}', 'woman', 'average', 'green', '',
    null, null, null, null, null,
    4, '{"id":"invalid-touch-key","slug":"invalid-touch-key","name":"Invalid"}'::jsonb,
    '{"first":{"source":"safe","email":"private@example.test"},"last":{}}'::jsonb
  )$$,
  '23514', 'INVALID_ATTRIBUTION_SNAPSHOT',
  'unknown attribution touch keys are rejected'
);
select throws_ok(
  $$select public.create_photoshoot_with_persona(
    (select id from public.personas where user_id = auth.uid() and is_default),
    'invalid-first-type', '{}', 'woman', 'average', 'green', '',
    null, null, null, null, null,
    4, '{"id":"invalid-first-type","slug":"invalid-first-type","name":"Invalid"}'::jsonb,
    '{"first":[],"last":{}}'::jsonb
  )$$,
  '23514', 'INVALID_ATTRIBUTION_SNAPSHOT',
  'non-object first-touch attribution is rejected'
);
select throws_ok(
  $$select public.create_photoshoot_with_persona(
    (select id from public.personas where user_id = auth.uid() and is_default),
    'invalid-last-type', '{}', 'woman', 'average', 'green', '',
    null, null, null, null, null,
    4, '{"id":"invalid-last-type","slug":"invalid-last-type","name":"Invalid"}'::jsonb,
    '{"first":{},"last":"arbitrary"}'::jsonb
  )$$,
  '23514', 'INVALID_ATTRIBUTION_SNAPSHOT',
  'non-object last-touch attribution is rejected'
);

select * from finish();
rollback;
