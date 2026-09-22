begin;
create extension if not exists pgtap;
select plan(12);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values ('97000000-0000-4000-8000-000000000097', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'safe-delete@example.test', '', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '97000000-0000-4000-8000-000000000097', true);
select public.create_persona(null, null, null, 'woman', 'green');
select public.add_persona_photo(
  (select id from public.personas where user_id = auth.uid() and is_default),
  'personas/97000000-0000-4000-8000-000000000097/' ||
    (select id from public.personas where user_id = auth.uid() and is_default) || '/active.jpg'
);
select public.add_persona_photo(
  (select id from public.personas where user_id = auth.uid() and is_default),
  'personas/97000000-0000-4000-8000-000000000097/' ||
    (select id from public.personas where user_id = auth.uid() and is_default) || '/delete.jpg'
);
select public.add_persona_photo(
  (select id from public.personas where user_id = auth.uid() and is_default),
  'personas/97000000-0000-4000-8000-000000000097/' ||
    (select id from public.personas where user_id = auth.uid() and is_default) || '/keep.jpg'
);

reset role;
insert into public.photoshoots(user_id, persona_id, persona_snapshot, style_id, status, images, result_images, package_snapshot)
select p.user_id, p.id,
  jsonb_build_object('name', p.name, 'photos', jsonb_build_array(active.storage_path)),
  'active-job', 'queued', array[active.storage_path], array[]::text[], '{"id":"active-job"}'::jsonb
from public.personas p
join public.persona_photos active on active.persona_id = p.id and active.storage_path like '%/active.jpg'
where p.user_id = '97000000-0000-4000-8000-000000000097';

insert into public.photoshoots(user_id, persona_id, persona_snapshot, style_id, status, images, result_images, package_snapshot)
select p.user_id, p.id,
  jsonb_build_object('name', p.name, 'photos', jsonb_build_array(doomed.storage_path, kept.storage_path)),
  'completed-job', 'completed', array[doomed.storage_path, kept.storage_path],
  array['photoshoots/generations/finished/result.jpg'], '{"id":"completed-job"}'::jsonb
from public.personas p
join public.persona_photos doomed on doomed.persona_id = p.id and doomed.storage_path like '%/delete.jpg'
join public.persona_photos kept on kept.persona_id = p.id and kept.storage_path like '%/keep.jpg'
where p.user_id = '97000000-0000-4000-8000-000000000097';

set local role authenticated;
select set_config('request.jwt.claim.sub', '97000000-0000-4000-8000-000000000097', true);

select throws_ok(
  $$select public.prepare_persona_photo_deletion(
    (select id from public.personas where user_id = auth.uid() and is_default),
    (select id from public.persona_photos where storage_path like '%/active.jpg')
  )$$,
  '23514', 'PERSONA_PHOTO_IN_ACTIVE_JOB',
  'queued job blocks source photo deletion'
);
select isnt(
  (select deletion_pending from public.persona_photos where storage_path like '%/active.jpg'),
  true,
  'blocked deletion does not reserve the photo'
);
select is(
  public.prepare_persona_photo_deletion(
    (select id from public.personas where user_id = auth.uid() and is_default),
    (select id from public.persona_photos where storage_path like '%/delete.jpg')
  ),
  (select storage_path from public.persona_photos where storage_path like '%/delete.jpg'),
  'prepare returns the private storage key'
);
select ok(
  (select deletion_pending from public.persona_photos where storage_path like '%/delete.jpg'),
  'prepare reserves the source photo'
);
select throws_ok(
  $$insert into public.photoshoots(user_id, persona_id, persona_snapshot, style_id, status, images, package_snapshot)
    select p.user_id, p.id, jsonb_build_object('photos', jsonb_build_array(pp.storage_path)),
      'reservation-race', 'queued', array[pp.storage_path], '{"id":"reservation-race"}'::jsonb
    from public.personas p join public.persona_photos pp on pp.persona_id = p.id
    where pp.storage_path like '%/delete.jpg'$$,
  '23514', 'PERSONA_PHOTO_DELETION_PENDING',
  'reserved source cannot enter a new active job'
);
select lives_ok(
  $$select public.cancel_persona_photo_deletion(
    (select id from public.personas where user_id = auth.uid() and is_default),
    (select id from public.persona_photos where storage_path like '%/delete.jpg')
  )$$,
  'storage failure can cancel the reservation'
);
select isnt(
  (select deletion_pending from public.persona_photos where storage_path like '%/delete.jpg'),
  true,
  'cancel makes the source usable again'
);

select public.prepare_persona_photo_deletion(
  (select id from public.personas where user_id = auth.uid() and is_default),
  (select id from public.persona_photos where storage_path like '%/delete.jpg')
);
select is(
  public.delete_persona_photo(
    (select id from public.personas where user_id = auth.uid() and is_default),
    (select id from public.persona_photos where storage_path like '%/delete.jpg')
  ),
  'personas/97000000-0000-4000-8000-000000000097/' ||
    (select id from public.personas where user_id = auth.uid() and is_default) || '/delete.jpg',
  'finalize returns the deleted storage key'
);
select is(
  (select count(*) from public.persona_photos where storage_path like '%/delete.jpg'),
  0::bigint,
  'finalize deletes the PersonaPhoto row'
);
select is(
  (select images from public.photoshoots where style_id = 'completed-job'),
  array[(select storage_path from public.persona_photos where storage_path like '%/keep.jpg')],
  'finalize removes the source reference from photoshoots.images'
);
select is(
  (select persona_snapshot->'photos' from public.photoshoots where style_id = 'completed-job'),
  jsonb_build_array((select storage_path from public.persona_photos where storage_path like '%/keep.jpg')),
  'finalize removes the source reference from persona_snapshot.photos'
);
select is(
  (select result_images from public.photoshoots where style_id = 'completed-job'),
  array['photoshoots/generations/finished/result.jpg'],
  'generated results remain unchanged'
);

select * from finish();
rollback;
