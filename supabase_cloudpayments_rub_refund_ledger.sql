-- Internal ledger for manually processed full RUB refunds in CloudPayments.
-- Apply after supabase_cloudpayments_rub_generation_recovery.sql.

begin;

create table if not exists public.cloudpayments_rub_refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.cloudpayments_payments(id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency = 'RUB'),
  original_provider_transaction_id text not null check (btrim(original_provider_transaction_id) <> ''),
  refund_transaction_id text,
  status text not null check (status in ('intent', 'pending', 'succeeded', 'failed', 'generation_released')),
  reason text not null check (btrim(reason) <> ''),
  failure_reason text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint cloudpayments_rub_refunds_completion_check check (
    (status in ('intent', 'pending') and completed_at is null and failure_reason is null)
    or (status = 'succeeded' and completed_at is not null and refund_transaction_id is not null and failure_reason is null)
    or (status in ('failed', 'generation_released') and completed_at is not null and failure_reason is not null and btrim(failure_reason) <> '')
  ),
  constraint cloudpayments_rub_refunds_refund_transaction_check check (
    refund_transaction_id is null or btrim(refund_transaction_id) <> ''
  )
);

create unique index if not exists cloudpayments_rub_refunds_one_live_per_payment_idx
  on public.cloudpayments_rub_refunds(payment_id)
  where status in ('intent', 'pending', 'succeeded');

create unique index if not exists cloudpayments_rub_refunds_provider_transaction_idx
  on public.cloudpayments_rub_refunds(refund_transaction_id)
  where refund_transaction_id is not null;

create index if not exists cloudpayments_rub_refunds_status_requested_idx
  on public.cloudpayments_rub_refunds(status, requested_at);

alter table public.cloudpayments_rub_refunds enable row level security;
revoke all privileges on table public.cloudpayments_rub_refunds from public, anon, authenticated, service_role;
grant select on table public.cloudpayments_rub_refunds to service_role;

create or replace function public.register_cloudpayments_rub_refund_intent(
  p_payment_id uuid,
  p_amount_minor bigint,
  p_reason text
) returns public.cloudpayments_rub_refunds
language plpgsql security definer set search_path = public as $$
declare
  v_payment public.cloudpayments_payments;
  v_photoshoot public.photoshoots;
  v_existing public.cloudpayments_rub_refunds;
  v_refund public.cloudpayments_rub_refunds;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  if p_payment_id is null then raise exception using errcode = '22004', message = 'PAYMENT_ID_REQUIRED'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 then raise exception using errcode = '22023', message = 'INVALID_REFUND_AMOUNT'; end if;
  if nullif(btrim(p_reason), '') is null then raise exception using errcode = '22023', message = 'REFUND_REASON_REQUIRED'; end if;

  select * into v_payment
  from public.cloudpayments_payments
  where id = p_payment_id
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'PAYMENT_NOT_FOUND'; end if;

  if v_payment.provider <> 'cloudpayments'
     or v_payment.purchase_type <> 'direct_photoshoot'
     or v_payment.status <> 'succeeded'
     or v_payment.currency <> 'RUB'
     or v_payment.photoshoot_id is null
     or nullif(btrim(coalesce(v_payment.provider_transaction_id, '')), '') is null then
    raise exception using errcode = '23514', message = 'PAYMENT_NOT_REFUNDABLE';
  end if;
  if p_amount_minor <> v_payment.amount_minor then
    raise exception using errcode = '23514', message = 'FULL_REFUND_AMOUNT_MISMATCH';
  end if;

  select * into v_photoshoot
  from public.photoshoots
  where id = v_payment.photoshoot_id
    and payment_id = v_payment.id
    and user_id = v_payment.user_id
    and payment_source = 'rub'
  for update;
  if not found then raise exception using errcode = '23514', message = 'PAYMENT_PHOTOSHOOT_LINK_INVALID'; end if;

  select * into v_existing
  from public.cloudpayments_rub_refunds
  where payment_id = v_payment.id
    and status in ('intent', 'pending', 'succeeded')
  order by requested_at desc
  limit 1;
  if found then
    if v_existing.amount_minor = p_amount_minor
       and v_existing.currency = v_payment.currency
       and v_existing.original_provider_transaction_id = v_payment.provider_transaction_id then
      return v_existing;
    end if;
    raise exception using errcode = '23505', message = 'ACTIVE_OR_SUCCEEDED_REFUND_EXISTS';
  end if;

  if v_photoshoot.status in ('completed', 'cancelled') then
    raise exception using errcode = '55000', message = 'REFUND_BLOCKED_PHOTOSHOOT_STATE';
  end if;
  if v_photoshoot.status = 'generating' and (
       v_photoshoot.provider_dispatch_state is distinct from 'not_started'
       or nullif(btrim(coalesce(v_photoshoot.generation_id, '')), '') is not null
       or coalesce(array_length(v_photoshoot.result_images, 1), 0) <> 0
     ) then
    raise exception using errcode = '55000', message = 'REFUND_BLOCKED_PROVIDER_RECONCILIATION_REQUIRED';
  end if;
  if v_photoshoot.status not in ('queued', 'generating', 'failed') then
    raise exception using errcode = '55000', message = 'REFUND_BLOCKED_PHOTOSHOOT_STATE';
  end if;

  insert into public.cloudpayments_rub_refunds (
    payment_id, amount_minor, currency, original_provider_transaction_id, status, reason
  ) values (
    v_payment.id, p_amount_minor, v_payment.currency, v_payment.provider_transaction_id, 'intent', btrim(p_reason)
  ) returning * into v_refund;
  return v_refund;
end $$;

create or replace function public.record_cloudpayments_rub_refund_pending(
  p_refund_id uuid,
  p_refund_transaction_id text default null
) returns public.cloudpayments_rub_refunds
language plpgsql security definer set search_path = public as $$
declare v_refund public.cloudpayments_rub_refunds; v_transaction_id text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED'; end if;
  select * into v_refund from public.cloudpayments_rub_refunds where id = p_refund_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'REFUND_NOT_FOUND'; end if;
  v_transaction_id := nullif(btrim(p_refund_transaction_id), '');
  if v_refund.status = 'pending' and (v_transaction_id is null or v_refund.refund_transaction_id = v_transaction_id) then return v_refund; end if;
  if v_refund.status <> 'intent' then raise exception using errcode = '55000', message = 'INVALID_REFUND_TRANSITION'; end if;
  if v_refund.refund_transaction_id is not null and v_transaction_id is distinct from v_refund.refund_transaction_id then
    raise exception using errcode = '23514', message = 'REFUND_TRANSACTION_ID_MISMATCH';
  end if;
  update public.cloudpayments_rub_refunds
  set status = 'pending', refund_transaction_id = coalesce(v_refund.refund_transaction_id, v_transaction_id)
  where id = v_refund.id returning * into v_refund;
  return v_refund;
end $$;

create or replace function public.confirm_cloudpayments_rub_refund_succeeded(
  p_refund_id uuid,
  p_refund_transaction_id text
) returns public.cloudpayments_rub_refunds
language plpgsql security definer set search_path = public as $$
declare v_refund public.cloudpayments_rub_refunds; v_transaction_id text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED'; end if;
  v_transaction_id := nullif(btrim(p_refund_transaction_id), '');
  if v_transaction_id is null then raise exception using errcode = '22023', message = 'REFUND_TRANSACTION_ID_REQUIRED'; end if;
  select * into v_refund from public.cloudpayments_rub_refunds where id = p_refund_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'REFUND_NOT_FOUND'; end if;
  if v_refund.status = 'succeeded' and v_refund.refund_transaction_id = v_transaction_id then return v_refund; end if;
  if v_refund.status not in ('intent', 'pending') then raise exception using errcode = '55000', message = 'INVALID_REFUND_TRANSITION'; end if;
  if v_refund.refund_transaction_id is not null and v_refund.refund_transaction_id <> v_transaction_id then
    raise exception using errcode = '23514', message = 'REFUND_TRANSACTION_ID_MISMATCH';
  end if;
  update public.cloudpayments_rub_refunds
  set status = 'succeeded', refund_transaction_id = v_transaction_id, completed_at = now()
  where id = v_refund.id returning * into v_refund;
  return v_refund;
end $$;

create or replace function public.record_cloudpayments_rub_refund_failed(
  p_refund_id uuid,
  p_failure_reason text
) returns public.cloudpayments_rub_refunds
language plpgsql security definer set search_path = public as $$
declare v_refund public.cloudpayments_rub_refunds; v_failure_reason text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED'; end if;
  v_failure_reason := nullif(btrim(p_failure_reason), '');
  if v_failure_reason is null then raise exception using errcode = '22023', message = 'REFUND_FAILURE_REASON_REQUIRED'; end if;
  select * into v_refund from public.cloudpayments_rub_refunds where id = p_refund_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'REFUND_NOT_FOUND'; end if;
  if v_refund.status = 'failed' and v_refund.failure_reason = v_failure_reason then return v_refund; end if;
  if v_refund.status not in ('intent', 'pending') then raise exception using errcode = '55000', message = 'INVALID_REFUND_TRANSITION'; end if;
  update public.cloudpayments_rub_refunds
  set status = 'failed', failure_reason = v_failure_reason, completed_at = now()
  where id = v_refund.id returning * into v_refund;
  return v_refund;
end $$;

create or replace function public.release_cloudpayments_rub_refund_generation(
  p_refund_id uuid
) returns public.cloudpayments_rub_refunds
language plpgsql security definer set search_path = public as $$
declare v_refund public.cloudpayments_rub_refunds;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED'; end if;
  select * into v_refund from public.cloudpayments_rub_refunds where id = p_refund_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'REFUND_NOT_FOUND'; end if;
  if v_refund.status = 'generation_released' then return v_refund; end if;
  if v_refund.status <> 'failed' then raise exception using errcode = '55000', message = 'REFUND_GENERATION_RELEASE_NOT_ALLOWED'; end if;
  update public.cloudpayments_rub_refunds
  set status = 'generation_released'
  where id = v_refund.id returning * into v_refund;
  return v_refund;
end $$;

-- Replace the generation gates so a committed refund intent is a hard fence.
create or replace function public.claim_photoshoot_generation(p_photoshoot_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_photoshoot public.photoshoots;
  v_price_text text;
  v_price_crystals bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED'; end if;
  select * into v_photoshoot from public.photoshoots where id = p_photoshoot_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'PHOTOSHOOT_NOT_FOUND'; end if;
  if v_photoshoot.status <> 'queued' then return false; end if;
  if v_photoshoot.payment_source = 'rub' then
    if v_photoshoot.payment_id is null or not exists (
      select 1 from public.cloudpayments_payments p
      where p.id = v_photoshoot.payment_id and p.purchase_type = 'direct_photoshoot'
        and p.photoshoot_id = v_photoshoot.id and p.user_id = v_photoshoot.user_id
        and p.provider = 'cloudpayments' and p.status = 'succeeded'
    ) then raise exception using errcode = '42501', message = 'RUB_PAYMENT_NOT_CONFIRMED'; end if;
    if exists (
      select 1 from public.cloudpayments_rub_refunds r
      where r.payment_id = v_photoshoot.payment_id and r.status in ('intent', 'pending', 'succeeded', 'failed')
    ) then raise exception using errcode = '55000', message = 'RUB_REFUND_ACTIVE'; end if;
  else
    v_price_text := v_photoshoot.package_snapshot->>'price_crystals';
    if v_price_text is null or v_price_text !~ '^[1-9][0-9]*$' then raise exception using errcode = '23514', message = 'INVALID_CRYSTAL_PRICE'; end if;
    v_price_crystals := v_price_text::bigint;
    perform public.debit_wallet(v_photoshoot.user_id, v_price_crystals,
      'photoshoot:' || v_photoshoot.id::text || ':charge', 'photoshoot', v_photoshoot.id::text,
      jsonb_build_object('photoshoot_id', v_photoshoot.id));
  end if;
  perform set_config('photogen.allow_status_transition', 'on', true);
  update public.photoshoots set status = 'generating',
    generation_attempt_id = case when v_photoshoot.payment_source = 'rub' then gen_random_uuid() else generation_attempt_id end,
    generation_claimed_at = case when v_photoshoot.payment_source = 'rub' then now() else generation_claimed_at end,
    provider_dispatch_state = case when v_photoshoot.payment_source = 'rub' then 'not_started' else provider_dispatch_state end
  where id = v_photoshoot.id;
  return true;
end $$;

create or replace function public.begin_rub_provider_dispatch(p_photoshoot_id uuid, p_generation_attempt_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_photoshoot public.photoshoots;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED'; end if;
  select * into v_photoshoot from public.photoshoots where id = p_photoshoot_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'PHOTOSHOOT_NOT_FOUND'; end if;
  if v_photoshoot.payment_source <> 'rub' or v_photoshoot.status <> 'generating'
     or v_photoshoot.generation_attempt_id is distinct from p_generation_attempt_id
     or v_photoshoot.provider_dispatch_state not in ('not_started', 'confirmed') then return false; end if;
  if exists (
    select 1 from public.cloudpayments_rub_refunds r
    where r.payment_id = v_photoshoot.payment_id and r.status in ('intent', 'pending', 'succeeded', 'failed')
  ) then return false; end if;
  update public.photoshoots set provider_dispatch_state = 'dispatching' where id = v_photoshoot.id;
  return true;
end $$;

create or replace function public.recover_rub_generation_pre_provider(p_photoshoot_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_photoshoot public.photoshoots;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED'; end if;
  select * into v_photoshoot from public.photoshoots where id = p_photoshoot_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'PHOTOSHOOT_NOT_FOUND'; end if;
  if v_photoshoot.payment_source <> 'rub' or v_photoshoot.status <> 'generating'
     or v_photoshoot.provider_dispatch_state <> 'not_started'
     or v_photoshoot.generation_claimed_at is null
     or v_photoshoot.generation_claimed_at > now() - interval '15 minutes'
     or nullif(btrim(coalesce(v_photoshoot.generation_id, '')), '') is not null
     or coalesce(array_length(v_photoshoot.result_images, 1), 0) <> 0
     or v_photoshoot.payment_id is null
     or not exists (
       select 1 from public.cloudpayments_payments p where p.id = v_photoshoot.payment_id
         and p.purchase_type = 'direct_photoshoot' and p.photoshoot_id = v_photoshoot.id
         and p.user_id = v_photoshoot.user_id and p.provider = 'cloudpayments' and p.status = 'succeeded'
     )
     or exists (
       select 1 from public.cloudpayments_rub_refunds r where r.payment_id = v_photoshoot.payment_id
         and r.status in ('intent', 'pending', 'succeeded', 'failed')
     ) then return false; end if;
  perform set_config('photogen.allow_status_transition', 'on', true);
  perform set_config('photogen.allow_rub_pre_provider_recovery', 'on', true);
  update public.photoshoots set status = 'queued', generation_attempt_id = null,
    generation_claimed_at = null, provider_dispatch_state = null where id = v_photoshoot.id;
  return true;
end $$;

revoke all privileges on function public.register_cloudpayments_rub_refund_intent(uuid, bigint, text) from public, anon, authenticated, service_role;
grant execute on function public.register_cloudpayments_rub_refund_intent(uuid, bigint, text) to service_role;
revoke all privileges on function public.record_cloudpayments_rub_refund_pending(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.record_cloudpayments_rub_refund_pending(uuid, text) to service_role;
revoke all privileges on function public.confirm_cloudpayments_rub_refund_succeeded(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.confirm_cloudpayments_rub_refund_succeeded(uuid, text) to service_role;
revoke all privileges on function public.record_cloudpayments_rub_refund_failed(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.record_cloudpayments_rub_refund_failed(uuid, text) to service_role;
revoke all privileges on function public.release_cloudpayments_rub_refund_generation(uuid) from public, anon, authenticated, service_role;
grant execute on function public.release_cloudpayments_rub_refund_generation(uuid) to service_role;

commit;
