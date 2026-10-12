-- Conservative recovery for paid RUB photoshoots whose generation did not reach the provider.
-- Apply after supabase_cloudpayments_direct_rub.sql.

begin;

alter table public.photoshoots
  add column if not exists generation_attempt_id uuid,
  add column if not exists generation_claimed_at timestamptz,
  add column if not exists provider_dispatch_state text;

alter table public.photoshoots
  drop constraint if exists photoshoots_provider_dispatch_state_check,
  add constraint photoshoots_provider_dispatch_state_check check (
    provider_dispatch_state is null
    or provider_dispatch_state in ('not_started', 'dispatching', 'confirmed', 'ambiguous')
  );

create or replace function public.guard_photoshoot_lifecycle()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.package_snapshot is distinct from new.package_snapshot
     or old.requested_images_count is distinct from new.requested_images_count then
    raise exception using errcode = '42501', message = 'PHOTOSHOOT_ORDER_SNAPSHOT_IMMUTABLE';
  end if;

  if old.status is distinct from new.status then
    if coalesce(current_setting('photogen.allow_status_transition', true), '') <> 'on'
       and coalesce(auth.role(), '') <> 'service_role' then
      raise exception using errcode = '42501', message = 'PHOTOSHOOT_STATUS_SPECIALIZED_OPERATION_REQUIRED';
    end if;

    if not public.is_photoshoot_status_transition_allowed(old.status, new.status)
       and not (
         old.status = 'generating'
         and new.status = 'queued'
         and old.payment_source = 'rub'
         and old.provider_dispatch_state = 'not_started'
         and coalesce(auth.role(), '') = 'service_role'
         and coalesce(current_setting('photogen.allow_rub_pre_provider_recovery', true), '') = 'on'
       ) then
      raise exception using errcode = '23514', message = 'INVALID_PHOTOSHOOT_STATUS_TRANSITION';
    end if;

    if new.status = 'completed' then
      new.completed_at = coalesce(new.completed_at, now());
      new.safe_error = null;
    elsif new.status = 'failed' then
      new.safe_error = coalesce(nullif(btrim(new.safe_error), ''), 'Не удалось завершить генерацию. Попробуйте позже.');
    else
      new.completed_at = null;
      new.safe_error = null;
    end if;
  end if;

  return new;
end;
$$;

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
  update public.photoshoots
  set status = 'generating',
      generation_attempt_id = case when v_photoshoot.payment_source = 'rub' then gen_random_uuid() else generation_attempt_id end,
      generation_claimed_at = case when v_photoshoot.payment_source = 'rub' then now() else generation_claimed_at end,
      provider_dispatch_state = case when v_photoshoot.payment_source = 'rub' then 'not_started' else provider_dispatch_state end
  where id = v_photoshoot.id;
  return true;
end $$;

create or replace function public.begin_rub_provider_dispatch(
  p_photoshoot_id uuid, p_generation_attempt_id uuid
) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_photoshoot public.photoshoots;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED'; end if;
  select * into v_photoshoot from public.photoshoots where id = p_photoshoot_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'PHOTOSHOOT_NOT_FOUND'; end if;
  if v_photoshoot.payment_source <> 'rub'
     or v_photoshoot.status <> 'generating'
     or v_photoshoot.generation_attempt_id is distinct from p_generation_attempt_id
     or v_photoshoot.provider_dispatch_state not in ('not_started', 'confirmed') then return false; end if;
  update public.photoshoots set provider_dispatch_state = 'dispatching' where id = v_photoshoot.id;
  return true;
end $$;

create or replace function public.confirm_rub_provider_prediction(
  p_photoshoot_id uuid, p_generation_attempt_id uuid, p_prediction_id text
) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_photoshoot public.photoshoots; v_ids text[];
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED'; end if;
  if nullif(btrim(p_prediction_id), '') is null then raise exception using errcode = '22023', message = 'PREDICTION_ID_REQUIRED'; end if;
  select * into v_photoshoot from public.photoshoots where id = p_photoshoot_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'PHOTOSHOOT_NOT_FOUND'; end if;
  if v_photoshoot.payment_source <> 'rub'
     or v_photoshoot.status <> 'generating'
     or v_photoshoot.generation_attempt_id is distinct from p_generation_attempt_id
     or v_photoshoot.provider_dispatch_state <> 'dispatching' then return false; end if;
  v_ids := array_remove(string_to_array(coalesce(v_photoshoot.generation_id, ''), ','), '');
  if not (btrim(p_prediction_id) = any(v_ids)) then v_ids := array_append(v_ids, btrim(p_prediction_id)); end if;
  update public.photoshoots
  set generation_id = array_to_string(v_ids, ','), provider_dispatch_state = 'confirmed'
  where id = v_photoshoot.id;
  return true;
end $$;

create or replace function public.mark_rub_provider_dispatch_ambiguous(
  p_photoshoot_id uuid, p_generation_attempt_id uuid
) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_updated boolean := false;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED'; end if;
  update public.photoshoots set provider_dispatch_state = 'ambiguous'
  where id = p_photoshoot_id and payment_source = 'rub' and status = 'generating'
    and generation_attempt_id = p_generation_attempt_id and provider_dispatch_state = 'dispatching'
  returning true into v_updated;
  return coalesce(v_updated, false);
end $$;

create or replace function public.recover_rub_generation_pre_provider(p_photoshoot_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_photoshoot public.photoshoots;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED'; end if;
  select * into v_photoshoot from public.photoshoots where id = p_photoshoot_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'PHOTOSHOOT_NOT_FOUND'; end if;
  if v_photoshoot.payment_source <> 'rub'
     or v_photoshoot.status <> 'generating'
     or v_photoshoot.provider_dispatch_state <> 'not_started'
     or v_photoshoot.generation_claimed_at is null
     or v_photoshoot.generation_claimed_at > now() - interval '15 minutes'
     or nullif(btrim(coalesce(v_photoshoot.generation_id, '')), '') is not null
     or coalesce(array_length(v_photoshoot.result_images, 1), 0) <> 0
     or v_photoshoot.payment_id is null
     or not exists (
       select 1 from public.cloudpayments_payments p
       where p.id = v_photoshoot.payment_id and p.purchase_type = 'direct_photoshoot'
         and p.photoshoot_id = v_photoshoot.id and p.user_id = v_photoshoot.user_id
         and p.provider = 'cloudpayments' and p.status = 'succeeded'
     ) then return false; end if;
  perform set_config('photogen.allow_status_transition', 'on', true);
  perform set_config('photogen.allow_rub_pre_provider_recovery', 'on', true);
  update public.photoshoots
  set status = 'queued', generation_attempt_id = null,
      generation_claimed_at = null, provider_dispatch_state = null
  where id = v_photoshoot.id;
  return true;
end $$;

revoke all privileges on function public.begin_rub_provider_dispatch(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.begin_rub_provider_dispatch(uuid, uuid) to service_role;
revoke all privileges on function public.confirm_rub_provider_prediction(uuid, uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.confirm_rub_provider_prediction(uuid, uuid, text) to service_role;
revoke all privileges on function public.mark_rub_provider_dispatch_ambiguous(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.mark_rub_provider_dispatch_ambiguous(uuid, uuid) to service_role;
revoke all privileges on function public.recover_rub_generation_pre_provider(uuid) from public, anon, authenticated, service_role;
grant execute on function public.recover_rub_generation_pre_provider(uuid) to service_role;

commit;
