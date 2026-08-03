-- Sprint 1 completion for Persona Photos 2.0.
-- Apply after supabase_persona_photos_v2.sql and supabase_photoshoot_lifecycle.sql.

begin;

create or replace function public.delete_persona_photo(
  p_persona_id uuid,
  p_photo_id uuid
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_persona public.personas;
  v_path text;
  v_count integer;
begin
  if v_user is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;

  select * into v_persona
  from public.personas
  where id = p_persona_id and user_id = v_user
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'PERSONA_NOT_FOUND';
  end if;

  select storage_path into v_path
  from public.persona_photos
  where id = p_photo_id and persona_id = p_persona_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'PHOTO_NOT_FOUND';
  end if;

  select count(*) into v_count
  from public.persona_photos
  where persona_id = p_persona_id;

  delete from public.persona_photos
  where id = p_photo_id and persona_id = p_persona_id;

  set constraints persona_photos_persona_sort_order_key deferred;
  with ranked as (
    select
      id,
      row_number() over (order by sort_order, created_at, id) - 1 as next_order
    from public.persona_photos
    where persona_id = p_persona_id
  )
  update public.persona_photos pp
  set sort_order = ranked.next_order
  from ranked
  where pp.id = ranked.id;

  if v_count = 1 and v_persona.status = 'active' then
    perform public.persona_internal_write_on();
    update public.personas
    set status = 'draft'
    where id = p_persona_id;
  end if;

  return v_path;
end;
$$;

-- The 12-argument overload belonged to the pre-lifecycle order flow. Do not
-- leave it callable after applying Persona Photos 2.0 to a lifecycle database.
drop function if exists public.create_photoshoot_with_persona(
  uuid, text, text[], text, text, text, text,
  integer, integer, text, text, text
);

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
language plpgsql
security definer
set search_path = public
as $$
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

  select * into v_persona
  from public.personas
  where id = p_persona_id and user_id = v_user
  for share;

  if not found then
    raise exception using errcode = 'P0002', message = 'PERSONA_NOT_FOUND';
  end if;
  if v_persona.status <> 'active' then
    raise exception using errcode = '23514', message = 'PERSONA_NOT_ACTIVE';
  end if;

  select array_agg(pp.storage_path order by pp.sort_order)
  into v_photo_paths
  from public.persona_photos pp
  where pp.persona_id = v_persona.id;

  if coalesce(cardinality(v_photo_paths), 0) = 0 then
    raise exception using errcode = '23514', message = 'PERSONA_HAS_NO_PHOTOS';
  end if;

  insert into public.photoshoots(
    user_id,
    persona_id,
    persona_snapshot,
    style_id,
    status,
    images,
    gender,
    body_type,
    eye_color,
    hair_color,
    requested_images_count,
    package_snapshot
  ) values (
    v_user,
    v_persona.id,
    jsonb_build_object(
      'name', v_persona.name,
      'gender', v_persona.gender,
      'height', v_persona.height,
      'weight', v_persona.weight,
      'eyeColor', v_persona.eye_color,
      'heightProfile', v_persona.height_profile,
      'bodyBuild', v_persona.body_build,
      'figureType', v_persona.figure_type,
      'bustSize', v_persona.bust_size,
      'physique', v_persona.physique,
      'photos', to_jsonb(v_photo_paths)
    ),
    p_style_id,
    'awaiting_payment',
    p_images,
    p_gender,
    p_body_type,
    p_eye_color,
    p_hair_color,
    p_requested_images_count,
    p_package_snapshot
  )
  returning * into v_photoshoot;

  return next v_photoshoot;
end;
$$;

revoke all on function public.delete_persona_photo(uuid, uuid) from public;
grant execute on function public.delete_persona_photo(uuid, uuid) to authenticated;

revoke all on function public.create_photoshoot_with_persona(
  uuid, text, text[], text, text, text, text,
  integer, integer, text, text, text, integer, jsonb
) from public;
grant execute on function public.create_photoshoot_with_persona(
  uuid, text, text[], text, text, text, text,
  integer, integer, text, text, text, integer, jsonb
) to authenticated;

commit;
