begin;

create or replace function public.is_photoshoot_safe_to_cancel(p_photoshoot_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_photoshoot public.photoshoots;
  v_has_payment_link boolean := false;
  v_has_payment_obligation boolean := false;
begin
  if auth.uid() is null then
    return false;
  end if;

  select * into v_photoshoot
  from public.photoshoots
  where id = p_photoshoot_id and user_id = auth.uid();

  if not found
     or v_photoshoot.status not in ('pending', 'awaiting_payment')
     or v_photoshoot.training_id is not null
     or v_photoshoot.lora_url is not null
     or v_photoshoot.generation_id is not null
     or cardinality(coalesce(v_photoshoot.result_images, '{}')) <> 0
     or exists (
       select 1 from public.wallet_transactions
       where transaction_type = 'debit'
         and (reference_id = p_photoshoot_id::text
           or idempotency_key = 'photoshoot:' || p_photoshoot_id::text || ':charge')
     ) then
    return false;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'photoshoots' and column_name = 'payment_id'
  ) then
    execute 'select payment_id is not null from public.photoshoots where id = $1'
      into v_has_payment_link using p_photoshoot_id;
  end if;

  if to_regclass('public.payments') is not null then
    execute $query$
      select exists (
        select 1 from public.payments
        where photoshoot_id = $1 and status <> 'canceled'
      )
    $query$ into v_has_payment_obligation using p_photoshoot_id;
  end if;

  return not coalesce(v_has_payment_link, false)
    and not coalesce(v_has_payment_obligation, false);
end;
$$;

create or replace function public.cancel_unstarted_photoshoot(p_photoshoot_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_photoshoot public.photoshoots;
  v_has_payment_link boolean := false;
  v_has_payment_obligation boolean := false;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;

  select * into v_photoshoot
  from public.photoshoots
  where id = p_photoshoot_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'PHOTOSHOOT_NOT_FOUND';
  end if;

  if v_photoshoot.status not in ('pending', 'awaiting_payment')
     or v_photoshoot.training_id is not null
     or v_photoshoot.lora_url is not null
     or v_photoshoot.generation_id is not null
     or cardinality(coalesce(v_photoshoot.result_images, '{}')) <> 0
     or exists (
       select 1 from public.wallet_transactions
       where transaction_type = 'debit'
         and (reference_id = p_photoshoot_id::text
           or idempotency_key = 'photoshoot:' || p_photoshoot_id::text || ':charge')
     ) then
    return false;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'photoshoots' and column_name = 'payment_id'
  ) then
    execute 'select payment_id is not null from public.photoshoots where id = $1'
      into v_has_payment_link using p_photoshoot_id;
  end if;

  if to_regclass('public.payments') is not null then
    execute $query$
      select exists (
        select 1 from public.payments
        where photoshoot_id = $1 and status <> 'canceled'
      )
    $query$ into v_has_payment_obligation using p_photoshoot_id;
  end if;

  if coalesce(v_has_payment_link, false) or coalesce(v_has_payment_obligation, false) then
    return false;
  end if;

  perform set_config('photogen.allow_status_transition', 'on', true);
  update public.photoshoots
  set status = 'cancelled'
  where id = p_photoshoot_id;
  return true;
end;
$$;

revoke all privileges on function public.is_photoshoot_safe_to_cancel(uuid)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.cancel_unstarted_photoshoot(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.is_photoshoot_safe_to_cancel(uuid) to authenticated;
grant execute on function public.cancel_unstarted_photoshoot(uuid) to authenticated;

commit;
