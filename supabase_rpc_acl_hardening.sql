-- Explicit API privilege whitelist for Persona and photoshoot lifecycle operations.
-- Apply after supabase_persona_photos_v2_completion.sql.
-- This migration changes only routine bodies and ACLs; it does not change schema data.

begin;

create or replace function public.transition_photoshoot_status(
  p_photoshoot_id uuid,
  p_next_status text,
  p_safe_error text default null
) returns setof public.photoshoots
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_role text := auth.role();
  v_photoshoot public.photoshoots;
begin
  if coalesce(v_role, '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;

  select * into v_photoshoot
  from public.photoshoots
  where id = p_photoshoot_id
    and (v_role = 'service_role' or user_id = v_user)
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'PHOTOSHOOT_NOT_FOUND';
  end if;

  if v_photoshoot.status = p_next_status then
    return next v_photoshoot;
    return;
  end if;

  if not public.is_photoshoot_status_transition_allowed(v_photoshoot.status, p_next_status) then
    raise exception using errcode = '23514', message = 'INVALID_PHOTOSHOOT_STATUS_TRANSITION';
  end if;

  perform set_config('photogen.allow_status_transition', 'on', true);
  update public.photoshoots
  set status = p_next_status,
      safe_error = case when p_next_status = 'failed' then p_safe_error else null end
  where id = p_photoshoot_id
  returning * into v_photoshoot;

  return next v_photoshoot;
end;
$$;

create or replace function public.claim_photoshoot_generation(p_photoshoot_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_role text := auth.role();
  v_claimed boolean := false;
begin
  if coalesce(v_role, '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;

  perform set_config('photogen.allow_status_transition', 'on', true);
  update public.photoshoots
  set status = 'generating'
  where id = p_photoshoot_id
    and status = 'queued'
    and (v_role = 'service_role' or user_id = v_user)
  returning true into v_claimed;

  if v_claimed is null and not exists (
    select 1 from public.photoshoots
    where id = p_photoshoot_id and (v_role = 'service_role' or user_id = v_user)
  ) then
    raise exception using errcode = 'P0002', message = 'PHOTOSHOOT_NOT_FOUND';
  end if;

  return coalesce(v_claimed, false);
end;
$$;

create or replace function public.finish_photoshoot_generation(
  p_photoshoot_id uuid,
  p_succeeded boolean,
  p_safe_error text default null
) returns setof public.photoshoots
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_role text := auth.role();
  v_target_status text := case when p_succeeded then 'completed' else 'failed' end;
  v_photoshoot public.photoshoots;
begin
  if coalesce(v_role, '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;

  select * into v_photoshoot
  from public.photoshoots
  where id = p_photoshoot_id
    and (v_role = 'service_role' or user_id = v_user)
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'PHOTOSHOOT_NOT_FOUND';
  end if;

  if v_photoshoot.status = v_target_status then
    return next v_photoshoot;
    return;
  end if;

  if v_photoshoot.status <> 'generating' then
    raise exception using errcode = '23514', message = 'INVALID_PHOTOSHOOT_STATUS_TRANSITION';
  end if;

  perform set_config('photogen.allow_status_transition', 'on', true);
  update public.photoshoots
  set status = v_target_status,
      safe_error = case when p_succeeded then null else p_safe_error end
  where id = p_photoshoot_id
  returning * into v_photoshoot;

  return next v_photoshoot;
end;
$$;

create or replace function public.record_photoshoot_result_images(
  p_photoshoot_id uuid,
  p_result_images text[]
) returns setof public.photoshoots
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_role text := auth.role();
  v_photoshoot public.photoshoots;
begin
  if coalesce(v_role, '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;

  if exists (
    select 1 from unnest(coalesce(p_result_images, '{}')) image
    where image not like 'photoshoots/generations/' || p_photoshoot_id::text || '/%'
  ) then
    raise exception using errcode = '23514', message = 'INVALID_RESULT_IMAGE_PATH';
  end if;

  update public.photoshoots p
  set result_images = array(
    select distinct image
    from unnest(coalesce(p.result_images, '{}') || coalesce(p_result_images, '{}')) image
    order by image
  )
  where p.id = p_photoshoot_id
    and p.status in ('generating', 'completed')
    and (v_role = 'service_role' or p.user_id = v_user)
  returning * into v_photoshoot;

  if not found then
    raise exception using errcode = 'P0002', message = 'PHOTOSHOOT_NOT_FOUND_OR_NOT_GENERATING';
  end if;

  return next v_photoshoot;
end;
$$;

-- Reset all API-facing table privileges before applying the explicit whitelist.
revoke all privileges on table public.personas from public, anon, authenticated, service_role;
revoke all privileges on table public.persona_photos from public, anon, authenticated, service_role;
revoke all privileges on table public.photoshoots from public, anon, authenticated, service_role;

grant select, update on table public.personas to authenticated;
grant select on table public.persona_photos to authenticated;
grant select on table public.photoshoots to authenticated;
grant select, update on table public.photoshoots to service_role;

-- Reset owner-facing Persona and order RPCs.
revoke all privileges on function public.create_persona(text, integer, integer, text, text)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.update_persona(uuid, text, integer, integer, text, text)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.set_default_persona(uuid)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.delete_persona(uuid)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.add_persona_photo(uuid, text)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.delete_persona_photo(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.reorder_persona_photos(uuid, uuid[])
  from public, anon, authenticated, service_role;
revoke all privileges on function public.create_photoshoot_with_persona(
  uuid, text, text[], text, text, text, text,
  integer, integer, text, text, text, integer, jsonb
) from public, anon, authenticated, service_role;
revoke all privileges on function public.confirm_mock_photoshoot_payment(uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.create_persona(text, integer, integer, text, text)
  to authenticated;
grant execute on function public.set_default_persona(uuid)
  to authenticated;
grant execute on function public.delete_persona(uuid)
  to authenticated;
grant execute on function public.add_persona_photo(uuid, text)
  to authenticated;
grant execute on function public.delete_persona_photo(uuid, uuid)
  to authenticated;
grant execute on function public.reorder_persona_photos(uuid, uuid[])
  to authenticated;
grant execute on function public.create_photoshoot_with_persona(
  uuid, text, text[], text, text, text, text,
  integer, integer, text, text, text, integer, jsonb
) to authenticated;
grant execute on function public.confirm_mock_photoshoot_payment(uuid)
  to authenticated;

-- Internal lifecycle RPCs are callable only by the server-side service role.
revoke all privileges on function public.transition_photoshoot_status(uuid, text, text)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.claim_photoshoot_generation(uuid)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.finish_photoshoot_generation(uuid, boolean, text)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.record_photoshoot_result_images(uuid, text[])
  from public, anon, authenticated, service_role;

grant execute on function public.transition_photoshoot_status(uuid, text, text)
  to service_role;
grant execute on function public.claim_photoshoot_generation(uuid)
  to service_role;
grant execute on function public.finish_photoshoot_generation(uuid, boolean, text)
  to service_role;
grant execute on function public.record_photoshoot_result_images(uuid, text[])
  to service_role;

-- Trigger and invariant helpers must not be called directly through the API.
revoke all privileges on function public.is_photoshoot_status_transition_allowed(text, text)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.set_updated_at()
  from public, anon, authenticated, service_role;
revoke all privileges on function public.guard_persona_protected_fields()
  from public, anon, authenticated, service_role;
revoke all privileges on function public.persona_internal_write_on()
  from public, anon, authenticated, service_role;
revoke all privileges on function public.guard_photoshoot_persona()
  from public, anon, authenticated, service_role;
revoke all privileges on function public.guard_photoshoot_lifecycle()
  from public, anon, authenticated, service_role;

commit;
