begin;
create extension if not exists pgtap;
select plan(9);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('70000000-0000-4000-8000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'appearance-a@example.test', '', now(), now()),
  ('80000000-0000-4000-8000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'appearance-b@example.test', '', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000007', true);
select public.create_persona(null, null, null, 'woman', 'green');

select lives_ok($$
  update public.personas
  set height_profile = 'tall', body_build = 'feminine', figure_type = 'pear',
      bust_size = 'medium', physique = 'soft'
  where is_default
$$, 'allowed appearance values are saved');

select ok(
  (select jsonb_build_object(
    'heightProfile', height_profile,
    'bodyBuild', body_build,
    'figureType', figure_type,
    'bustSize', bust_size,
    'physique', physique
  ) from public.personas where is_default)
  = '{"heightProfile":"tall","bodyBuild":"feminine","figureType":"pear","bustSize":"medium","physique":"soft"}'::jsonb,
  'saved appearance values are returned from Persona'
);

select throws_ok($$
  update public.personas set height_profile = 'very-tall' where is_default
$$, '23514', null, 'invalid height profile is rejected');

select throws_ok($$
  update public.personas set figure_type = 'triangle' where is_default
$$, '23514', null, 'invalid figure type is rejected');

select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000008', true);
with changed as (
  update public.personas set body_build = 'slim'
  where user_id = '70000000-0000-4000-8000-000000000007'
  returning 1
)
select is(
  (select count(*) from changed),
  0::bigint,
  'foreign user cannot update Persona appearance'
);

select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000007', true);
select lives_ok($$
  select public.add_persona_photo(
    (select id from public.personas where is_default),
    'personas/70000000-0000-4000-8000-000000000007/' ||
      (select id from public.personas where is_default) || '/one.jpg'
  )
$$, 'Persona can be activated for snapshot test');

select lives_ok($$
  select public.create_photoshoot_with_persona(
    (select id from public.personas where is_default),
    'business', '{}', 'woman', 'average', 'green', 'dark',
    null, null, null, null, null,
    4, '{"id":"business","slug":"business","name":"Business"}'::jsonb
  )
$$, 'order is created with appearance snapshot');

select ok(
  (select persona_snapshot from public.photoshoots limit 1)
  @> '{"heightProfile":"tall","bodyBuild":"feminine","figureType":"pear","bustSize":"medium","physique":"soft"}'::jsonb,
  'all appearance values are stored in persona_snapshot'
);

update public.personas set body_build = 'slim', bust_size = null where is_default;
select is(
  (select persona_snapshot->>'bodyBuild' from public.photoshoots limit 1),
  'feminine',
  'later Persona edits do not change existing snapshot'
);

select * from finish();
rollback;