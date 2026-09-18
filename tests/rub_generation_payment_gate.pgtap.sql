begin;
create extension if not exists pgtap;
select no_plan();

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values ('98000000-0000-4000-8000-000000000098', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'rub-gate@example.test', '', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '98000000-0000-4000-8000-000000000098', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select public.create_persona(null, null, null, 'woman', 'green');
select public.add_persona_photo(
  (select id from public.personas where user_id = auth.uid() and is_default),
  'personas/98000000-0000-4000-8000-000000000098/' ||
    (select id from public.personas where user_id = auth.uid() and is_default) || '/one.jpg'
);
reset role;

insert into public.photoshoots(
  id, user_id, persona_id, persona_snapshot, style_id, status, package_snapshot, payment_source
)
select fixture.id, p.user_id, p.id,
  jsonb_build_object('name', p.name, 'gender', p.gender, 'photos', to_jsonb(array[pp.storage_path])),
  fixture.style_id, 'queued', fixture.package_snapshot, fixture.payment_source
from public.personas p
join public.persona_photos pp on pp.persona_id = p.id
cross join (values
  ('98100000-0000-4000-8000-000000000001'::uuid, 'rub-succeeded', '{"id":"rub-succeeded","price_crystals":30}'::jsonb, 'rub'::text),
  ('98100000-0000-4000-8000-000000000002'::uuid, 'rub-pending', '{"id":"rub-pending","price_crystals":30}'::jsonb, 'rub'::text),
  ('98100000-0000-4000-8000-000000000003'::uuid, 'rub-canceled', '{"id":"rub-canceled","price_crystals":30}'::jsonb, 'rub'::text),
  ('98100000-0000-4000-8000-000000000004'::uuid, 'rub-missing', '{"id":"rub-missing","price_crystals":30}'::jsonb, 'rub'::text),
  ('98100000-0000-4000-8000-000000000005'::uuid, 'rub-mismatch-source', '{"id":"rub-mismatch-source","price_crystals":30}'::jsonb, 'rub'::text),
  ('98100000-0000-4000-8000-000000000006'::uuid, 'rub-mismatch-target', '{"id":"rub-mismatch-target","price_crystals":30}'::jsonb, 'rub'::text),
  ('98100000-0000-4000-8000-000000000007'::uuid, 'crystal-explicit', '{"id":"crystal-explicit","price_crystals":30}'::jsonb, 'crystals'::text),
  ('98100000-0000-4000-8000-000000000008'::uuid, 'crystal-legacy', '{"id":"crystal-legacy","price_crystals":20}'::jsonb, null::text)
) as fixture(id, style_id, package_snapshot, payment_source)
where p.user_id = '98000000-0000-4000-8000-000000000098' and p.is_default;

insert into public.payments(
  id, user_id, photoshoot_id, payment_method, provider_payment_id,
  amount_minor, status, idempotency_key, is_test_mode
) values
  ('98200000-0000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000098', '98100000-0000-4000-8000-000000000001', 'bank_card', 'rub-gate-succeeded', 18900, 'succeeded', 'rub-gate:succeeded', true),
  ('98200000-0000-4000-8000-000000000002', '98000000-0000-4000-8000-000000000098', '98100000-0000-4000-8000-000000000002', 'bank_card', 'rub-gate-pending', 18900, 'pending', 'rub-gate:pending', true),
  ('98200000-0000-4000-8000-000000000003', '98000000-0000-4000-8000-000000000098', '98100000-0000-4000-8000-000000000003', 'bank_card', 'rub-gate-canceled', 18900, 'canceled', 'rub-gate:canceled', true),
  ('98200000-0000-4000-8000-000000000005', '98000000-0000-4000-8000-000000000098', '98100000-0000-4000-8000-000000000005', 'bank_card', 'rub-gate-mismatch', 18900, 'succeeded', 'rub-gate:mismatch', true);

update public.photoshoots set payment_id = case id
  when '98100000-0000-4000-8000-000000000001' then '98200000-0000-4000-8000-000000000001'::uuid
  when '98100000-0000-4000-8000-000000000002' then '98200000-0000-4000-8000-000000000002'::uuid
  when '98100000-0000-4000-8000-000000000003' then '98200000-0000-4000-8000-000000000003'::uuid
  when '98100000-0000-4000-8000-000000000006' then '98200000-0000-4000-8000-000000000005'::uuid
end
where id in (
  '98100000-0000-4000-8000-000000000001', '98100000-0000-4000-8000-000000000002',
  '98100000-0000-4000-8000-000000000003', '98100000-0000-4000-8000-000000000006'
);

set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select (public.credit_wallet('98000000-0000-4000-8000-000000000098', 100, 'rub-gate:fund')).balance_after_crystals;

select ok(public.claim_photoshoot_generation('98100000-0000-4000-8000-000000000007'),
  'explicit crystals order claims successfully');
select is((select balance_crystals from public.wallets where user_id = '98000000-0000-4000-8000-000000000098'), 70::bigint,
  'explicit crystals claim debits the wallet');
select is((select count(*) from public.wallet_transactions where idempotency_key = 'photoshoot:98100000-0000-4000-8000-000000000007:charge'), 1::bigint,
  'explicit crystals claim records one debit');
select * from public.finish_photoshoot_generation('98100000-0000-4000-8000-000000000007', false, 'safe failure');
select is((select balance_crystals from public.wallets where user_id = '98000000-0000-4000-8000-000000000098'), 100::bigint,
  'failed crystals generation restores the wallet balance');
select is((select count(*) from public.wallet_transactions where idempotency_key = 'photoshoot:98100000-0000-4000-8000-000000000007:refund'), 1::bigint,
  'failed crystals generation records one refund');

select ok(public.claim_photoshoot_generation('98100000-0000-4000-8000-000000000008'),
  'historical NULL payment source remains compatible');
select is((select balance_crystals from public.wallets where user_id = '98000000-0000-4000-8000-000000000098'), 80::bigint,
  'historical NULL source keeps legacy crystal debit semantics');

select set_config('photogen.rub_balance_before', (select balance_crystals::text from public.wallets where user_id = '98000000-0000-4000-8000-000000000098'), true);
select set_config('photogen.rub_ledger_before', (select count(*)::text from public.wallet_transactions where user_id = '98000000-0000-4000-8000-000000000098'), true);
select ok(public.claim_photoshoot_generation('98100000-0000-4000-8000-000000000001'),
  'succeeded YooKassa payment permits RUB generation claim');
select is((select balance_crystals from public.wallets where user_id = '98000000-0000-4000-8000-000000000098'), current_setting('photogen.rub_balance_before')::bigint,
  'RUB claim leaves crystal balance unchanged');
select is((select count(*) from public.wallet_transactions where user_id = '98000000-0000-4000-8000-000000000098'), current_setting('photogen.rub_ledger_before')::bigint,
  'RUB claim leaves wallet ledger unchanged');
select is(public.claim_photoshoot_generation('98100000-0000-4000-8000-000000000001'), false,
  'duplicate RUB claim is rejected atomically');
select is((select count(*) from public.wallet_transactions where user_id = '98000000-0000-4000-8000-000000000098'), current_setting('photogen.rub_ledger_before')::bigint,
  'duplicate RUB claim creates no wallet transaction');

select throws_ok($$select public.claim_photoshoot_generation('98100000-0000-4000-8000-000000000002')$$,
  '23514', 'RUB_PAYMENT_NOT_CONFIRMED', 'pending RUB payment is rejected');
select throws_ok($$select public.claim_photoshoot_generation('98100000-0000-4000-8000-000000000003')$$,
  '23514', 'RUB_PAYMENT_NOT_CONFIRMED', 'canceled RUB payment is rejected');
select throws_ok($$select public.claim_photoshoot_generation('98100000-0000-4000-8000-000000000004')$$,
  '23514', 'RUB_PAYMENT_REQUIRED', 'RUB order without payment id is rejected');
select throws_ok($$select public.claim_photoshoot_generation('98100000-0000-4000-8000-000000000006')$$,
  '23514', 'RUB_PAYMENT_NOT_CONFIRMED', 'payment linked to another photoshoot is rejected');

select * from public.finish_photoshoot_generation('98100000-0000-4000-8000-000000000001', false, 'safe RUB failure');
select is((select count(*) from public.wallet_transactions where idempotency_key = 'photoshoot:98100000-0000-4000-8000-000000000001:refund'), 0::bigint,
  'failed RUB generation creates no crystal refund');
select is((select balance_crystals from public.wallets where user_id = '98000000-0000-4000-8000-000000000098'), current_setting('photogen.rub_balance_before')::bigint,
  'failed RUB generation leaves crystal balance unchanged');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '98000000-0000-4000-8000-000000000098', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok(
  $$update public.photoshoots set payment_source = 'rub', payment_id = '98200000-0000-4000-8000-000000000001'
    where id = '98100000-0000-4000-8000-000000000004'$$,
  '42501', 'permission denied for table photoshoots',
  'authenticated client cannot mutate trusted payment linkage'
);

reset role;
select * from finish();
rollback;
