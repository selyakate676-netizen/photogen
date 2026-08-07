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

select like(
  pg_get_functiondef('public.debit_wallet(uuid,bigint,text,text,text,jsonb)'::regprocedure),
  '%for update%',
  'debit locks the wallet row for concurrent safety'
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
