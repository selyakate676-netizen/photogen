begin;
create extension if not exists pgtap;
select plan(18);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('91000000-0000-4000-8000-000000000091', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lifecycle-a@example.test', '', now(), now()),
  ('92000000-0000-4000-8000-000000000092', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lifecycle-b@example.test', '', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000091', true);
select public.create_persona(null, null, null, 'woman', 'green');
select public.add_persona_photo(
  (select id from public.personas where user_id = auth.uid() and is_default),
  'personas/91000000-0000-4000-8000-000000000091/' ||
    (select id from public.personas where user_id = auth.uid() and is_default) || '/one.jpg'
);

select public.create_photoshoot_with_persona(
  (select id from public.personas where user_id = auth.uid() and is_default),
  'dating', '{}', 'woman', 'average', 'green', '',
  null, null, null, null, null,
  4, '{"id":"dating","slug":"dating","name":"Знакомства"}'::jsonb
);

select is(
  (select status from public.photoshoots where user_id = auth.uid() order by created_at limit 1),
  'awaiting_payment',
  'new order starts in awaiting_payment'
);

select is(
  (select requested_images_count from public.photoshoots where user_id = auth.uid() order by created_at limit 1),
  4,
  'requested image count is fixed on the order'
);

select is(
  (select package_snapshot->>'name' from public.photoshoots where user_id = auth.uid() order by created_at limit 1),
  'Знакомства',
  'package name is fixed in package snapshot'
);

select throws_ok(
  $$select public.finish_photoshoot_generation(
    (select id from public.photoshoots where user_id = auth.uid() order by created_at limit 1),
    true
  )$$,
  '23514', 'INVALID_PHOTOSHOOT_STATUS_TRANSITION',
  'awaiting_payment cannot bypass paid and queued'
);

select public.confirm_mock_photoshoot_payment(
  (select id from public.photoshoots where user_id = auth.uid() order by created_at limit 1)
);
select is(
  (select status from public.photoshoots where user_id = auth.uid() order by created_at limit 1),
  'queued',
  'mock payment atomically reaches queued'
);

select public.confirm_mock_photoshoot_payment(
  (select id from public.photoshoots where user_id = auth.uid() order by created_at limit 1)
);
select is(
  (select status from public.photoshoots where user_id = auth.uid() order by created_at limit 1),
  'queued',
  'repeated mock payment is a safe no-op'
);

select ok(
  public.claim_photoshoot_generation(
    (select id from public.photoshoots where user_id = auth.uid() order by created_at limit 1)
  ),
  'first generation request claims queued order'
);

select is(
  public.claim_photoshoot_generation(
    (select id from public.photoshoots where user_id = auth.uid() order by created_at limit 1)
  ),
  false,
  'second generation request cannot claim the same order'
);

select public.record_photoshoot_result_images(
  (select id from public.photoshoots where user_id = auth.uid() order by created_at limit 1),
  array['photoshoots/generations/' ||
    (select id from public.photoshoots where user_id = auth.uid() order by created_at limit 1) || '/result_one.jpg']
);
select public.record_photoshoot_result_images(
  (select id from public.photoshoots where user_id = auth.uid() order by created_at limit 1),
  array['photoshoots/generations/' ||
    (select id from public.photoshoots where user_id = auth.uid() order by created_at limit 1) || '/result_one.jpg']
);
select is(
  (select cardinality(result_images) from public.photoshoots where user_id = auth.uid() order by created_at limit 1),
  1,
  'repeated result event does not duplicate an image'
);

select public.finish_photoshoot_generation(
  (select id from public.photoshoots where user_id = auth.uid() order by created_at limit 1),
  true
);
select is(
  (select status from public.photoshoots where user_id = auth.uid() order by created_at limit 1),
  'completed',
  'generating order completes'
);

select ok(
  (select completed_at is not null from public.photoshoots where user_id = auth.uid() order by created_at limit 1),
  'completion timestamp is stored'
);

select throws_ok(
  $$select public.finish_photoshoot_generation(
    (select id from public.photoshoots where user_id = auth.uid() order by created_at limit 1),
    false
  )$$,
  '23514', 'INVALID_PHOTOSHOOT_STATUS_TRANSITION',
  'completed order is terminal'
);

select throws_ok(
  $$update public.photoshoots set package_snapshot = '{}'::jsonb
    where user_id = auth.uid()$$,
  '42501', 'PHOTOSHOOT_ORDER_SNAPSHOT_IMMUTABLE',
  'order package snapshot is immutable'
);

select public.create_photoshoot_with_persona(
  (select id from public.personas where user_id = auth.uid() and is_default),
  'career', '{}', 'woman', 'average', 'green', '',
  null, null, null, null, null,
  4, '{"id":"career","slug":"career","name":"Бизнес-портрет"}'::jsonb
);
select public.confirm_mock_photoshoot_payment(
  (select id from public.photoshoots where user_id = auth.uid() and style_id = 'career' limit 1)
);
select ok(
  public.claim_photoshoot_generation(
    (select id from public.photoshoots where user_id = auth.uid() and style_id = 'career' limit 1)
  ),
  'second queued order can be claimed independently'
);
select public.finish_photoshoot_generation(
  (select id from public.photoshoots where user_id = auth.uid() and style_id = 'career' limit 1),
  false, 'Не удалось завершить генерацию. Попробуйте позже.'
);
select is(
  (select status from public.photoshoots where user_id = auth.uid() and style_id = 'career' limit 1),
  'failed',
  'provider failure becomes failed'
);

select is(
  (select safe_error from public.photoshoots where user_id = auth.uid() and style_id = 'career' limit 1),
  'Не удалось завершить генерацию. Попробуйте позже.',
  'failed order stores only a safe user error'
);

select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000092', true);
select is((select count(*) from public.photoshoots), 0::bigint, 'foreign user cannot list owner orders');

select throws_ok(
  $$select public.finish_photoshoot_generation(
    (select id from public.photoshoots where user_id = '91000000-0000-4000-8000-000000000091' limit 1),
    true
  )$$,
  'P0002', 'PHOTOSHOOT_NOT_FOUND',
  'foreign order is hidden from lifecycle operations'
);

reset role;
select * from finish();
rollback;
