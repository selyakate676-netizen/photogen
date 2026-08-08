-- Charge the immutable order crystal price when a queued photoshoot is claimed.
-- Apply after supabase_crystal_wallet.sql and supabase_rpc_acl_hardening.sql.

begin;

create or replace function public.claim_photoshoot_generation(p_photoshoot_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := auth.role();
  v_photoshoot public.photoshoots;
  v_price_text text;
  v_price_crystals bigint;
begin
  if coalesce(v_role, '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;

  select * into v_photoshoot
  from public.photoshoots
  where id = p_photoshoot_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'PHOTOSHOOT_NOT_FOUND';
  end if;

  if v_photoshoot.status <> 'queued' then
    return false;
  end if;

  v_price_text := v_photoshoot.package_snapshot->>'price_crystals';
  if v_price_text is null or v_price_text !~ '^[1-9][0-9]*$' then
    raise exception using errcode = '23514', message = 'INVALID_CRYSTAL_PRICE';
  end if;
  v_price_crystals := v_price_text::bigint;

  perform public.debit_wallet(
    v_photoshoot.user_id,
    v_price_crystals,
    'photoshoot:' || v_photoshoot.id::text || ':charge',
    'photoshoot',
    v_photoshoot.id::text,
    jsonb_build_object('photoshoot_id', v_photoshoot.id)
  );

  perform set_config('photogen.allow_status_transition', 'on', true);
  update public.photoshoots
  set status = 'generating'
  where id = v_photoshoot.id;

  return true;
end;
$$;

revoke all privileges on function public.claim_photoshoot_generation(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_photoshoot_generation(uuid)
  to service_role;

commit;
