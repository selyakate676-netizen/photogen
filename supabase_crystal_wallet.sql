-- Minimal crystal wallet and immutable transaction ledger foundation.
-- Apply after supabase_rpc_acl_hardening.sql.

begin;

create table public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance_crystals bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallets_balance_nonnegative check (balance_crystals >= 0)
);

create table public.wallet_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta_crystals bigint not null,
  balance_after_crystals bigint not null,
  transaction_type text not null,
  idempotency_key text not null unique,
  reference_type text,
  reference_id text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  constraint wallet_transactions_delta_nonzero check (delta_crystals <> 0),
  constraint wallet_transactions_balance_nonnegative check (balance_after_crystals >= 0),
  constraint wallet_transactions_type_check check (transaction_type in ('credit', 'debit')),
  constraint wallet_transactions_direction_check check (
    (transaction_type = 'credit' and delta_crystals > 0)
    or (transaction_type = 'debit' and delta_crystals < 0)
  ),
  constraint wallet_transactions_idempotency_key_nonempty check (btrim(idempotency_key) <> '')
);

create index wallet_transactions_user_created_idx
  on public.wallet_transactions(user_id, created_at desc);

create trigger set_wallets_updated_at
before update on public.wallets
for each row execute function public.set_updated_at();

create or replace function public.create_wallet_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.wallets(user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_wallet_after_user_insert on auth.users;
create trigger create_wallet_after_user_insert
after insert on auth.users
for each row execute function public.create_wallet_for_new_user();

insert into public.wallets(user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function public.credit_wallet(
  p_user_id uuid,
  p_amount bigint,
  p_idempotency_key text,
  p_reference_type text default null,
  p_reference_id text default null,
  p_metadata jsonb default null
) returns public.wallet_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.wallet_transactions;
  v_balance bigint;
  v_transaction public.wallet_transactions;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  if p_user_id is null then
    raise exception using errcode = '22004', message = 'USER_ID_REQUIRED';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception using errcode = '22023', message = 'POSITIVE_AMOUNT_REQUIRED';
  end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception using errcode = '22023', message = 'IDEMPOTENCY_KEY_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));

  select * into v_existing
  from public.wallet_transactions
  where idempotency_key = p_idempotency_key;

  if found then
    if v_existing.user_id is distinct from p_user_id
       or v_existing.transaction_type <> 'credit'
       or v_existing.delta_crystals <> p_amount
       or v_existing.reference_type is distinct from p_reference_type
       or v_existing.reference_id is distinct from p_reference_id
       or v_existing.metadata is distinct from p_metadata then
      raise exception using errcode = '23505', message = 'IDEMPOTENCY_KEY_CONFLICT';
    end if;
    return v_existing;
  end if;

  insert into public.wallets(user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  select balance_crystals into v_balance
  from public.wallets
  where user_id = p_user_id
  for update;

  update public.wallets
  set balance_crystals = balance_crystals + p_amount
  where user_id = p_user_id
  returning balance_crystals into v_balance;

  insert into public.wallet_transactions(
    user_id, delta_crystals, balance_after_crystals, transaction_type,
    idempotency_key, reference_type, reference_id, metadata
  ) values (
    p_user_id, p_amount, v_balance, 'credit',
    p_idempotency_key, p_reference_type, p_reference_id, p_metadata
  ) returning * into v_transaction;

  return v_transaction;
end;
$$;

create or replace function public.debit_wallet(
  p_user_id uuid,
  p_amount bigint,
  p_idempotency_key text,
  p_reference_type text default null,
  p_reference_id text default null,
  p_metadata jsonb default null
) returns public.wallet_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.wallet_transactions;
  v_balance bigint;
  v_transaction public.wallet_transactions;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  if p_user_id is null then
    raise exception using errcode = '22004', message = 'USER_ID_REQUIRED';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception using errcode = '22023', message = 'POSITIVE_AMOUNT_REQUIRED';
  end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception using errcode = '22023', message = 'IDEMPOTENCY_KEY_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));

  select * into v_existing
  from public.wallet_transactions
  where idempotency_key = p_idempotency_key;

  if found then
    if v_existing.user_id is distinct from p_user_id
       or v_existing.transaction_type <> 'debit'
       or v_existing.delta_crystals <> -p_amount
       or v_existing.reference_type is distinct from p_reference_type
       or v_existing.reference_id is distinct from p_reference_id
       or v_existing.metadata is distinct from p_metadata then
      raise exception using errcode = '23505', message = 'IDEMPOTENCY_KEY_CONFLICT';
    end if;
    return v_existing;
  end if;

  insert into public.wallets(user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  select balance_crystals into v_balance
  from public.wallets
  where user_id = p_user_id
  for update;

  if v_balance < p_amount then
    raise exception using errcode = '23514', message = 'INSUFFICIENT_CRYSTALS';
  end if;

  update public.wallets
  set balance_crystals = balance_crystals - p_amount
  where user_id = p_user_id
  returning balance_crystals into v_balance;

  insert into public.wallet_transactions(
    user_id, delta_crystals, balance_after_crystals, transaction_type,
    idempotency_key, reference_type, reference_id, metadata
  ) values (
    p_user_id, -p_amount, v_balance, 'debit',
    p_idempotency_key, p_reference_type, p_reference_id, p_metadata
  ) returning * into v_transaction;

  return v_transaction;
end;
$$;

alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;

create policy wallets_select_own
on public.wallets for select
to authenticated
using (user_id = auth.uid());

create policy wallet_transactions_select_own
on public.wallet_transactions for select
to authenticated
using (user_id = auth.uid());

revoke all privileges on table public.wallets
  from public, anon, authenticated, service_role;
revoke all privileges on table public.wallet_transactions
  from public, anon, authenticated, service_role;

grant select on table public.wallets to authenticated, service_role;
grant select on table public.wallet_transactions to authenticated, service_role;

revoke all privileges on function public.credit_wallet(uuid, bigint, text, text, text, jsonb)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.debit_wallet(uuid, bigint, text, text, text, jsonb)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.create_wallet_for_new_user()
  from public, anon, authenticated, service_role;

grant execute on function public.credit_wallet(uuid, bigint, text, text, text, jsonb)
  to service_role;
grant execute on function public.debit_wallet(uuid, bigint, text, text, text, jsonb)
  to service_role;

commit;
