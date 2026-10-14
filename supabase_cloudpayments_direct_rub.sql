-- Direct RUB payments through CloudPayments.
-- Apply after supabase_pending_action_lifecycle.sql,
-- supabase_photoshoot_crystal_charge.sql and supabase_failed_generation_refund.sql.

begin;

alter table public.photoshoots
  add column if not exists payment_source text,
  add column if not exists payment_id uuid;

alter table public.photoshoots
  drop constraint if exists photoshoots_payment_source_check,
  add constraint photoshoots_payment_source_check
    check (payment_source is null or payment_source in ('crystals', 'rub'));

create table if not exists public.cloudpayments_payments (
  id uuid primary key default gen_random_uuid(),
  purchase_type text not null default 'direct_photoshoot'
    check (purchase_type in ('direct_photoshoot', 'crystal_topup')),
  photoshoot_id uuid unique references public.photoshoots(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  provider text not null default 'cloudpayments' check (provider = 'cloudpayments'),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency = 'RUB'),
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  provider_transaction_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  failed_at timestamptz,
  constraint cloudpayments_purchase_target_check check (
    (purchase_type = 'direct_photoshoot' and photoshoot_id is not null)
    or (purchase_type = 'crystal_topup' and photoshoot_id is null)
  )
);

alter table public.photoshoots
  drop constraint if exists photoshoots_payment_id_fkey,
  add constraint photoshoots_payment_id_fkey
    foreign key (payment_id) references public.cloudpayments_payments(id) on delete restrict;

alter table public.cloudpayments_payments enable row level security;
drop policy if exists cloudpayments_payments_select_own on public.cloudpayments_payments;
create policy cloudpayments_payments_select_own
  on public.cloudpayments_payments for select to authenticated
  using (user_id = auth.uid());

revoke all on table public.cloudpayments_payments from public, anon, authenticated;
grant select on table public.cloudpayments_payments to authenticated;

create or replace function public.guard_photoshoot_payment_linkage()
returns trigger language plpgsql set search_path = public as $$
begin
  if (old.payment_source is distinct from new.payment_source
      or old.payment_id is distinct from new.payment_id)
     and coalesce(current_setting('photogen.allow_payment_linkage', true), '') <> 'on'
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'PAYMENT_LINKAGE_TRUSTED_OPERATION_REQUIRED';
  end if;
  return new;
end $$;
revoke all privileges on function public.guard_photoshoot_payment_linkage()
  from public, anon, authenticated, service_role;


drop trigger if exists guard_photoshoot_payment_linkage on public.photoshoots;
create trigger guard_photoshoot_payment_linkage
before update of payment_source, payment_id on public.photoshoots
for each row execute function public.guard_photoshoot_payment_linkage();

drop function if exists public.create_cloudpayments_payment(uuid);

create or replace function public.create_cloudpayments_payment(
  p_photoshoot_id uuid,
  p_user_id uuid
)
returns public.cloudpayments_payments
language plpgsql security definer set search_path = public as $$
declare
  v_photoshoot public.photoshoots;
  v_payment public.cloudpayments_payments;
  v_price_text text;
  v_amount_minor bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  if p_user_id is null then
    raise exception using errcode = '22023', message = 'USER_REQUIRED';
  end if;

  select * into v_photoshoot from public.photoshoots
  where id = p_photoshoot_id and user_id = p_user_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'PHOTOSHOOT_NOT_FOUND'; end if;
  if v_photoshoot.status <> 'awaiting_payment' then
    raise exception using errcode = '23514', message = 'PHOTOSHOOT_NOT_AWAITING_PAYMENT';
  end if;

  v_price_text := v_photoshoot.package_snapshot->>'price_rub';
  if v_price_text is null or v_price_text !~ '^[1-9][0-9]*$' then
    raise exception using errcode = '23514', message = 'INVALID_RUB_PRICE';
  end if;
  v_amount_minor := v_price_text::bigint * 100;

  select * into v_payment from public.cloudpayments_payments
  where purchase_type = 'direct_photoshoot'
    and photoshoot_id = v_photoshoot.id for update;

  if found then
    if v_payment.user_id is distinct from p_user_id
       or v_payment.provider <> 'cloudpayments'
       or v_payment.amount_minor <> v_amount_minor
       or v_payment.currency <> 'RUB' then
      raise exception using errcode = '23514', message = 'PAYMENT_REUSE_CONTRACT_MISMATCH';
    end if;
    if v_payment.status = 'succeeded' then
      raise exception using errcode = '23505', message = 'PAYMENT_ALREADY_SUCCEEDED';
    end if;
    if v_payment.status = 'pending' then
      if v_payment.provider_transaction_id is not null or v_payment.paid_at is not null then
        raise exception using errcode = '23514', message = 'PAYMENT_REUSE_STATE_INVALID';
      end if;
    elsif v_payment.status = 'failed' then
      perform set_config('photogen.allow_payment_linkage', 'on', true);
      update public.photoshoots set payment_id = null where id = v_photoshoot.id;
      update public.cloudpayments_payments
      set id = gen_random_uuid(), status = 'pending', provider_transaction_id = null,
          amount_minor = v_amount_minor, currency = 'RUB', paid_at = null,
          failed_at = null, updated_at = now()
      where id = v_payment.id returning * into v_payment;
    end if;
  else
    insert into public.cloudpayments_payments(photoshoot_id, user_id, amount_minor, currency)
    values (v_photoshoot.id, p_user_id, v_amount_minor, 'RUB')
    returning * into v_payment;
  end if;

  perform set_config('photogen.allow_payment_linkage', 'on', true);
  update public.photoshoots
  set payment_source = 'rub', payment_id = v_payment.id
  where id = v_photoshoot.id;

  perform set_config('photogen.allow_payment_linkage', 'off', true);
  return v_payment;
end $$;

create or replace function public.process_cloudpayments_notification(
  p_notification_type text,
  p_invoice_id uuid,
  p_provider_transaction_id text,
  p_amount_minor bigint,
  p_currency text
) returns table(
  accepted boolean,
  should_start_generation boolean,
  photoshoot_id uuid,
  result_code text
)
language plpgsql security definer set search_path = public as $$
declare
  v_payment public.cloudpayments_payments;
  v_photoshoot public.photoshoots;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  if p_notification_type is null
     or p_notification_type not in ('check', 'pay', 'fail') then
    raise exception using errcode = '22023', message = 'INVALID_NOTIFICATION_TYPE';
  end if;
  if p_invoice_id is null then
    raise exception using errcode = '22004', message = 'INVOICE_REQUIRED';
  end if;
  if p_amount_minor is null then
    raise exception using errcode = '22004', message = 'AMOUNT_REQUIRED';
  end if;
  if p_currency is null or nullif(btrim(p_currency), '') is null then
    raise exception using errcode = '22004', message = 'CURRENCY_REQUIRED';
  end if;
  if p_notification_type = 'pay'
     and (p_provider_transaction_id is null
          or nullif(btrim(p_provider_transaction_id), '') is null) then
    raise exception using errcode = '22004', message = 'TRANSACTION_ID_REQUIRED';
  end if;

  select * into v_payment from public.cloudpayments_payments
  where id = p_invoice_id for update;
  if not found then return query select false, false, null::uuid, 'PAYMENT_NOT_FOUND'; return; end if;

  select * into v_photoshoot from public.photoshoots
  where id = v_payment.photoshoot_id for update;

  if not found
     or v_payment.purchase_type <> 'direct_photoshoot'
     or v_photoshoot.payment_source <> 'rub'
     or v_photoshoot.payment_id <> v_payment.id
     or v_payment.provider <> 'cloudpayments'
     or v_payment.amount_minor <> p_amount_minor
     or v_payment.currency <> upper(p_currency) then
    return query select false, false, v_payment.photoshoot_id, 'PAYMENT_CONTRACT_MISMATCH'; return;
  end if;

  if p_notification_type = 'check' then
    return query select (v_payment.status <> 'succeeded'), false, v_photoshoot.id,
      case when v_payment.status = 'succeeded' then 'PAYMENT_ALREADY_SUCCEEDED' else 'OK' end;
    return;
  end if;

  if p_notification_type = 'fail' then
    if v_payment.status <> 'succeeded' then
      update public.cloudpayments_payments
      set status = 'failed',
          provider_transaction_id = coalesce(
            provider_transaction_id,
            nullif(btrim(p_provider_transaction_id), '')
          ),
          failed_at = now(), updated_at = now()
      where id = v_payment.id;
    end if;
    return query select true, false, v_photoshoot.id, 'OK'; return;
  end if;

  if v_payment.status = 'succeeded' then
    if v_payment.provider_transaction_id is distinct from p_provider_transaction_id then
      return query select false, false, v_photoshoot.id, 'DUPLICATE_PAYMENT_CONFLICT'; return;
    end if;
    return query select true, false, v_photoshoot.id, 'OK'; return;
  end if;

  if v_photoshoot.status <> 'awaiting_payment' then
    return query select false, false, v_photoshoot.id, 'INVALID_PHOTOSHOOT_STATUS'; return;
  end if;

  update public.cloudpayments_payments
  set status = 'succeeded', provider_transaction_id = p_provider_transaction_id,
      paid_at = now(), failed_at = null, updated_at = now()
  where id = v_payment.id;

  perform set_config('photogen.allow_status_transition', 'on', true);
  update public.photoshoots set status = 'paid' where id = v_photoshoot.id;
  update public.photoshoots set status = 'queued' where id = v_photoshoot.id;

  return query select true, true, v_photoshoot.id, 'OK';
end $$;

create or replace function public.confirm_mock_photoshoot_payment(p_photoshoot_id uuid)
returns setof public.photoshoots
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_photoshoot public.photoshoots;
begin
  if v_user is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  select * into v_photoshoot from public.photoshoots
  where id = p_photoshoot_id and user_id = v_user for update;
  if not found then raise exception using errcode = 'P0002', message = 'PHOTOSHOOT_NOT_FOUND'; end if;
  if v_photoshoot.payment_source = 'rub' or v_photoshoot.payment_id is not null then
    raise exception using errcode = '42501', message = 'MOCK_PAYMENT_FOR_RUB_FORBIDDEN';
  end if;
  perform set_config('photogen.allow_status_transition', 'on', true);
  perform set_config('photogen.allow_payment_linkage', 'on', true);
  if v_photoshoot.status = 'pending' then
    update public.photoshoots set status = 'awaiting_payment' where id = p_photoshoot_id;
    v_photoshoot.status := 'awaiting_payment';
  end if;
  if v_photoshoot.status = 'awaiting_payment' then
    update public.photoshoots set status = 'paid', payment_source = coalesce(payment_source, 'crystals')
    where id = p_photoshoot_id;
    v_photoshoot.status := 'paid';
  end if;
  if v_photoshoot.status = 'paid' then
    update public.photoshoots set status = 'queued' where id = p_photoshoot_id returning * into v_photoshoot;
  else
    select * into v_photoshoot from public.photoshoots where id = p_photoshoot_id;
  end if;
  perform set_config('photogen.allow_payment_linkage', 'off', true);
  return next v_photoshoot;
end $$;

create or replace function public.claim_photoshoot_generation(p_photoshoot_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_photoshoot public.photoshoots;
  v_price_text text;
  v_price_crystals bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  select * into v_photoshoot from public.photoshoots where id = p_photoshoot_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'PHOTOSHOOT_NOT_FOUND'; end if;
  if v_photoshoot.status <> 'queued' then return false; end if;

  if v_photoshoot.payment_source = 'rub' then
    if v_photoshoot.payment_id is null or not exists (
      select 1 from public.cloudpayments_payments p
      where p.id = v_photoshoot.payment_id
        and p.purchase_type = 'direct_photoshoot'
        and p.photoshoot_id = v_photoshoot.id
        and p.user_id = v_photoshoot.user_id
        and p.provider = 'cloudpayments'
        and p.status = 'succeeded'
    ) then
      raise exception using errcode = '42501', message = 'RUB_PAYMENT_NOT_CONFIRMED';
    end if;
  else
    v_price_text := v_photoshoot.package_snapshot->>'price_crystals';
    if v_price_text is null or v_price_text !~ '^[1-9][0-9]*$' then
      raise exception using errcode = '23514', message = 'INVALID_CRYSTAL_PRICE';
    end if;
    v_price_crystals := v_price_text::bigint;
    perform public.debit_wallet(
      v_photoshoot.user_id, v_price_crystals,
      'photoshoot:' || v_photoshoot.id::text || ':charge',
      'photoshoot', v_photoshoot.id::text,
      jsonb_build_object('photoshoot_id', v_photoshoot.id)
    );
  end if;

  perform set_config('photogen.allow_status_transition', 'on', true);
  update public.photoshoots set status = 'generating' where id = v_photoshoot.id;
  return true;
end $$;

revoke all privileges on function public.create_cloudpayments_payment(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.create_cloudpayments_payment(uuid, uuid) to service_role;
revoke all privileges on function public.process_cloudpayments_notification(text, uuid, text, bigint, text)
  from public, anon, authenticated, service_role;
grant execute on function public.process_cloudpayments_notification(text, uuid, text, bigint, text) to service_role;
revoke all privileges on function public.confirm_mock_photoshoot_payment(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.confirm_mock_photoshoot_payment(uuid) to authenticated;
revoke all privileges on function public.claim_photoshoot_generation(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_photoshoot_generation(uuid) to service_role;

commit;
