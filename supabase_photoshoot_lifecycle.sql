-- Sprint 2: reliable photoshoot lifecycle, idempotent mock payment and generation claim.
-- Apply after supabase_persona_appearance.sql.

begin;

alter table public.photoshoots
  add column if not exists safe_error text,
  add column if not exists requested_images_count integer,
  add column if not exists package_snapshot jsonb,
  add column if not exists completed_at timestamptz;

alter table public.photoshoots
  drop constraint if exists photoshoots_status_check;

-- Normalize the two legacy runtime states before replacing the old status check.
update public.photoshoots
set status = case status
  when 'training' then 'generating'
  when 'error' then 'failed'
  else status
end,
safe_error = case
  when status = 'error' then coalesce(safe_error, 'Не удалось завершить генерацию. Попробуйте позже.')
  else safe_error
end
where status in ('training', 'error');

alter table public.photoshoots
  drop constraint if exists photoshoots_requested_images_count_check,
  add constraint photoshoots_status_check check (
    status in ('pending', 'awaiting_payment', 'paid', 'queued', 'generating', 'completed', 'failed', 'cancelled')
  ),
  add constraint photoshoots_requested_images_count_check check (
    requested_images_count is null or requested_images_count between 1 and 20
  );

create or replace function public.is_photoshoot_status_transition_allowed(p_from text, p_to text)
returns boolean
language sql
immutable
as $$
  select p_from = p_to or (p_from, p_to) in (
    ('pending', 'awaiting_payment'),
    ('pending', 'cancelled'),
    ('awaiting_payment', 'paid'),
    ('awaiting_payment', 'cancelled'),
    ('paid', 'queued'),
    ('paid', 'cancelled'),
    ('queued', 'generating'),
    ('queued', 'cancelled'),
    ('generating', 'completed'),
    ('generating', 'failed')
  );
$$;

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

    if not public.is_photoshoot_status_transition_allowed(old.status, new.status) then
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

drop trigger if exists guard_photoshoot_lifecycle on public.photoshoots;
create trigger guard_photoshoot_lifecycle
before update on public.photoshoots
for each row execute function public.guard_photoshoot_lifecycle();

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

create or replace function public.confirm_mock_photoshoot_payment(p_photoshoot_id uuid)
returns setof public.photoshoots
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_photoshoot public.photoshoots;
begin
  if v_user is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;

  select * into v_photoshoot
  from public.photoshoots
  where id = p_photoshoot_id and user_id = v_user
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'PHOTOSHOOT_NOT_FOUND';
  end if;

  perform set_config('photogen.allow_status_transition', 'on', true);

  if v_photoshoot.status = 'pending' then
    update public.photoshoots set status = 'awaiting_payment' where id = p_photoshoot_id;
    v_photoshoot.status := 'awaiting_payment';
  end if;

  if v_photoshoot.status = 'awaiting_payment' then
    update public.photoshoots set status = 'paid' where id = p_photoshoot_id;
    v_photoshoot.status := 'paid';
  end if;

  if v_photoshoot.status = 'paid' then
    update public.photoshoots set status = 'queued' where id = p_photoshoot_id
    returning * into v_photoshoot;
  else
    select * into v_photoshoot from public.photoshoots where id = p_photoshoot_id;
  end if;

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
  if v_user is null and v_role <> 'service_role' then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
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
  if v_user is null and v_role <> 'service_role' then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
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

drop function if exists public.create_photoshoot_with_persona(uuid, text, text[], text, text, text, text, integer, integer, text, text, text);

create or replace function public.create_photoshoot_with_persona(
  p_persona_id uuid,
  p_style_id text,
  p_images text[],
  p_gender text,
  p_body_type text,
  p_eye_color text,
  p_hair_color text,
  p_height_cm integer,
  p_weight_kg integer,
  p_height_class text,
  p_body_shape text,
  p_body_build text,
  p_requested_images_count integer,
  p_package_snapshot jsonb
) returns setof public.photoshoots
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_persona public.personas;
  v_photo_paths text[];
  v_photoshoot public.photoshoots;
begin
  if v_user is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;
  if p_requested_images_count not between 1 and 20 then
    raise exception using errcode = '23514', message = 'INVALID_REQUESTED_IMAGES_COUNT';
  end if;
  if p_package_snapshot is null or jsonb_typeof(p_package_snapshot) <> 'object' then
    raise exception using errcode = '23514', message = 'INVALID_PACKAGE_SNAPSHOT';
  end if;

  select * into v_persona from public.personas
  where id = p_persona_id and user_id = v_user for share;
  if not found then raise exception using errcode = 'P0002', message = 'PERSONA_NOT_FOUND'; end if;
  if v_persona.status <> 'active' then raise exception using errcode = '23514', message = 'PERSONA_NOT_ACTIVE'; end if;

  select array_agg(pp.storage_path order by pp.created_at, pp.id)
  into v_photo_paths from public.persona_photos pp where pp.persona_id = v_persona.id;
  if coalesce(cardinality(v_photo_paths), 0) = 0 then
    raise exception using errcode = '23514', message = 'PERSONA_HAS_NO_PHOTOS';
  end if;

  insert into public.photoshoots(
    user_id, persona_id, persona_snapshot, style_id, status, images,
    gender, body_type, eye_color, hair_color,
    requested_images_count, package_snapshot
  ) values (
    v_user, v_persona.id,
    jsonb_build_object(
      'name', v_persona.name, 'gender', v_persona.gender,
      'height', v_persona.height, 'weight', v_persona.weight,
      'eyeColor', v_persona.eye_color,
      'heightProfile', v_persona.height_profile, 'bodyBuild', v_persona.body_build,
      'figureType', v_persona.figure_type, 'bustSize', v_persona.bust_size,
      'physique', v_persona.physique, 'photos', to_jsonb(v_photo_paths)
    ),
    p_style_id, 'awaiting_payment', p_images,
    p_gender, p_body_type, p_eye_color, p_hair_color,
    p_requested_images_count, p_package_snapshot
  ) returning * into v_photoshoot;

  return next v_photoshoot;
end $$;

revoke all on function public.transition_photoshoot_status(uuid, text, text) from public;
revoke all on function public.confirm_mock_photoshoot_payment(uuid) from public;
revoke all on function public.finish_photoshoot_generation(uuid, boolean, text) from public;
revoke all on function public.claim_photoshoot_generation(uuid) from public;
revoke all on function public.record_photoshoot_result_images(uuid, text[]) from public;
revoke all on function public.create_photoshoot_with_persona(uuid, text, text[], text, text, text, text, integer, integer, text, text, text, integer, jsonb) from public;

grant execute on function public.transition_photoshoot_status(uuid, text, text) to service_role;
grant execute on function public.finish_photoshoot_generation(uuid, boolean, text) to authenticated, service_role;
grant execute on function public.confirm_mock_photoshoot_payment(uuid) to authenticated;
grant execute on function public.claim_photoshoot_generation(uuid) to authenticated, service_role;
grant execute on function public.record_photoshoot_result_images(uuid, text[]) to authenticated, service_role;
grant execute on function public.create_photoshoot_with_persona(uuid, text, text[], text, text, text, text, integer, integer, text, text, text, integer, jsonb) to authenticated;

commit;
