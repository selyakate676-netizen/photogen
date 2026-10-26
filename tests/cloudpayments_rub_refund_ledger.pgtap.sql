\ir ../supabase_photoshoot_crystal_charge.sql
\ir ../supabase_failed_generation_refund.sql
\ir ../supabase_cloudpayments_direct_rub.sql
\ir ../supabase_cloudpayments_rub_generation_recovery.sql
\ir ../supabase_cloudpayments_rub_refund_ledger.sql
begin;
create extension if not exists pgtap;
select plan(54);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values ('98000000-0000-4000-8000-000000000098', '00000000-0000-4000-8000-000000000000',
  'authenticated', 'authenticated', 'rub-refund@example.test', '', now(), now());

set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select public.credit_wallet('98000000-0000-4000-8000-000000000098', 10, 'rub-refund:test:credit');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '98000000-0000-4000-8000-000000000098', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select public.create_persona(null, null, null, 'woman', 'green');
select public.add_persona_photo(
  (select id from public.personas where user_id = auth.uid()),
  'personas/98000000-0000-4000-8000-000000000098/' || (select id from public.personas where user_id = auth.uid()) || '/source.jpg'
);
select public.create_photoshoot_with_persona(
  (select id from public.personas where user_id = auth.uid()), 'rub-refund-a', '{}',
  'woman', 'average', 'green', '', null, null, null, null, null, 2,
  '{"id":"rub-refund-a","slug":"rub-refund-a","name":"RUB refund A","price_rub":99,"price_crystals":20}'::jsonb
);
select public.create_photoshoot_with_persona(
  (select id from public.personas where user_id = auth.uid()), 'rub-refund-b', '{}',
  'woman', 'average', 'green', '', null, null, null, null, null, 2,
  '{"id":"rub-refund-b","slug":"rub-refund-b","name":"RUB refund B","price_rub":99,"price_crystals":20}'::jsonb
);
select public.create_photoshoot_with_persona(
  (select id from public.personas where user_id = auth.uid()), 'rub-refund-c', '{}',
  'woman', 'average', 'green', '', null, null, null, null, null, 2,
  '{"id":"rub-refund-c","slug":"rub-refund-c","name":"RUB refund C","price_rub":99,"price_crystals":20}'::jsonb
);
select public.create_photoshoot_with_persona(
  (select id from public.personas where user_id = auth.uid()), 'crystal-refund-control', '{}',
  'woman', 'average', 'green', '', null, null, null, null, null, 2,
  '{"id":"crystal-refund-control","slug":"crystal-refund-control","name":"Crystal control","price_rub":99,"price_crystals":2}'::jsonb
);
reset role;

set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select public.create_cloudpayments_payment((select id from public.photoshoots where style_id = 'rub-refund-a'), '98000000-0000-4000-8000-000000000098');
select set_config('photogen.payment_a', (select id::text from public.cloudpayments_payments where photoshoot_id = (select id from public.photoshoots where style_id = 'rub-refund-a')), true);
select * from public.process_cloudpayments_notification('pay', current_setting('photogen.payment_a')::uuid, 'original-tx-a', 9900, 'RUB');
select is(public.claim_photoshoot_generation((select id from public.photoshoots where style_id = 'rub-refund-a')), true, 'paid RUB generation can be claimed before refund intent');

select throws_ok(
  $$select public.register_cloudpayments_rub_refund_intent(current_setting('photogen.payment_a')::uuid, 10000, 'generation failed')$$,
  '23514', 'FULL_REFUND_AMOUNT_MISMATCH', 'refund cannot exceed the paid amount'
);
select set_config('photogen.refund_a', (select (public.register_cloudpayments_rub_refund_intent(current_setting('photogen.payment_a')::uuid, 9900, 'generation failed')).id::text), true);
select is((select status from public.cloudpayments_rub_refunds where id = current_setting('photogen.refund_a')::uuid), 'intent', 'refund intent is recorded');
select throws_ok(
  $$select public.release_cloudpayments_rub_refund_generation(current_setting('photogen.refund_a')::uuid)$$,
  '55000', 'REFUND_GENERATION_RELEASE_NOT_ALLOWED', 'intent cannot be released for generation'
);
select is((public.register_cloudpayments_rub_refund_intent(current_setting('photogen.payment_a')::uuid, 9900, 'retry')).id::text,
  current_setting('photogen.refund_a'), 'repeated refund intent is idempotent');
select is((select count(*) from public.cloudpayments_rub_refunds where payment_id = current_setting('photogen.payment_a')::uuid), 1::bigint, 'repeated intent creates no duplicate');
select is(public.begin_rub_provider_dispatch(
  (select id from public.photoshoots where style_id = 'rub-refund-a'),
  (select generation_attempt_id from public.photoshoots where style_id = 'rub-refund-a')), false, 'refund intent blocks provider dispatch');
update public.photoshoots set generation_claimed_at = now() - interval '20 minutes' where style_id = 'rub-refund-a';
select is(public.recover_rub_generation_pre_provider((select id from public.photoshoots where style_id = 'rub-refund-a')), false, 'refund intent blocks recovery requeue');
select is((public.record_cloudpayments_rub_refund_pending(current_setting('photogen.refund_a')::uuid, 'refund-tx-a')).status, 'pending', 'intent becomes pending');
select throws_ok(
  $$select public.release_cloudpayments_rub_refund_generation(current_setting('photogen.refund_a')::uuid)$$,
  '55000', 'REFUND_GENERATION_RELEASE_NOT_ALLOWED', 'pending refund cannot be released for generation'
);
select is((public.record_cloudpayments_rub_refund_pending(current_setting('photogen.refund_a')::uuid, 'refund-tx-a')).status, 'pending', 'pending transition is idempotent');
select is((public.confirm_cloudpayments_rub_refund_succeeded(current_setting('photogen.refund_a')::uuid, 'refund-tx-a')).status, 'succeeded', 'refund success is confirmed');
select is((public.confirm_cloudpayments_rub_refund_succeeded(current_setting('photogen.refund_a')::uuid, 'refund-tx-a')).status, 'succeeded', 'success confirmation is idempotent');
select is((select status from public.cloudpayments_payments where id = current_setting('photogen.payment_a')::uuid), 'succeeded', 'original payment status remains succeeded');
select throws_ok(
  $$select public.record_cloudpayments_rub_refund_failed(current_setting('photogen.refund_a')::uuid, 'cannot reverse success')$$,
  '55000', 'INVALID_REFUND_TRANSITION', 'succeeded refund cannot become failed'
);
select throws_ok(
  $$select public.release_cloudpayments_rub_refund_generation(current_setting('photogen.refund_a')::uuid)$$,
  '55000', 'REFUND_GENERATION_RELEASE_NOT_ALLOWED', 'succeeded refund cannot be released for generation'
);
select is((public.register_cloudpayments_rub_refund_intent(current_setting('photogen.payment_a')::uuid, 9900, 'duplicate')).id::text,
  current_setting('photogen.refund_a'), 'successful full refund cannot be duplicated');

select public.create_cloudpayments_payment((select id from public.photoshoots where style_id = 'rub-refund-b'), '98000000-0000-4000-8000-000000000098');
select set_config('photogen.payment_b', (select id::text from public.cloudpayments_payments where photoshoot_id = (select id from public.photoshoots where style_id = 'rub-refund-b')), true);
select * from public.process_cloudpayments_notification('pay', current_setting('photogen.payment_b')::uuid, 'original-tx-b', 9900, 'RUB');
select set_config('photogen.refund_b1', (select (public.register_cloudpayments_rub_refund_intent(current_setting('photogen.payment_b')::uuid, 9900, 'first attempt')).id::text), true);
select is((public.record_cloudpayments_rub_refund_failed(current_setting('photogen.refund_b1')::uuid, 'declined by provider')).status, 'failed', 'failed refund is recorded safely');
select is((public.record_cloudpayments_rub_refund_failed(current_setting('photogen.refund_b1')::uuid, 'declined by provider')).status, 'failed', 'failed result is idempotent');
select set_config('photogen.refund_b2', (select (public.register_cloudpayments_rub_refund_intent(current_setting('photogen.payment_b')::uuid, 9900, 'retry after decline')).id::text), true);
select isnt(current_setting('photogen.refund_b2'), current_setting('photogen.refund_b1'), 'failed refund permits one new controlled intent');
select throws_ok(
  $$select public.claim_photoshoot_generation((select id from public.photoshoots where style_id = 'rub-refund-b'))$$,
  '55000', 'RUB_REFUND_ACTIVE', 'new generation claim is blocked after refund intent'
);
select is((select count(*) from public.cloudpayments_rub_refunds where payment_id = current_setting('photogen.payment_b')::uuid and status in ('intent','pending','succeeded')), 1::bigint,
  'only one active or successful refund exists per payment');

reset role;
set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select public.create_cloudpayments_payment((select id from public.photoshoots where style_id = 'rub-refund-c'), '98000000-0000-4000-8000-000000000098');
select set_config('photogen.payment_c', (select id::text from public.cloudpayments_payments where photoshoot_id = (select id from public.photoshoots where style_id = 'rub-refund-c')), true);
select * from public.process_cloudpayments_notification('pay', current_setting('photogen.payment_c')::uuid, 'original-tx-c', 9900, 'RUB');
select is(public.claim_photoshoot_generation((select id from public.photoshoots where style_id = 'rub-refund-c')), true,
  'control order is claimed before its refund intent');
select set_config('photogen.refund_c1', (select (public.register_cloudpayments_rub_refund_intent(current_setting('photogen.payment_c')::uuid, 9900, 'provider not reached')).id::text), true);
select is((public.record_cloudpayments_rub_refund_failed(current_setting('photogen.refund_c1')::uuid, 'manual refund declined')).status,
  'failed', 'failed refund remains an explicit ledger state');
select is(public.begin_rub_provider_dispatch(
  (select id from public.photoshoots where style_id = 'rub-refund-c'),
  (select generation_attempt_id from public.photoshoots where style_id = 'rub-refund-c')), false,
  'failed refund blocks provider dispatch');
update public.photoshoots set generation_claimed_at = now() - interval '20 minutes' where style_id = 'rub-refund-c';
select is(public.recover_rub_generation_pre_provider((select id from public.photoshoots where style_id = 'rub-refund-c')), false,
  'failed refund blocks recovery requeue');
select is((public.release_cloudpayments_rub_refund_generation(current_setting('photogen.refund_c1')::uuid)).status,
  'generation_released', 'operator can explicitly release a failed refund');
select is((select status from public.photoshoots where style_id = 'rub-refund-c'), 'generating',
  'release RPC does not start, requeue or otherwise change generation');
select is(public.recover_rub_generation_pre_provider((select id from public.photoshoots where style_id = 'rub-refund-c')), true,
  'recovery is allowed only after explicit release');
select is((select status from public.photoshoots where style_id = 'rub-refund-c'), 'queued',
  'explicit recovery, not release, performs the requeue');
select set_config('photogen.refund_c2', (select (public.register_cloudpayments_rub_refund_intent(current_setting('photogen.payment_c')::uuid, 9900, 'second manual attempt')).id::text), true);
select isnt(current_setting('photogen.refund_c2'), current_setting('photogen.refund_c1'),
  'a released failed attempt remains in history while a new intent is created');
select is((public.record_cloudpayments_rub_refund_failed(current_setting('photogen.refund_c2')::uuid, 'second decline')).status,
  'failed', 'a repeated refund attempt can fail safely');
select throws_ok(
  $$select public.claim_photoshoot_generation((select id from public.photoshoots where style_id = 'rub-refund-c'))$$,
  '55000', 'RUB_REFUND_ACTIVE', 'failed refund blocks a queued generation claim'
);
select is((select status from public.photoshoots where style_id = 'rub-refund-c'), 'queued',
  'blocked claim leaves the photoshoot queued');
select is((public.release_cloudpayments_rub_refund_generation(current_setting('photogen.refund_c2')::uuid)).status,
  'generation_released', 'second failed attempt also requires explicit release');
select is((select status from public.photoshoots where style_id = 'rub-refund-c'), 'queued',
  'release still does not claim generation');
select is(public.claim_photoshoot_generation((select id from public.photoshoots where style_id = 'rub-refund-c')), true,
  'generation claim succeeds only after explicit operator release');

reset role;
select throws_ok(
  $$insert into public.cloudpayments_rub_refunds(payment_id, amount_minor, currency, original_provider_transaction_id, status, reason)
    select id, amount_minor, currency, provider_transaction_id, 'intent', 'duplicate constraint probe'
    from public.cloudpayments_payments where id = current_setting('photogen.payment_b')::uuid$$,
  '23505', 'duplicate key value violates unique constraint "cloudpayments_rub_refunds_one_live_per_payment_idx"',
  'partial unique index rejects a second active refund row'
);

set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select ok(has_table_privilege('service_role', 'public.cloudpayments_rub_refunds', 'SELECT'), 'service role can read the ledger');
select ok(not has_table_privilege('service_role', 'public.cloudpayments_rub_refunds', 'INSERT'), 'service role cannot insert ledger rows directly');
select ok(not has_table_privilege('service_role', 'public.cloudpayments_rub_refunds', 'UPDATE'), 'service role cannot update ledger rows directly');
select ok(not has_table_privilege('service_role', 'public.cloudpayments_rub_refunds', 'DELETE'), 'service role cannot delete ledger rows directly');
select throws_ok(
  $$update public.cloudpayments_rub_refunds set status = 'generation_released' where id = current_setting('photogen.refund_b1')::uuid$$,
  '42501', 'permission denied for table cloudpayments_rub_refunds', 'service role cannot bypass release RPC with direct update'
);
select is((select count(*) from information_schema.sequences where sequence_schema = 'public' and sequence_name like 'cloudpayments_rub_refunds%'), 0::bigint,
  'UUID ledger creates no sequence that could bypass table ACL');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '98000000-0000-4000-8000-000000000098', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok(
  $$select public.register_cloudpayments_rub_refund_intent(current_setting('photogen.payment_b')::uuid, 9900, 'not allowed')$$,
  '42501', 'permission denied for function register_cloudpayments_rub_refund_intent', 'public user cannot register refund intent'
);
select throws_ok(
  $$select public.record_cloudpayments_rub_refund_pending(current_setting('photogen.refund_b2')::uuid, null)$$,
  '42501', 'permission denied for function record_cloudpayments_rub_refund_pending', 'public user cannot record refund pending'
);
select throws_ok(
  $$select public.confirm_cloudpayments_rub_refund_succeeded(current_setting('photogen.refund_b2')::uuid, 'forbidden')$$,
  '42501', 'permission denied for function confirm_cloudpayments_rub_refund_succeeded', 'public user cannot confirm refund success'
);
select throws_ok(
  $$select public.record_cloudpayments_rub_refund_failed(current_setting('photogen.refund_b2')::uuid, 'forbidden')$$,
  '42501', 'permission denied for function record_cloudpayments_rub_refund_failed', 'public user cannot record refund failure'
);
select throws_ok(
  $$select public.release_cloudpayments_rub_refund_generation(current_setting('photogen.refund_b1')::uuid)$$,
  '42501', 'permission denied for function release_cloudpayments_rub_refund_generation', 'public user cannot release generation'
);
select throws_ok($$select count(*) from public.cloudpayments_rub_refunds$$,
  '42501', 'permission denied for table cloudpayments_rub_refunds', 'public user cannot read refund ledger');
select throws_ok(
  $$insert into public.cloudpayments_rub_refunds(payment_id, amount_minor, currency, original_provider_transaction_id, status, reason)
    values (current_setting('photogen.payment_b')::uuid, 9900, 'RUB', 'forbidden', 'intent', 'forbidden')$$,
  '42501', 'permission denied for table cloudpayments_rub_refunds', 'public user cannot insert ledger rows'
);
select public.confirm_mock_photoshoot_payment((select id from public.photoshoots where style_id = 'crystal-refund-control'));
reset role;

set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select is(public.claim_photoshoot_generation((select id from public.photoshoots where style_id = 'crystal-refund-control')), true, 'crystal generation claim remains unchanged');
select is((select balance_crystals from public.wallets where user_id = '98000000-0000-4000-8000-000000000098'), 8::bigint, 'crystal debit remains unchanged');
select is((select count(*) from public.wallet_transactions where transaction_type = 'refund'), 0::bigint, 'RUB refund ledger does not create crystal refunds');

select * from finish();
rollback;
