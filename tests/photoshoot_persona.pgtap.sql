begin;
create extension if not exists pgtap;
select plan(13);

select set_config(
  'photogen.pgtap_results',
  '[]',
  true
);


insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
 ('50000000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'order-a@example.test', '', now(), now()),
 ('60000000-0000-4000-8000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'order-b@example.test', '', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000005', true);
select public.create_persona(null, null, null, null, null);
select public.create_persona('Active owner', 180, 75, 'man', 'green');
select public.add_persona_photo(
  (select id from public.personas where name='Active owner'),
  'personas/50000000-0000-4000-8000-000000000005/'||(select id from public.personas where name='Active owner')||'/one.jpg'
);

select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      lives_ok($$select public.create_photoshoot_with_persona(
  (select id from public.personas where name='Active owner'), 'business', array['legacy/input.jpg'],
  'man', 'average', 'brown', 'dark', null, null, null, null, null,
  4, '{"id":"business","slug":"business","name":"Business"}'::jsonb
)$$, 'order is created with active owner Persona')
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is((select persona_id from public.photoshoots limit 1), (select id from public.personas where name='Active owner'), 'persona_id is stored')
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is((select persona_snapshot->>'name' from public.photoshoots limit 1), 'Active owner', 'snapshot name is stored')
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is((select persona_snapshot->'photos'->>0 from public.photoshoots limit 1), 'personas/50000000-0000-4000-8000-000000000005/'||(select id from public.personas where name='Active owner')||'/one.jpg', 'snapshot photo path is stored')
    )
  )::text,
  true
);

update public.personas set name='Changed later' where name='Active owner';
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is((select persona_snapshot->>'name' from public.photoshoots limit 1), 'Active owner', 'Persona edits do not change snapshot')
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is((select status from public.photoshoots limit 1), 'awaiting_payment', 'valid order starts in awaiting_payment')
    )
  )::text,
  true
);

select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      throws_ok($$insert into public.photoshoots(user_id, style_id, images) values('50000000-0000-4000-8000-000000000005', 'business', '{}')$$, '42501', null, 'new direct order without Persona is rejected')
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      throws_ok($$select public.create_photoshoot_with_persona(
  (select id from public.personas where is_default), 'business', array['legacy/input.jpg'],
  'woman', 'average', 'brown', 'dark', null, null, null, null, null,
  4, '{"id":"business","slug":"business","name":"Business"}'::jsonb
)$$, '23514', 'PERSONA_NOT_ACTIVE', 'draft Persona is rejected')
    )
  )::text,
  true
);

-- Confirm the no-photo check independently of the status check using controlled test setup.
reset role;
update public.personas set status='active' where is_default and user_id='50000000-0000-4000-8000-000000000005';
set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000005', true);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      throws_ok($$select public.create_photoshoot_with_persona(
  (select id from public.personas where is_default), 'business', array['legacy/input.jpg'],
  'woman', 'average', 'brown', 'dark', null, null, null, null, null,
  4, '{"id":"business","slug":"business","name":"Business"}'::jsonb
)$$, '23514', 'PERSONA_HAS_NO_PHOTOS', 'active Persona without photos is rejected')
    )
  )::text,
  true
);

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000006', true);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      throws_ok($$select public.create_photoshoot_with_persona(
  (select id from public.personas where user_id='50000000-0000-4000-8000-000000000005' and not is_default),
  'business', array['legacy/input.jpg'], 'man', 'average', 'brown', 'dark', null, null, null, null, null,
  4, '{"id":"business","slug":"business","name":"Business"}'::jsonb
)$$, 'P0002', 'PERSONA_NOT_FOUND', 'foreign Persona is concealed as not found')
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is((select count(*) from public.photoshoots), 0::bigint, 'foreign user cannot list owner orders')
    )
  )::text,
  true
);

select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000005', true);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      throws_ok($$update public.photoshoots set persona_snapshot='{}'::jsonb$$, '42501', 'PERSONA_SNAPSHOT_IMMUTABLE', 'snapshot is immutable')
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is((select persona_snapshot->>'name' from public.photoshoots limit 1), 'Active owner', 'snapshot remains unchanged after rejected update')
    )
  )::text,
  true
);
reset role;
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || coalesce(
      (
        select jsonb_agg(finished.result order by finished.ordinality)
        from finish() with ordinality as finished(result, ordinality)
      ),
      '[]'::jsonb
    )
  )::text,
  true
);

select
  ordinality::integer as sequence,
  result
from jsonb_array_elements_text(
  coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
) with ordinality as collected(result, ordinality)
order by ordinality;

rollback;
