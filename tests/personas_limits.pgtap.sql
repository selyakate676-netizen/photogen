begin;
create extension if not exists pgtap;
select plan(16);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
 ('30000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'persona-c@example.test', '', now(), now()),
 ('40000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'persona-d@example.test', '', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', true);
select lives_ok($$select public.create_persona(null, null, null, null, null)$$, 'draft default can exist without photos');
select is((select status from public.personas), 'draft', 'zero-photo persona remains draft');
select is((select count(*) from public.personas where id=(select id from public.personas limit 1)), 1::bigint, 'owner can get one persona');

select lives_ok($$select public.add_persona_photo((select id from public.personas limit 1), 'personas/30000000-0000-4000-8000-000000000003/'||(select id from public.personas limit 1)||'/1.jpg')$$, 'photo one');
select lives_ok($$select public.add_persona_photo((select id from public.personas limit 1), 'personas/30000000-0000-4000-8000-000000000003/'||(select id from public.personas limit 1)||'/2.jpg')$$, 'photo two');
select lives_ok($$select public.add_persona_photo((select id from public.personas limit 1), 'personas/30000000-0000-4000-8000-000000000003/'||(select id from public.personas limit 1)||'/3.jpg')$$, 'photo three');
select lives_ok($$select public.add_persona_photo((select id from public.personas limit 1), 'personas/30000000-0000-4000-8000-000000000003/'||(select id from public.personas limit 1)||'/4.jpg')$$, 'photo four');
select lives_ok($$select public.add_persona_photo((select id from public.personas limit 1), 'personas/30000000-0000-4000-8000-000000000003/'||(select id from public.personas limit 1)||'/5.jpg')$$, 'photo five');
select throws_ok($$select public.add_persona_photo((select id from public.personas limit 1), 'personas/30000000-0000-4000-8000-000000000003/'||(select id from public.personas limit 1)||'/6.jpg')$$, '23514', 'PERSONA_PHOTO_LIMIT', 'sixth photo is rejected');

select lives_ok($$
  select public.reorder_persona_photos(
    (select id from public.personas limit 1),
    (select array_agg(id order by sort_order desc) from public.persona_photos)
  )
$$, 'owner can reverse photo order');
select ok((select storage_path from public.persona_photos order by sort_order limit 1) like '%/5.jpg', 'reordered first photo is priority');
select throws_ok($$
  select public.reorder_persona_photos(
    (select id from public.personas limit 1),
    (select array_fill(id, array[5]) from public.persona_photos limit 1)
  )
$$, '23514', 'INVALID_PHOTO_ORDER', 'duplicate photo IDs are rejected');
select throws_ok($$
  select public.reorder_persona_photos(
    (select id from public.personas limit 1),
    (select array_agg(id order by sort_order) from public.persona_photos where sort_order < 4)
  )
$$, '23514', 'INVALID_PHOTO_ORDER', 'incomplete photo order is rejected');

select lives_ok($$
  select public.delete_persona_photo(
    (select id from public.personas limit 1),
    (select id from public.persona_photos order by sort_order limit 1)
  )
$$, 'photo deletion succeeds');
select is((select array_agg(sort_order order by sort_order) from public.persona_photos), array[0,1,2,3], 'photo order is normalized after deletion');

select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000004', true);
select is((select count(*) from public.personas), 0::bigint, 'other user cannot list or get owner persona/photos');
select * from finish();
rollback;
