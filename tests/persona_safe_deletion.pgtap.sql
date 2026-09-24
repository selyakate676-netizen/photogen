begin;
create extension if not exists pgtap;
select plan(16);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values ('98000000-0000-4000-8000-000000000098', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'persona-delete@example.test', '', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '98000000-0000-4000-8000-000000000098', true);
select public.create_persona(null, null, null, 'woman', 'green');
select public.create_persona('Finished Persona', 170, 60, 'woman', 'brown');
select public.create_persona('Active Persona', 180, 75, 'man', 'blue');
select public.add_persona_photo(
  (select id from public.personas where name = 'Finished Persona'),
  'personas/98000000-0000-4000-8000-000000000098/' ||
    (select id from public.personas where name = 'Finished Persona') || '/one.jpg'
);
select public.add_persona_photo(
  (select id from public.personas where name = 'Finished Persona'),
  'personas/98000000-0000-4000-8000-000000000098/' ||
    (select id from public.personas where name = 'Finished Persona') || '/two.jpg'
);
select public.add_persona_photo(
  (select id from public.personas where name = 'Active Persona'),
  'personas/98000000-0000-4000-8000-000000000098/' ||
    (select id from public.personas where name = 'Active Persona') || '/active.jpg'
);

reset role;
insert into public.photoshoots(
  user_id, persona_id, persona_snapshot, style_id, status, images, result_images, package_snapshot
)
select p.user_id, p.id,
  jsonb_build_object(
    'name', p.name, 'gender', p.gender, 'height', p.height, 'weight', p.weight,
    'eyeColor', p.eye_color, 'photos', to_jsonb(array_agg(pp.storage_path order by pp.sort_order))
  ),
  'finished-persona', 'completed',
  array_append(array_agg(pp.storage_path order by pp.sort_order), 'legacy/nonpersona.jpg'),
  array['photoshoots/generations/finished-persona/result.jpg'],
  '{"id":"finished-persona"}'::jsonb
from public.personas p join public.persona_photos pp on pp.persona_id = p.id
where p.name = 'Finished Persona'
group by p.id;

insert into public.photoshoots(
  user_id, persona_id, persona_snapshot, style_id, status, images, result_images, package_snapshot
)
select p.user_id, p.id,
  jsonb_build_object('name', p.name, 'photos', jsonb_build_array(pp.storage_path)),
  'active-persona', 'queued', array[pp.storage_path], array[]::text[],
  '{"id":"active-persona"}'::jsonb
from public.personas p join public.persona_photos pp on pp.persona_id = p.id
where p.name = 'Active Persona';

set local role authenticated;
select set_config('request.jwt.claim.sub', '98000000-0000-4000-8000-000000000098', true);

select is(
  (select is_nullable from information_schema.columns
   where table_schema = 'public' and table_name = 'photoshoots' and column_name = 'persona_id'),
  'YES',
  'photoshoots.persona_id is nullable'
);
select is(
  (select confdeltype::text from pg_constraint
   where conname = 'photoshoots_persona_id_fkey' and conrelid = 'public.photoshoots'::regclass),
  'n',
  'Persona FK uses ON DELETE SET NULL'
);
select throws_ok(
  $$select public.prepare_persona_deletion((select id from public.personas where name = 'Active Persona'))$$,
  '23514', 'PERSONA_IN_ACTIVE_JOB',
  'queued job blocks Persona deletion'
);
select isnt(
  (select deletion_pending from public.personas where name = 'Active Persona'),
  true,
  'blocked Persona is not reserved'
);
select throws_ok(
  $$select public.delete_persona((select id from public.personas where name = 'Finished Persona'))$$,
  'P0002', 'PERSONA_DELETION_NOT_PREPARED',
  'finalize requires a prepared Persona'
);
select is(
  public.prepare_persona_deletion((select id from public.personas where name = 'Finished Persona')),
  'personas/98000000-0000-4000-8000-000000000098/' ||
    (select id from public.personas where name = 'Finished Persona') || '/',
  'prepare returns the complete Persona storage prefix'
);
select ok(
  (select deletion_pending from public.personas where name = 'Finished Persona'),
  'prepare reserves the Persona'
);

reset role;
select throws_ok(
  $$insert into public.photoshoots(
      user_id, persona_id, persona_snapshot, style_id, status, images, package_snapshot
    )
    select p.user_id, p.id, jsonb_build_object('photos', '[]'::jsonb),
      'persona-delete-race', 'awaiting_payment', '{}'::text[], '{"id":"persona-delete-race"}'::jsonb
    from public.personas p where p.name = 'Finished Persona'$$,
  '23514', 'PERSONA_DELETION_PENDING',
  'reserved Persona cannot be attached to a new photoshoot'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '98000000-0000-4000-8000-000000000098', true);
select lives_ok(
  $$select public.cancel_persona_deletion((select id from public.personas where name = 'Finished Persona'))$$,
  'storage failure can cancel the Persona reservation'
);
select isnt(
  (select deletion_pending from public.personas where name = 'Finished Persona'),
  true,
  'cancel makes the Persona usable again'
);

select public.prepare_persona_deletion((select id from public.personas where name = 'Finished Persona'));
select public.delete_persona((select id from public.personas where name = 'Finished Persona'));
select is(
  (select count(*) from public.personas where name = 'Finished Persona'),
  0::bigint,
  'finalize deletes the Persona'
);
select is(
  (select count(*) from public.persona_photos
   where storage_path like 'personas/98000000-0000-4000-8000-000000000098/%/one.jpg'
      or storage_path like 'personas/98000000-0000-4000-8000-000000000098/%/two.jpg'),
  0::bigint,
  'finalize cascades all PersonaPhoto rows'
);
select is(
  (select persona_id from public.photoshoots where style_id = 'finished-persona'),
  null::uuid,
  'finished photoshoot is retained and detached from deleted Persona'
);
select is(
  (select persona_snapshot from public.photoshoots where style_id = 'finished-persona'),
  '{"personaDeleted":true}'::jsonb,
  'finished photoshoot identity snapshot is scrubbed'
);
select is(
  (select images from public.photoshoots where style_id = 'finished-persona'),
  array['legacy/nonpersona.jpg'],
  'Persona source references are removed from photoshoots.images'
);
select is(
  (select result_images from public.photoshoots where style_id = 'finished-persona'),
  array['photoshoots/generations/finished-persona/result.jpg'],
  'generated results remain unchanged'
);

select * from finish();
rollback;
