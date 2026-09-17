begin;
create extension if not exists pgtap;
select plan(35);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('95000000-0000-4000-8000-000000000095', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'payment-owner@example.test', '', now(), now()),
  ('96000000-0000-4000-8000-000000000096', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'payment-foreign@example.test', '', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '95000000-0000-4000-8000-000000000095', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select public.create_persona(null, null, null, 'woman', 'green');
select public.add_persona_photo(
  (select id from public.personas where user_id = auth.uid() and is_default),
  'personas/95000000-0000-4000-8000-000000000095/' ||
    (select id from public.personas where user_id = auth.uid() and is_default) || '/one.jpg'
);
select public.create_photoshoot_with_persona(
  (select id from public.personas where user_id = auth.uid() and is_default),
  'rub-primary', '{}', 'woman', 'average', 'green', '',
  null, null, null, null, null,
  4, '{"id":"rub-primary","name":"RUB primary","price_crystals":38}'::jsonb
);
select public.create_photoshoot_with_persona(
  (select id from public.personas where user_id = auth.uid() and is_default),
  'rub-secondary', '{}', 'woman', 'average', 'green', '',
  null, null, null, null, null,
  4, '{"id":"rub-secondary","name":"RUB secondary","price_crystals":38}'::jsonb
);
select set_config(
  'photogen.payment_order_one',
  (select id::text from public.photoshoots where user_id = auth.uid() and style_id = 'rub-primary'),
  true
);
select set_config(
  'photogen.payment_order_two',
  (select id::text from public.photoshoots where user_id = auth.uid() and style_id = 'rub-secondary'),
  true
);

reset role;

select has_table('public', 'payments', 'payments table exists');
select has_view('public', 'payment_records', 'safe payment records view exists');
select columns_are(
  'public', 'payments',
  array[
    'id', 'user_id', 'photoshoot_id', 'purpose', 'provider', 'payment_method',
    'provider_payment_id', 'amount_minor', 'currency', 'status', 'idempotency_key',
    'is_test_mode', 'attribution_snapshot', 'provider_snapshot', 'failure_code',
    'created_at', 'updated_at', 'paid_at'
  ],
  'payments schema contains the approved P0 columns'
);
select has_column('public', 'photoshoots', 'payment_source', 'photoshoots has payment_source');
select has_column('public', 'photoshoots', 'payment_id', 'photoshoots has payment_id');
select ok(
  (select payment_source is null and payment_id is null
   from public.photoshoots where id = current_setting('photogen.payment_order_two')::uuid),
  'historical photoshoots remain valid with NULL payment fields'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.payments'::regclass),
  'payments has RLS enabled'
);
select ok(has_column_privilege('authenticated', 'public.payments', 'status', 'SELECT'),
  'authenticated can read safe payment status');
select ok(not has_column_privilege('authenticated', 'public.payments', 'provider_snapshot', 'SELECT'),
  'authenticated cannot read provider snapshot');
select ok(not has_table_privilege('authenticated', 'public.payments', 'INSERT'),
  'authenticated cannot insert payments');
select ok(not has_table_privilege('authenticated', 'public.payments', 'UPDATE'),
  'authenticated cannot update payments');
select ok(not has_table_privilege('authenticated', 'public.payments', 'DELETE'),
  'authenticated cannot delete payments');
select ok(not has_table_privilege('anon', 'public.payment_records', 'SELECT'),
  'anon cannot read payment records');
select ok(has_function_privilege('service_role', 'public.confirm_yookassa_photoshoot_payment(uuid)', 'EXECUTE'),
  'service role can execute trusted RUB transition');
select ok(not has_function_privilege('authenticated', 'public.confirm_yookassa_photoshoot_payment(uuid)', 'EXECUTE'),
  'authenticated cannot execute trusted RUB transition');
select ok(
  (select p.prosecdef from pg_proc p
   where p.oid = 'public.confirm_yookassa_photoshoot_payment(uuid)'::regprocedure),
  'trusted RUB transition is SECURITY DEFINER'
);
select ok(
  (select coalesce(p.proconfig, '{}'::text[]) @> array['search_path=public']
   from pg_proc p
   where p.oid = 'public.confirm_yookassa_photoshoot_payment(uuid)'::regprocedure),
  'trusted RUB transition fixes search_path'
);

set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);

insert into public.payments(
  id, user_id, photoshoot_id, payment_method, provider_payment_id,
  amount_minor, idempotency_key, is_test_mode, attribution_snapshot, provider_snapshot
) values (
  '97000000-0000-4000-8000-000000000097',
  '95000000-0000-4000-8000-000000000095',
  current_setting('photogen.payment_order_one')::uuid,
  'bank_card', 'yookassa-test-1', 18900, 'payment-test-key-1', true,
  '{"first":{},"last":{}}'::jsonb, '{"status":"pending"}'::jsonb
);

select throws_ok(
  $$update public.payments set amount_minor = 19900
    where id = '97000000-0000-4000-8000-000000000097'$$,
  '42501', 'PAYMENT_IMMUTABLE_FIELD',
  'immutable payment fields cannot change'
);
select throws_ok(
  $$insert into public.payments(user_id, photoshoot_id, payment_method, amount_minor, idempotency_key, is_test_mode)
    values ('95000000-0000-4000-8000-000000000095', current_setting('photogen.payment_order_two')::uuid,
            'sbp', 18900, 'payment-test-key-1', true)$$,
  '23505', null,
  'duplicate idempotency key is rejected'
);
select throws_ok(
  $$insert into public.payments(user_id, photoshoot_id, payment_method, provider_payment_id,
                               amount_minor, idempotency_key, is_test_mode)
    values ('95000000-0000-4000-8000-000000000095', current_setting('photogen.payment_order_two')::uuid,
            'sbp', 'yookassa-test-1', 18900, 'payment-test-key-2', true)$$,
  '23505', null,
  'duplicate provider payment id is rejected'
);
select throws_ok(
  $$insert into public.payments(user_id, photoshoot_id, payment_method, amount_minor, idempotency_key, is_test_mode)
    values ('95000000-0000-4000-8000-000000000095', current_setting('photogen.payment_order_one')::uuid,
            'sbp', 18900, 'payment-test-key-3', true)$$,
  '23505', null,
  'second active pending attempt is rejected'
);
select throws_ok(
  $$insert into public.payments(user_id, photoshoot_id, payment_method, amount_minor, idempotency_key, is_test_mode)
    values ('95000000-0000-4000-8000-000000000095', current_setting('photogen.payment_order_two')::uuid,
            'cash', 18900, 'payment-test-key-4', true)$$,
  '23514', null,
  'unsupported payment method is rejected'
);
select throws_ok(
  $$insert into public.payments(user_id, photoshoot_id, payment_method, amount_minor, idempotency_key, is_test_mode)
    values ('95000000-0000-4000-8000-000000000095', current_setting('photogen.payment_order_two')::uuid,
            'sbp', 0, 'payment-test-key-5', true)$$,
  '23514', null,
  'non-positive amount is rejected'
);

update public.payments
set status = 'succeeded', provider_snapshot = '{"status":"succeeded"}'::jsonb
where id = '97000000-0000-4000-8000-000000000097';

select ok(
  (select paid_at is not null from public.payments where id = '97000000-0000-4000-8000-000000000097'),
  'succeeded payment records paid_at'
);
select throws_ok(
  $$insert into public.payments(user_id, photoshoot_id, payment_method, amount_minor,
                               status, idempotency_key, is_test_mode)
    values ('95000000-0000-4000-8000-000000000095', current_setting('photogen.payment_order_one')::uuid,
            'sbp', 18900, 'succeeded', 'payment-test-key-6', true)$$,
  '23505', null,
  'second succeeded payment is rejected'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '95000000-0000-4000-8000-000000000095', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is((select count(*) from public.payment_records), 1::bigint,
  'owner can read own safe payment record');
select throws_ok(
  $$update public.payments set status = 'succeeded'
    where id = '97000000-0000-4000-8000-000000000097'$$,
  '42501', null,
  'ordinary authenticated client cannot declare payment state'
);
select throws_ok(
  $$select public.confirm_yookassa_photoshoot_payment('97000000-0000-4000-8000-000000000097')$$,
  '42501', 'permission denied for function confirm_yookassa_photoshoot_payment',
  'ordinary authenticated client cannot call trusted RUB transition'
);

select set_config('request.jwt.claim.sub', '96000000-0000-4000-8000-000000000096', true);
select is((select count(*) from public.payment_records), 0::bigint,
  'foreign user cannot read owner payment record');

reset role;
set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select lives_ok(
  $$select public.confirm_yookassa_photoshoot_payment('97000000-0000-4000-8000-000000000097')$$,
  'trusted RUB transition succeeds'
);
select is(
  (select status from public.photoshoots where id = current_setting('photogen.payment_order_one')::uuid),
  'queued',
  'succeeded RUB payment queues photoshoot'
);
select is(
  (select payment_source from public.photoshoots where id = current_setting('photogen.payment_order_one')::uuid),
  'rub',
  'trusted transition records RUB payment source'
);
select is(
  (select payment_id from public.photoshoots where id = current_setting('photogen.payment_order_one')::uuid),
  '97000000-0000-4000-8000-000000000097'::uuid,
  'trusted transition links payment to photoshoot'
);
select lives_ok(
  $$select public.confirm_yookassa_photoshoot_payment('97000000-0000-4000-8000-000000000097')$$,
  'repeated trusted RUB transition is a safe no-op'
);
select is(
  (select count(*) from public.wallet_transactions
   where reference_type = 'photoshoot'
     and reference_id = current_setting('photogen.payment_order_one')),
  0::bigint,
  'RUB transition does not create a wallet transaction'
);

select * from finish();
rollback;
