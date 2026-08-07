alter table public.photoshoots
  add column if not exists package_snapshot jsonb;
alter table public.photoshoots
  drop constraint if exists photoshoots_status_check;
alter table public.photoshoots
  add constraint photoshoots_status_check check (
    status in ('pending', 'awaiting_payment', 'paid', 'queued', 'generating', 'completed', 'failed', 'cancelled')
  );
\ir ../supabase_photoshoot_crystal_charge.sql

begin;
create extension if not exists pgtap;
select no_plan();

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('94000000-0000-4000-8000-000000000094', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'wallet-a@example.test', '', now(), now()),
  ('95000000-0000-4000-8000-000000000095', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'wallet-b@example.test', '', now(), now());

select is(
  (select balance_crystals from public.wallets where user_id = '94000000-0000-4000-8000-000000000094'),
  0::bigint,
  'new user receives a zero-balance wallet'
);

set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);

select is(
  (public.credit_wallet('94000000-0000-4000-8000-000000000094', 100, 'wallet-test:credit-100')).balance_after_crystals,
  100::bigint,
  'credit returns balance 100'
);
select is(
  (select balance_crystals from public.wallets where user_id = '94000000-0000-4000-8000-000000000094'),
  100::bigint,
  'credit atomically updates wallet balance'
);
select results_eq(
  $$select delta_crystals, balance_after_crystals from public.wallet_transactions where idempotency_key = 'wallet-test:credit-100'$$,
  $$values (100::bigint, 100::bigint)$$,
  'credit ledger contains +100 and balance_after 100'
);

select is(
  (public.debit_wallet('94000000-0000-4000-8000-000000000094', 30, 'wallet-test:debit-30')).balance_after_crystals,
  70::bigint,
  'debit returns balance 70'
);
select results_eq(
  $$select delta_crystals, balance_after_crystals from public.wallet_transactions where idempotency_key = 'wallet-test:debit-30'$$,
  $$values (-30::bigint, 70::bigint)$$,
  'debit ledger contains -30 and balance_after 70'
);

select throws_ok(
  $$select public.debit_wallet('94000000-0000-4000-8000-000000000094', 71, 'wallet-test:insufficient')$$,
  '23514', 'INSUFFICIENT_CRYSTALS',
  'insufficient debit is rejected'
);
select is(
  (select balance_crystals from public.wallets where user_id = '94000000-0000-4000-8000-000000000094'),
  70::bigint,
  'insufficient debit leaves balance unchanged'
);
select is(
  (select count(*) from public.wallet_transactions where idempotency_key = 'wallet-test:insufficient'),
  0::bigint,
  'insufficient debit creates no ledger row'
);

select is(
  (public.credit_wallet('94000000-0000-4000-8000-000000000094', 100, 'wallet-test:credit-100')).balance_after_crystals,
  100::bigint,
  'duplicate credit returns the original result'
);
select is(
  (select count(*) from public.wallet_transactions where idempotency_key = 'wallet-test:credit-100'),
  1::bigint,
  'duplicate credit creates one transaction'
);
select is(
  (select balance_crystals from public.wallets where user_id = '94000000-0000-4000-8000-000000000094'),
  70::bigint,
  'duplicate credit does not change current balance again'
);

select is(
  (public.debit_wallet('94000000-0000-4000-8000-000000000094', 30, 'wallet-test:debit-30')).balance_after_crystals,
  70::bigint,
  'duplicate debit returns the original result'
);
select is(
  (select count(*) from public.wallet_transactions where idempotency_key = 'wallet-test:debit-30'),
  1::bigint,
  'duplicate debit creates one transaction'
);
select is(
  (select balance_crystals from public.wallets where user_id = '94000000-0000-4000-8000-000000000094'),
  70::bigint,
  'duplicate debit does not change balance again'
);

select throws_ok(
  $$select public.credit_wallet('94000000-0000-4000-8000-000000000094', 0, 'wallet-test:zero')$$,
  '22023', 'POSITIVE_AMOUNT_REQUIRED',
  'zero credit is rejected'
);

select ok(
  position(
    'for update' in lower(pg_get_functiondef('public.debit_wallet(uuid,bigint,text,text,text,jsonb)'::regprocedure))
  ) > 0,
  'debit locks the wallet row for concurrent safety'
);

select is(
  (public.credit_wallet('95000000-0000-4000-8000-000000000095', 100, 'wallet-charge:fund')).balance_after_crystals,
  100::bigint,
  'charge fixture funds the wallet'
);
insert into public.photoshoots(user_id, style_id, status, package_snapshot)
values (
  '95000000-0000-4000-8000-000000000095',
  'social',
  'queued',
  '{"id":"social","price_crystals":30}'::jsonb
);
select set_config(
  'photogen.wallet_charge_order',
  (select id::text from public.photoshoots where style_id = 'social'),
  true
);
select ok(
  public.claim_photoshoot_generation(current_setting('photogen.wallet_charge_order')::uuid),
  'sufficient balance claims the order'
);
select is(
  (select balance_crystals from public.wallets where user_id = '95000000-0000-4000-8000-000000000095'),
  70::bigint,
  'claim debits the immutable snapshot price once'
);
select is(
  (select delta_crystals from public.wallet_transactions
   where idempotency_key = 'photoshoot:' || current_setting('photogen.wallet_charge_order') || ':charge'),
  -30::bigint,
  'ledger debit equals the order snapshot crystal price'
);
select is(
  (select count(*) from public.wallet_transactions
   where idempotency_key = 'photoshoot:' || current_setting('photogen.wallet_charge_order') || ':charge'),
  1::bigint,
  'one photoshoot produces one charge transaction'
);
select is(
  public.claim_photoshoot_generation(current_setting('photogen.wallet_charge_order')::uuid),
  false,
  'repeated or concurrent claim cannot claim the order twice'
);
select is(
  (select balance_crystals from public.wallets where user_id = '95000000-0000-4000-8000-000000000095'),
  70::bigint,
  'repeated claim does not debit twice'
);
select ok(
  position(
    'for update' in lower(pg_get_functiondef('public.claim_photoshoot_generation(uuid)'::regprocedure))
  ) > 0,
  'concurrent claims serialize on the photoshoot row'
);

insert into public.photoshoots(user_id, style_id, status, package_snapshot)
values (
  '94000000-0000-4000-8000-000000000094',
  'career',
  'queued',
  '{"id":"career","price_crystals":80}'::jsonb
);
select set_config(
  'photogen.wallet_insufficient_order',
  (select id::text from public.photoshoots where style_id = 'career'),
  true
);
select throws_ok(
  $$select public.claim_photoshoot_generation(current_setting('photogen.wallet_insufficient_order')::uuid)$$,
  '23514', 'INSUFFICIENT_CRYSTALS',
  'insufficient balance rejects generation claim'
);
select is(
  (select status from public.photoshoots where id = current_setting('photogen.wallet_insufficient_order')::uuid),
  'queued',
  'insufficient balance leaves the order queued'
);
select is(
  (select balance_crystals from public.wallets where user_id = '94000000-0000-4000-8000-000000000094'),
  70::bigint,
  'insufficient balance leaves wallet unchanged'
);
select is(
  (select count(*) from public.wallet_transactions
   where idempotency_key = 'photoshoot:' || current_setting('photogen.wallet_insufficient_order') || ':charge'),
  0::bigint,
  'insufficient balance creates no charge ledger entry'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '94000000-0000-4000-8000-000000000094', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is((select count(*) from public.wallets), 1::bigint, 'user A can read only own wallet');
select is((select count(*) from public.wallet_transactions), 2::bigint, 'user A can read only own ledger');
select throws_ok(
  $$update public.wallets set balance_crystals = 999 where user_id = auth.uid()$$,
  '42501', 'permission denied for table wallets',
  'authenticated user cannot mutate wallet balance directly'
);
select throws_ok(
  $$delete from public.wallet_transactions where user_id = auth.uid()$$,
  '42501', 'permission denied for table wallet_transactions',
  'authenticated user cannot mutate ledger directly'
);
select throws_ok(
  $$select public.credit_wallet(auth.uid(), 100, 'wallet-test:self-credit')$$,
  '42501', 'permission denied for function credit_wallet',
  'authenticated user cannot credit own wallet through RPC'
);
select throws_ok(
  $$select public.debit_wallet('95000000-0000-4000-8000-000000000095', 1, 'wallet-test:other-debit')$$,
  '42501', 'permission denied for function debit_wallet',
  'authenticated user cannot debit another wallet through RPC'
);

reset role;
select * from finish();
rollback;
