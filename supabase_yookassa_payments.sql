-- P0 YooKassa payment contract for direct RUB photoshoot purchases.
-- Apply after photoshoot lifecycle, crystal wallet and attribution migrations.

begin;

create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  photoshoot_id uuid not null references public.photoshoots(id),
  purpose text not null default 'photoshoot_purchase'
    check (purpose = 'photoshoot_purchase'),
  provider text not null default 'yookassa'
    check (provider = 'yookassa'),
  payment_method text not null
    check (payment_method in ('bank_card', 'sbp')),
  provider_payment_id text,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'RUB' check (currency = 'RUB'),
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'canceled')),
  idempotency_key text not null unique check (btrim(idempotency_key) <> ''),
  is_test_mode boolean not null,
  attribution_snapshot jsonb,
  provider_snapshot jsonb,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  constraint payments_attribution_snapshot_object check (
    attribution_snapshot is null or jsonb_typeof(attribution_snapshot) = 'object'
  ),
  constraint payments_provider_snapshot_object check (
    provider_snapshot is null or jsonb_typeof(provider_snapshot) = 'object'
  )
);

create unique index if not exists payments_provider_payment_id_unique
  on public.payments(provider_payment_id)
  where provider_payment_id is not null;

create unique index if not exists payments_one_succeeded_per_photoshoot
  on public.payments(photoshoot_id)
  where status = 'succeeded';

create unique index if not exists payments_one_pending_per_photoshoot
  on public.payments(photoshoot_id)
  where status = 'pending';

create index if not exists payments_user_created_at_idx
  on public.payments(user_id, created_at desc);

create or replace function public.guard_payment_contract()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.user_id is distinct from new.user_id
       or old.photoshoot_id is distinct from new.photoshoot_id
       or old.amount_minor is distinct from new.amount_minor
       or old.currency is distinct from new.currency
       or old.provider is distinct from new.provider
       or old.purpose is distinct from new.purpose
       or old.payment_method is distinct from new.payment_method
       or old.attribution_snapshot is distinct from new.attribution_snapshot
       or old.idempotency_key is distinct from new.idempotency_key then
      raise exception using errcode = '42501', message = 'PAYMENT_IMMUTABLE_FIELD';
    end if;

    if old.status <> new.status
       and (old.status <> 'pending' or new.status not in ('succeeded', 'canceled')) then
      raise exception using errcode = '23514', message = 'INVALID_PAYMENT_STATUS_TRANSITION';
    end if;
  end if;

  if new.status = 'succeeded' then
    new.paid_at := coalesce(new.paid_at, now());
    new.failure_code := null;
  else
    new.paid_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guard_payment_contract on public.payments;
create trigger guard_payment_contract
before insert or update on public.payments
for each row execute function public.guard_payment_contract();

alter table public.photoshoots
  add column if not exists payment_source text,
  add column if not exists payment_id uuid;

alter table public.photoshoots
  drop constraint if exists photoshoots_payment_source_check,
  add constraint photoshoots_payment_source_check check (
    payment_source is null or payment_source in ('crystals', 'rub')
  );

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'photoshoots_payment_id_fkey'
      and conrelid = 'public.photoshoots'::regclass
  ) then
    alter table public.photoshoots
      add constraint photoshoots_payment_id_fkey
      foreign key (payment_id) references public.payments(id);
  end if;
end;
$$;

create or replace function public.confirm_yookassa_photoshoot_payment(p_payment_id uuid)
returns setof public.photoshoots
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments;
  v_photoshoot public.photoshoots;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;

  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'PAYMENT_NOT_FOUND';
  end if;

  if v_payment.status <> 'succeeded' then
    raise exception using errcode = '23514', message = 'PAYMENT_NOT_SUCCEEDED';
  end if;

  select * into v_photoshoot
  from public.photoshoots
  where id = v_payment.photoshoot_id
  for update;

  if not found or v_photoshoot.user_id <> v_payment.user_id then
    raise exception using errcode = '23514', message = 'PAYMENT_PHOTOSHOOT_MISMATCH';
  end if;

  if v_photoshoot.payment_id is not null
     and v_photoshoot.payment_id <> v_payment.id then
    raise exception using errcode = '23505', message = 'PHOTOSHOOT_PAYMENT_ALREADY_CONFIRMED';
  end if;

  if v_photoshoot.payment_id = v_payment.id
     and v_photoshoot.payment_source = 'rub'
     and v_photoshoot.status in ('queued', 'generating', 'completed', 'failed') then
    return next v_photoshoot;
    return;
  end if;

  if v_photoshoot.status not in ('pending', 'awaiting_payment', 'paid', 'queued') then
    raise exception using errcode = '23514', message = 'INVALID_PHOTOSHOOT_STATUS_TRANSITION';
  end if;

  perform set_config('photogen.allow_status_transition', 'on', true);

  update public.photoshoots
  set payment_source = 'rub', payment_id = v_payment.id
  where id = v_photoshoot.id;

  if v_photoshoot.status = 'pending' then
    update public.photoshoots set status = 'awaiting_payment' where id = v_photoshoot.id;
    v_photoshoot.status := 'awaiting_payment';
  end if;

  if v_photoshoot.status = 'awaiting_payment' then
    update public.photoshoots set status = 'paid' where id = v_photoshoot.id;
    v_photoshoot.status := 'paid';
  end if;

  if v_photoshoot.status = 'paid' then
    update public.photoshoots set status = 'queued' where id = v_photoshoot.id;
  end if;

  select * into v_photoshoot from public.photoshoots where id = v_photoshoot.id;
  return next v_photoshoot;
end;
$$;

alter table public.payments enable row level security;

drop policy if exists payments_select_own on public.payments;
create policy payments_select_own
on public.payments for select
to authenticated
using (user_id = auth.uid());

create or replace view public.payment_records
with (security_invoker = true)
as
select id, photoshoot_id, purpose, provider, payment_method,
       amount_minor, currency, status, is_test_mode, failure_code,
       created_at, updated_at, paid_at
from public.payments;

revoke all privileges on table public.payments from public, anon, authenticated, service_role;
revoke all privileges on table public.payment_records from public, anon, authenticated, service_role;
grant select (
  id, user_id, photoshoot_id, purpose, provider, payment_method,
  amount_minor, currency, status, is_test_mode, failure_code,
  created_at, updated_at, paid_at
) on public.payments to authenticated;
grant select on public.payment_records to authenticated;
grant select, insert, update on public.payments to service_role;
grant select on public.payment_records to service_role;

revoke all privileges on function public.guard_payment_contract()
  from public, anon, authenticated, service_role;
revoke all privileges on function public.confirm_yookassa_photoshoot_payment(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.confirm_yookassa_photoshoot_payment(uuid) to service_role;

commit;
