begin;
create extension if not exists pgtap;
select plan(18);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('91000000-0000-4000-8000-000000000091', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lifecycle-a@example.test', '', now(), now()),
  ('92000000-0000-4000-8000-000000000092', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lifecycle-b@example.test', '', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000091', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
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
select set_config(
  'photogen.lifecycle_order_one',
  (select id::text from public.photoshoots where user_id = auth.uid() order by created_at limit 1),
  true
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

reset role;
set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select throws_ok(
  $$select public.finish_photoshoot_generation(
    current_setting('photogen.lifecycle_order_one')::uuid,
    true
  )$$,
  '23514', 'INVALID_PHOTOSHOOT_STATUS_TRANSITION',
  'awaiting_payment cannot bypass paid and queued'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000091', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select public.confirm_mock_photoshoot_payment(
  current_setting('photogen.lifecycle_order_one')::uuid
);
select is(
  (select status from public.photoshoots where user_id = auth.uid() order by created_at limit 1),
  'queued',
  'mock payment atomically reaches queued'
);

select public.confirm_mock_photoshoot_payment(
  current_setting('photogen.lifecycle_order_one')::uuid
);
select is(
  (select status from public.photoshoots where user_id = auth.uid() order by created_at limit 1),
  'queued',
  'repeated mock payment is a safe no-op'
);

reset role;
set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select ok(
  public.claim_photoshoot_generation(
    current_setting('photogen.lifecycle_order_one')::uuid
  ),
  'first generation request claims queued order'
);

select is(
  public.claim_photoshoot_generation(
    current_setting('photogen.lifecycle_order_one')::uuid
  ),
  false,
  'second generation request cannot claim the same order'
);

select public.record_photoshoot_result_images(
  current_setting('photogen.lifecycle_order_one')::uuid,
  array['photoshoots/generations/' || current_setting('photogen.lifecycle_order_one') || '/result_one.jpg']
);
select public.record_photoshoot_result_images(
  current_setting('photogen.lifecycle_order_one')::uuid,
  array['photoshoots/generations/' || current_setting('photogen.lifecycle_order_one') || '/result_one.jpg']
);
select is(
  (select cardinality(result_images) from public.photoshoots where id = current_setting('photogen.lifecycle_order_one')::uuid),
  1,
  'repeated result event does not duplicate an image'
);

select public.finish_photoshoot_generation(
  current_setting('photogen.lifecycle_order_one')::uuid,
  true
);
select is(
  (select status from public.photoshoots where id = current_setting('photogen.lifecycle_order_one')::uuid),
  'completed',
  'generating order completes'
);

select ok(
  (select completed_at is not null from public.photoshoots where id = current_setting('photogen.lifecycle_order_one')::uuid),
  'completion timestamp is stored'
);

select throws_ok(
  $$select public.finish_photoshoot_generation(
    current_setting('photogen.lifecycle_order_one')::uuid,
    false
  )$$,
  '23514', 'INVALID_PHOTOSHOOT_STATUS_TRANSITION',
  'completed order is terminal'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000091', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
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
select set_config(
  'photogen.lifecycle_order_two',
  (select id::text from public.photoshoots where user_id = auth.uid() and style_id = 'career' limit 1),
  true
);
select public.confirm_mock_photoshoot_payment(
  current_setting('photogen.lifecycle_order_two')::uuid
);

reset role;
set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select ok(
  public.claim_photoshoot_generation(
    current_setting('photogen.lifecycle_order_two')::uuid
  ),
  'second queued order can be claimed independently'
);
select public.finish_photoshoot_generation(
  current_setting('photogen.lifecycle_order_two')::uuid,
  false, 'Не удалось завершить генерацию. Попробуйте позже.'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000091', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
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
  $$select public.confirm_mock_photoshoot_payment(
    current_setting('photogen.lifecycle_order_one')::uuid
  )$$,
  'P0002', 'PHOTOSHOOT_NOT_FOUND',
  'foreign order is hidden from owner-facing payment operations'
);

reset role;
select * from finish();
rollback;
