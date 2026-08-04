begin;
create extension if not exists pgtap;
select plan(41);

select set_config(
  'photogen.pgtap_results',
  '[]',
  true
);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('93000000-0000-4000-8000-000000000093', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'photos-v2-a@example.test', '', now(), now()),
  ('94000000-0000-4000-8000-000000000094', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'photos-v2-b@example.test', '', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000093', true);
select public.create_persona(null, null, null, 'woman', 'green');
select public.add_persona_photo(
  (select id from public.personas where is_default),
  'personas/93000000-0000-4000-8000-000000000093/' ||
    (select id from public.personas where is_default) || '/1.jpg'
);
select public.add_persona_photo(
  (select id from public.personas where is_default),
  'personas/93000000-0000-4000-8000-000000000093/' ||
    (select id from public.personas where is_default) || '/2.jpg'
);
select public.add_persona_photo(
  (select id from public.personas where is_default),
  'personas/93000000-0000-4000-8000-000000000093/' ||
    (select id from public.personas where is_default) || '/3.jpg'
);

select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is((select count(*) from public.persona_photos), 3::bigint, 'three Persona photos are stored')
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is(
  (select array_agg(sort_order order by sort_order) from public.persona_photos),
  array[0,1,2],
  'initial sort order is contiguous'
)
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is((select status from public.personas where is_default), 'active', 'first photo activates Persona')
    )
  )::text,
  true
);
reset role;
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      throws_ok(
  $$insert into public.persona_photos(id, persona_id, storage_path, sort_order)
    values (gen_random_uuid(), (select id from public.personas where user_id = '93000000-0000-4000-8000-000000000093' and is_default), 'duplicate-order.jpg', 0)$$,
  '23505',
  null,
  'one Persona cannot contain duplicate sort positions'
)
    )
  )::text,
  true
);
set local role authenticated;
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000093', true);

select public.create_photoshoot_with_persona(
  (select id from public.personas where is_default),
  'dating', '{}', 'woman', 'average', 'green', '',
  null, null, null, null, null,
  4, '{"id":"dating","slug":"dating","name":"Dating"}'::jsonb
);

select set_config(
  'photogen.test_snapshot',
  (select persona_snapshot::text from public.photoshoots where style_id = 'dating'),
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      ok(
  (select persona_snapshot->'photos'->>0 from public.photoshoots where style_id = 'dating') like '%/1.jpg',
  'snapshot stores the first ordered photo'
)
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is(
  (select jsonb_array_length(persona_snapshot->'photos') from public.photoshoots where style_id = 'dating'),
  3,
  'snapshot stores all Persona photos'
)
    )
  )::text,
  true
);

select public.reorder_persona_photos(
  (select id from public.personas where is_default),
  (select array_agg(id order by sort_order desc) from public.persona_photos)
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      ok(
  (select storage_path from public.persona_photos order by sort_order limit 1) like '%/3.jpg',
  'live Persona photo order changes'
)
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      ok(
  (select persona_snapshot->'photos'->>0 from public.photoshoots where style_id = 'dating') like '%/1.jpg',
  'snapshot photo order is unchanged after reorder'
)
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is(
  (select array_agg(sort_order order by sort_order) from public.persona_photos),
  array[0,1,2],
  'atomic reorder leaves no duplicate or skipped positions'
)
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is(
  (select persona_snapshot from public.photoshoots where style_id = 'dating'),
  current_setting('photogen.test_snapshot')::jsonb,
  'full snapshot JSON is unchanged after reorder'
)
    )
  )::text,
  true
);

select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      lives_ok($$
  select public.delete_persona_photo(
    (select id from public.personas where is_default),
    (select id from public.persona_photos where sort_order = 1)
  )
$$, 'middle photo deletion succeeds')
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is((select status from public.personas where is_default), 'active', 'non-last deletion keeps active status')
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is(
  (select array_agg(sort_order order by sort_order) from public.persona_photos),
  array[0,1],
  'order is normalized after middle deletion'
)
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is(
  (select jsonb_array_length(persona_snapshot->'photos') from public.photoshoots where style_id = 'dating'),
  3,
  'snapshot keeps deleted photo metadata'
)
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is(
  (select persona_snapshot from public.photoshoots where style_id = 'dating'),
  current_setting('photogen.test_snapshot')::jsonb,
  'full snapshot JSON is unchanged after middle deletion'
)
    )
  )::text,
  true
);

update public.personas set name = 'Updated Persona' where is_default;
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is(
  (select persona_snapshot->>'name' from public.photoshoots where style_id = 'dating'),
  'Я',
  'Persona edits do not rewrite snapshot'
)
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is(
  (select persona_snapshot from public.photoshoots where style_id = 'dating'),
  current_setting('photogen.test_snapshot')::jsonb,
  'full snapshot JSON is unchanged after Persona edit'
)
    )
  )::text,
  true
);

select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      lives_ok($$
  select public.delete_persona_photo(
    (select id from public.personas where is_default),
    (select id from public.persona_photos order by sort_order limit 1)
  )
$$, 'another non-last photo can be deleted')
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is((select status from public.personas where is_default), 'active', 'one remaining photo keeps Persona active')
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is(
  (select array_agg(sort_order order by sort_order) from public.persona_photos),
  array[0],
  'first and penultimate deletion normalizes the remaining position'
)
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      lives_ok($$
  select public.delete_persona_photo(
    (select id from public.personas where is_default),
    (select id from public.persona_photos limit 1)
  )
$$, 'last active Persona photo can be deleted')
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is((select count(*) from public.persona_photos), 0::bigint, 'last photo row is removed')
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is((select status from public.personas where is_default), 'draft', 'last active photo deletion changes status to draft')
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      ok((select is_default from public.personas limit 1), 'default Persona remains default without photos')
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is(
  (select jsonb_array_length(persona_snapshot->'photos') from public.photoshoots where style_id = 'dating'),
  3,
  'snapshot remains complete after all live photos are deleted'
)
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is(
  (select persona_snapshot from public.photoshoots where style_id = 'dating'),
  current_setting('photogen.test_snapshot')::jsonb,
  'full snapshot JSON is unchanged after all live photos are deleted'
)
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is(
  (select persona_id from public.photoshoots where style_id = 'dating'),
  (select id from public.personas where is_default),
  'photoshoot persona_id is unchanged'
)
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      throws_ok($$
  select public.create_photoshoot_with_persona(
    (select id from public.personas where is_default),
    'career', '{}', 'woman', 'average', 'green', '',
    null, null, null, null, null,
    4, '{"id":"career","slug":"career","name":"Career"}'::jsonb
  )
$$, '23514', 'PERSONA_NOT_ACTIVE', 'draft Persona cannot create a new order')
    )
  )::text,
  true
);

select public.add_persona_photo(
  (select id from public.personas where is_default),
  'personas/93000000-0000-4000-8000-000000000093/' ||
    (select id from public.personas where is_default) || '/foreign-check.jpg'
);
select set_config(
  'photogen.test_persona_id',
  (select id::text from public.personas where is_default),
  true
);
select set_config(
  'photogen.test_photo_id',
  (select id::text from public.persona_photos where storage_path like '%/foreign-check.jpg'),
  true
);

select set_config('request.jwt.claim.sub', '94000000-0000-4000-8000-000000000094', true);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      throws_ok($$
  select public.add_persona_photo(
    current_setting('photogen.test_persona_id')::uuid,
    'personas/94000000-0000-4000-8000-000000000094/foreign.jpg'
  )
$$, 'P0002', 'PERSONA_NOT_FOUND', 'foreign user cannot add a photo')
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      throws_ok($$
  select public.reorder_persona_photos(
    current_setting('photogen.test_persona_id')::uuid,
    array[current_setting('photogen.test_photo_id')::uuid]
  )
$$, 'P0002', 'PERSONA_NOT_FOUND', 'foreign user cannot reorder photos')
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      throws_ok($$
  select public.delete_persona_photo(
    current_setting('photogen.test_persona_id')::uuid,
    current_setting('photogen.test_photo_id')::uuid
  )
$$, 'P0002', 'PERSONA_NOT_FOUND', 'foreign user cannot delete a photo')
    )
  )::text,
  true
);

select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000093', true);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is((select count(*) from public.persona_photos), 1::bigint, 'foreign operations leave owner photo intact')
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      lives_ok($$
  select public.delete_persona_photo(
    (select id from public.personas where is_default),
    current_setting('photogen.test_photo_id')::uuid
  )
$$, 'owner can delete the retained photo')
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      throws_ok($$
  select public.delete_persona_photo(
    (select id from public.personas where is_default),
    current_setting('photogen.test_photo_id')::uuid
  )
$$, 'P0002', 'PHOTO_NOT_FOUND', 'repeated deletion is predictable')
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is(
  (select count(*) from public.personas p where p.status = 'active' and not exists (
    select 1 from public.persona_photos pp where pp.persona_id = p.id
  )),
  0::bigint,
  'no active Persona remains without photos'
)
    )
  )::text,
  true
);

select public.create_persona('Draft fixture', null, null, null, null);
select public.add_persona_photo(
  (select id from public.personas where name = 'Draft fixture'),
  'personas/93000000-0000-4000-8000-000000000093/' ||
    (select id from public.personas where name = 'Draft fixture') || '/draft.jpg'
);
select public.create_persona('Sort fixture', null, null, null, null);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      lives_ok($$
  select public.add_persona_photo(
    (select id from public.personas where name = 'Sort fixture'),
    'personas/93000000-0000-4000-8000-000000000093/' ||
      (select id from public.personas where name = 'Sort fixture') || '/sort.jpg'
  )
$$, 'another Persona accepts the same zero-based sort position')
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is(
  (
    select count(*)
    from public.persona_photos
    where sort_order = 0
      and persona_id in (select id from public.personas where name in ('Draft fixture', 'Sort fixture'))
  ),
  2::bigint,
  'sort order uniqueness is scoped to each Persona'
)
    )
  )::text,
  true
);
reset role;
select public.persona_internal_write_on();
update public.personas set status = 'draft' where name = 'Draft fixture';
set local role authenticated;
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000093', true);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      lives_ok($$
  select public.delete_persona_photo(
    (select id from public.personas where name = 'Draft fixture'),
    (select id from public.persona_photos where persona_id = (select id from public.personas where name = 'Draft fixture'))
  )
$$, 'last draft Persona photo can be deleted')
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is((select status from public.personas where name = 'Draft fixture'), 'draft', 'draft Persona remains draft')
    )
  )::text,
  true
);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      is(
  (select count(*) from public.persona_photos where persona_id = (select id from public.personas where name = 'Draft fixture')),
  0::bigint,
  'draft Persona photo row is removed'
)
    )
  )::text,
  true
);

reset role;
set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config(
  'photogen.pgtap_results',
  (
    coalesce(current_setting('photogen.pgtap_results', true), '[]')::jsonb
    || jsonb_build_array(
      throws_ok($$
  update public.photoshoots
  set persona_snapshot = '{}'::jsonb
  where style_id = 'dating'
$$, '42501', 'PERSONA_SNAPSHOT_IMMUTABLE', 'persona snapshot remains database-immutable')
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
