-- Restore an actual photoshoot charge when generation terminally fails.
begin;

create or replace function public.refund_failed_photoshoot(p_photoshoot_id uuid)
returns public.wallet_transactions
language plpgsql security definer set search_path = public as $$
declare
  v_photoshoot public.photoshoots;
  v_charge public.wallet_transactions;
  v_price_text text;
  v_price bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  select * into v_photoshoot from public.photoshoots
  where id = p_photoshoot_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'PHOTOSHOOT_NOT_FOUND'; end if;
  if v_photoshoot.status <> 'failed' then return null; end if;
  v_price_text := v_photoshoot.package_snapshot->>'price_crystals';
  if v_price_text is null or v_price_text !~ '^[1-9][0-9]*$' then return null; end if;
  v_price := v_price_text::bigint;
  select * into v_charge from public.wallet_transactions
  where idempotency_key = 'photoshoot:' || v_photoshoot.id::text || ':charge'
    and user_id = v_photoshoot.user_id
    and transaction_type = 'debit'
    and delta_crystals = -v_price;
  if not found then return null; end if;
  return public.credit_wallet(
    v_photoshoot.user_id, v_price,
    'photoshoot:' || v_photoshoot.id::text || ':refund',
    'photoshoot_refund', v_photoshoot.id::text,
    jsonb_build_object('photoshoot_id', v_photoshoot.id, 'reason', 'generation_failed')
  );
end $$;

create or replace function public.finish_photoshoot_generation(
  p_photoshoot_id uuid, p_succeeded boolean, p_safe_error text default null
) returns setof public.photoshoots
language plpgsql security definer set search_path = public as $$
declare
  v_target_status text := case when p_succeeded then 'completed' else 'failed' end;
  v_photoshoot public.photoshoots;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  select * into v_photoshoot from public.photoshoots
  where id = p_photoshoot_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'PHOTOSHOOT_NOT_FOUND'; end if;
  if v_photoshoot.status = v_target_status then
    if v_target_status = 'failed' then perform public.refund_failed_photoshoot(v_photoshoot.id); end if;
    return next v_photoshoot; return;
  end if;
  if v_photoshoot.status <> 'generating' then
    raise exception using errcode = '23514', message = 'INVALID_PHOTOSHOOT_STATUS_TRANSITION';
  end if;
  perform set_config('photogen.allow_status_transition', 'on', true);
  update public.photoshoots set status = v_target_status,
    safe_error = case when p_succeeded then null else p_safe_error end
  where id = p_photoshoot_id returning * into v_photoshoot;
  if not p_succeeded then perform public.refund_failed_photoshoot(v_photoshoot.id); end if;
  return next v_photoshoot;
end $$;

revoke all privileges on function public.refund_failed_photoshoot(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.refund_failed_photoshoot(uuid) to service_role;
revoke all privileges on function public.finish_photoshoot_generation(uuid, boolean, text)
  from public, anon, authenticated, service_role;
grant execute on function public.finish_photoshoot_generation(uuid, boolean, text) to service_role;
commit;
