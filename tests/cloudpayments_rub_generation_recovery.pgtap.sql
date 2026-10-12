\ir ../supabase_photoshoot_crystal_charge.sql
\ir ../supabase_failed_generation_refund.sql
\ir ../supabase_cloudpayments_direct_rub.sql
\ir ../supabase_cloudpayments_rub_generation_recovery.sql
begin;
create extension if not exists pgtap;
select plan(24);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values ('97000000-0000-4000-8000-000000000097', '00000000-0000-4000-8000-000000000000',
  'authenticated', 'authenticated', 'rub-recovery@example.test', '', now(), now());

set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select public.credit_wallet('97000000-0000-4000-8000-000000000097', 10, 'rub-recovery:test:credit');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '97000000-0000-4000-8000-000000000097', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select public.create_persona(null, null, null, 'woman', 'green');
select public.add_persona_photo(
  (select id from public.personas where user_id = auth.uid()),
  'personas/97000000-0000-4000-8000-000000000097/source.jpg'
);
select public.create_photoshoot_with_persona(
  (select id from public.personas where user_id = auth.uid()), 'rub-recovery-pack', '{}',
  'woman', 'average', 'green', '', null, null, null, null, null, 2,
  '{"id":"rub-recovery-pack","slug":"rub-recovery-pack","name":"RUB recovery","price_rub":99,"price_crystals":20}'::jsonb
);
select public.create_photoshoot_with_persona(
  (select id from public.personas where user_id = auth.uid()), 'crystal-recovery-control', '{}',
  'woman', 'average', 'green', '', null, null, null, null, null, 2,
  '{"id":"crystal-recovery-control","slug":"crystal-recovery-control","name":"Crystal control","price_rub":99,"price_crystals":2}'::jsonb
);
select public.create_cloudpayments_payment((select id from public.photoshoots where style_id = 'rub-recovery-pack'));
reset role;

set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select * from public.process_cloudpayments_notification(
  'pay', (select id from public.cloudpayments_payments), 'tx-recovery', 9900, 'RUB'
);
select is(public.claim_photoshoot_generation(
  (select id from public.photoshoots where style_id = 'rub-recovery-pack')), true, 'paid RUB order is claimed');
select ok((select generation_attempt_id is not null from public.photoshoots where style_id = 'rub-recovery-pack'), 'RUB claim creates attempt token');
select is((select provider_dispatch_state from public.photoshoots where style_id = 'rub-recovery-pack'), 'not_started', 'claim records pre-provider state');
select is(public.recover_rub_generation_pre_provider(
  (select id from public.photoshoots where style_id = 'rub-recovery-pack')), false, 'active claim cannot be recovered before timeout');
select set_config('photogen.first_attempt', (select generation_attempt_id::text from public.photoshoots where style_id = 'rub-recovery-pack'), true);
update public.photoshoots set generation_claimed_at = now() - interval '20 minutes' where style_id = 'rub-recovery-pack';
select is(public.recover_rub_generation_pre_provider(
  (select id from public.photoshoots where style_id = 'rub-recovery-pack')), true, 'stale proven pre-provider failure is requeued');
select is((select status from public.photoshoots where style_id = 'rub-recovery-pack'), 'queued', 'recovery returns order to queued');
select is(public.recover_rub_generation_pre_provider(
  (select id from public.photoshoots where style_id = 'rub-recovery-pack')), false, 'recovery is idempotent');
select is((select status from public.cloudpayments_payments), 'succeeded', 'recovery preserves succeeded payment');
select is((select count(*) from public.wallet_transactions where transaction_type = 'debit'), 0::bigint, 'RUB recovery does not debit crystals');
select is(public.claim_photoshoot_generation(
  (select id from public.photoshoots where style_id = 'rub-recovery-pack')), true, 'recovered order can be claimed once');
select isnt((select generation_attempt_id::text from public.photoshoots where style_id = 'rub-recovery-pack'),
  current_setting('photogen.first_attempt'), 'new claim replaces attempt token');
select is(public.begin_rub_provider_dispatch(
  (select id from public.photoshoots where style_id = 'rub-recovery-pack'),
  current_setting('photogen.first_attempt')::uuid), false, 'stale worker token cannot dispatch after recovery');
select is(public.begin_rub_provider_dispatch(
  (select id from public.photoshoots where style_id = 'rub-recovery-pack'),
  (select generation_attempt_id from public.photoshoots where style_id = 'rub-recovery-pack')), true, 'dispatch is fenced by current attempt');
select is(public.confirm_rub_provider_prediction(
  (select id from public.photoshoots where style_id = 'rub-recovery-pack'),
  (select generation_attempt_id from public.photoshoots where style_id = 'rub-recovery-pack'), 'prediction-1'), true, 'first HC prediction is recorded atomically');
select is((select generation_id from public.photoshoots where style_id = 'rub-recovery-pack'), 'prediction-1', 'first HC prediction id is retained');
select is(public.begin_rub_provider_dispatch(
  (select id from public.photoshoots where style_id = 'rub-recovery-pack'),
  (select generation_attempt_id from public.photoshoots where style_id = 'rub-recovery-pack')), true, 'second HC dispatch can begin after first confirmation');
select is((select provider_dispatch_state from public.photoshoots where style_id = 'rub-recovery-pack'), 'dispatching', 'provider POST gap remains dispatching');
update public.photoshoots set generation_claimed_at = now() - interval '20 minutes' where style_id = 'rub-recovery-pack';
select is(public.recover_rub_generation_pre_provider(
  (select id from public.photoshoots where style_id = 'rub-recovery-pack')), false, 'dispatching or partial multi-HC order cannot restart');
select is(public.mark_rub_provider_dispatch_ambiguous(
  (select id from public.photoshoots where style_id = 'rub-recovery-pack'),
  (select generation_attempt_id from public.photoshoots where style_id = 'rub-recovery-pack')), true, 'transport failure marks dispatch ambiguous');
select is(public.recover_rub_generation_pre_provider(
  (select id from public.photoshoots where style_id = 'rub-recovery-pack')), false, 'ambiguous provider result requires manual recovery');
select is((select status from public.photoshoots where style_id = 'rub-recovery-pack'), 'generating', 'ambiguous order stays blocked in generating');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '97000000-0000-4000-8000-000000000097', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select public.confirm_mock_photoshoot_payment((select id from public.photoshoots where style_id = 'crystal-recovery-control'));
select throws_ok($$select public.recover_rub_generation_pre_provider(
  (select id from public.photoshoots where style_id = 'rub-recovery-pack'))$$,
  '42501', 'SERVICE_ROLE_REQUIRED', 'authenticated user cannot invoke recovery');
reset role;

set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select is(public.claim_photoshoot_generation(
  (select id from public.photoshoots where style_id = 'crystal-recovery-control')), true, 'crystal claim remains unchanged');
select is(public.recover_rub_generation_pre_provider(
  (select id from public.photoshoots where style_id = 'crystal-recovery-control')), false, 'recovery rejects crystal order');
select is((select balance_crystals from public.wallets where user_id = '97000000-0000-4000-8000-000000000097'), 8::bigint, 'crystal debit remains unchanged');

select * from finish();
rollback;
