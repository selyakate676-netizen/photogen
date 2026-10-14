\ir ../supabase_photoshoot_crystal_charge.sql
\ir ../supabase_failed_generation_refund.sql
\ir ../supabase_cloudpayments_direct_rub.sql
begin;
create extension if not exists pgtap;
select plan(32);
insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values ('96000000-0000-4000-8000-000000000096', '00000000-0000-4000-8000-000000000000', 'authenticated', 'authenticated', 'cloudpayments@example.test', '', now(), now());
set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select public.credit_wallet('96000000-0000-4000-8000-000000000096', 10, 'cloudpayments:test:credit');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '96000000-0000-4000-8000-000000000096', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select public.create_persona(null, null, null, 'woman', 'green');
select public.add_persona_photo(
  (select id from public.personas where user_id = auth.uid()),
  'personas/96000000-0000-4000-8000-000000000096/'
    || (select id from public.personas where user_id = auth.uid())
    || '/source.jpg'
);
select public.create_photoshoot_with_persona((select id from public.personas where user_id = auth.uid()), 'rub-pack', '{}', 'woman', 'average', 'green', '', null, null, null, null, null, 2, '{"id":"rub-pack","slug":"rub-pack","name":"RUB","price_rub":99,"price_crystals":20}'::jsonb);
select public.create_photoshoot_with_persona((select id from public.personas where user_id = auth.uid()), 'crystal-pack', '{}', 'woman', 'average', 'green', '', null, null, null, null, null, 2, '{"id":"crystal-pack","slug":"crystal-pack","name":"Crystal","price_rub":99,"price_crystals":2}'::jsonb);
select throws_ok(
  $$select public.create_cloudpayments_payment((select id from public.photoshoots where style_id = 'rub-pack'), auth.uid())$$,
  '42501',
  'permission denied for function create_cloudpayments_payment',
  'authenticated cannot create a payment directly'
);
reset role;
set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select throws_ok(
  $$select public.create_cloudpayments_payment(
    (select id from public.photoshoots where style_id = 'rub-pack'),
    '97000000-0000-4000-8000-000000000097'
  )$$,
  'P0002',
  'PHOTOSHOOT_NOT_FOUND',
  'server cannot create a payment for a non-owner'
);
select public.create_cloudpayments_payment(
  (select id from public.photoshoots where style_id = 'rub-pack'),
  '96000000-0000-4000-8000-000000000096'
);
select set_config('photogen.first_invoice', (select id::text from public.cloudpayments_payments), true);
select public.create_cloudpayments_payment(
  (select id from public.photoshoots where style_id = 'rub-pack'),
  '96000000-0000-4000-8000-000000000096'
);
select is((select id::text from public.cloudpayments_payments), current_setting('photogen.first_invoice'), 'pending retry reuses invoice id');
select is((select count(*) from public.cloudpayments_payments), 1::bigint, 'pending retry remains idempotent');
set local role authenticated;
select set_config('request.jwt.claim.sub', '96000000-0000-4000-8000-000000000096', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is((select amount_minor from public.cloudpayments_payments), 9900::bigint, 'RUB price is fixed from immutable order snapshot');
select is((select payment_source from public.photoshoots where style_id = 'rub-pack'), 'rub', 'photoshoot is linked to RUB payment');
select ok(not has_table_privilege('authenticated', 'public.photoshoots', 'UPDATE'), 'authenticated cannot replace trusted payment linkage');
select throws_ok($$select public.confirm_mock_photoshoot_payment((select id from public.photoshoots where style_id = 'rub-pack'))$$, '42501', 'MOCK_PAYMENT_FOR_RUB_FORBIDDEN', 'mock cannot confirm RUB order');
reset role;
set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select throws_ok($$select * from public.process_cloudpayments_notification(null, (select id from public.cloudpayments_payments), 'tx-null', 9900, 'RUB')$$, '22023', 'INVALID_NOTIFICATION_TYPE', 'null notification type rejected');
select throws_ok($$select * from public.process_cloudpayments_notification('check', null, 'tx-null', 9900, 'RUB')$$, '22004', 'INVOICE_REQUIRED', 'null invoice rejected');
select throws_ok($$select * from public.process_cloudpayments_notification('check', (select id from public.cloudpayments_payments), 'tx-null', null, 'RUB')$$, '22004', 'AMOUNT_REQUIRED', 'null amount rejected');
select throws_ok($$select * from public.process_cloudpayments_notification('check', (select id from public.cloudpayments_payments), 'tx-null', 9900, null)$$, '22004', 'CURRENCY_REQUIRED', 'null currency rejected');
select throws_ok($$select * from public.process_cloudpayments_notification('pay', (select id from public.cloudpayments_payments), null, 9900, 'RUB')$$, '22004', 'TRANSACTION_ID_REQUIRED', 'Pay requires transaction id');
select * from public.process_cloudpayments_notification('fail', (select id from public.cloudpayments_payments), 'failed-tx', 9900, 'RUB');
select is((select provider_transaction_id from public.cloudpayments_payments), 'failed-tx', 'failed attempt records provider transaction id');
select is((select tgenabled::text from pg_trigger where tgrelid = 'public.photoshoots'::regclass and tgname = 'guard_photoshoot_payment_linkage'), 'O', 'failed retry runs with payment linkage trigger enabled');
select set_config('photogen.allow_payment_linkage', 'off', true);
select public.create_cloudpayments_payment(
  (select id from public.photoshoots where style_id = 'rub-pack'),
  '96000000-0000-4000-8000-000000000096'
);
select isnt((select id::text from public.cloudpayments_payments), current_setting('photogen.first_invoice'), 'failed retry rotates invoice id');
select is((select provider_transaction_id from public.cloudpayments_payments), null::text, 'failed retry clears provider transaction id');
select is((select amount_minor from public.cloudpayments_payments), 9900::bigint, 'failed retry preserves snapshot amount');
select is((select currency from public.cloudpayments_payments), 'RUB', 'failed retry preserves currency');
select is((select result_code from public.process_cloudpayments_notification('pay', current_setting('photogen.first_invoice')::uuid, 'stale-tx', 9900, 'RUB')), 'PAYMENT_NOT_FOUND', 'stale Pay cannot confirm new attempt');
select is((select accepted from public.process_cloudpayments_notification('check', (select id from public.cloudpayments_payments), 'tx-1', 9800, 'RUB')), false, 'wrong amount rejected');
select is((select accepted from public.process_cloudpayments_notification('check', (select id from public.cloudpayments_payments), 'tx-1', 9900, 'USD')), false, 'wrong currency rejected');
select is((select accepted from public.process_cloudpayments_notification('check', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'tx-1', 9900, 'RUB')), false, 'unknown invoice rejected');
select is((select should_start_generation from public.process_cloudpayments_notification('pay', (select id from public.cloudpayments_payments), 'tx-1', 9900, 'RUB')), true, 'first Pay queues once');
select is((select status from public.photoshoots where style_id = 'rub-pack'), 'queued', 'Pay queues order');
select is((select balance_crystals from public.wallets where user_id = '96000000-0000-4000-8000-000000000096'), 10::bigint, 'RUB Pay leaves crystals');
select is((select should_start_generation from public.process_cloudpayments_notification('pay', (select id from public.cloudpayments_payments), 'tx-1', 9900, 'RUB')), false, 'duplicate Pay no start');
select * from public.process_cloudpayments_notification('fail', (select id from public.cloudpayments_payments), 'tx-1', 9900, 'RUB');
select is((select status from public.cloudpayments_payments), 'succeeded', 'Fail cannot undo Pay');
select is(public.claim_photoshoot_generation((select id from public.photoshoots where style_id = 'rub-pack')), true, 'RUB claim succeeds');
select is((select count(*) from public.wallet_transactions where transaction_type = 'debit'), 0::bigint, 'RUB claim no debit');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '96000000-0000-4000-8000-000000000096', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select public.confirm_mock_photoshoot_payment((select id from public.photoshoots where style_id = 'crystal-pack'));
reset role;
set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select is(public.claim_photoshoot_generation((select id from public.photoshoots where style_id = 'crystal-pack')), true, 'crystal claim remains');
select is((select balance_crystals from public.wallets where user_id = '96000000-0000-4000-8000-000000000096'), 8::bigint, 'crystal debit unchanged');
select * from finish();
rollback;
