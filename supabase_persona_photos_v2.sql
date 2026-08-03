-- Persona Photos 2.0. Apply after supabase_persona_appearance.sql.
-- Adds stable ordering, raises the per-Persona limit to five and keeps photoshoot snapshots ordered.

alter table public.persona_photos
  add column if not exists sort_order integer;

with ranked as (
  select
    id,
    row_number() over (partition by persona_id order by created_at, id) - 1 as next_order
  from public.persona_photos
)
update public.persona_photos pp
set sort_order = ranked.next_order
from ranked
where pp.id = ranked.id
  and pp.sort_order is null;

alter table public.persona_photos
  alter column sort_order set not null;

alter table public.persona_photos
  drop constraint if exists persona_photos_sort_order_nonnegative;
alter table public.persona_photos
  add constraint persona_photos_sort_order_nonnegative check (sort_order >= 0);

alter table public.persona_photos
  drop constraint if exists persona_photos_persona_sort_order_key;
alter table public.persona_photos
  add constraint persona_photos_persona_sort_order_key
  unique (persona_id, sort_order) deferrable initially immediate;

create index if not exists persona_photos_persona_sort_idx
  on public.persona_photos (persona_id, sort_order);

create or replace function public.add_persona_photo(p_persona_id uuid, p_storage_path text)
returns setof public.persona_photos
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_persona public.personas;
  v_photo public.persona_photos;
  v_count integer;
begin
  if v_user is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  select * into v_persona from public.personas where id = p_persona_id and user_id = v_user for update;
  if not found then raise exception using errcode = 'P0002', message = 'PERSONA_NOT_FOUND'; end if;
  select count(*) into v_count from public.persona_photos where persona_id = p_persona_id;
  if v_count >= 5 then raise exception using errcode = '23514', message = 'PERSONA_PHOTO_LIMIT'; end if;
  if p_storage_path not like 'personas/' || v_user::text || '/' || p_persona_id::text || '/%' then
    raise exception using errcode = '23514', message = 'INVALID_STORAGE_PATH';
  end if;
  insert into public.persona_photos(persona_id, storage_path, sort_order)
    values(p_persona_id, p_storage_path, v_count)
    returning * into v_photo;
  if v_persona.status = 'draft' then
    perform public.persona_internal_write_on();
    update public.personas set status = 'active' where id = p_persona_id;
  end if;
  return next v_photo;
end $$;

create or replace function public.reorder_persona_photos(p_persona_id uuid, p_photo_ids uuid[])
returns setof public.persona_photos
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_existing_count integer;
begin
  if v_user is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  if p_photo_ids is null then raise exception using errcode = '23514', message = 'INVALID_PHOTO_ORDER'; end if;

  perform 1 from public.personas
  where id = p_persona_id and user_id = v_user
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'PERSONA_NOT_FOUND'; end if;

  select count(*) into v_existing_count
  from public.persona_photos
  where persona_id = p_persona_id;

  if cardinality(p_photo_ids) <> v_existing_count
    or cardinality(p_photo_ids) > 5
    or (select count(distinct photo_id) from unnest(p_photo_ids) as photo_id) <> cardinality(p_photo_ids)
    or exists (
      select 1 from unnest(p_photo_ids) as requested(photo_id)
      left join public.persona_photos pp
        on pp.id = requested.photo_id and pp.persona_id = p_persona_id
      where pp.id is null
    )
  then
    raise exception using errcode = '23514', message = 'INVALID_PHOTO_ORDER';
  end if;

  set constraints persona_photos_persona_sort_order_key deferred;
  update public.persona_photos pp
  set sort_order = requested.ordinality - 1
  from unnest(p_photo_ids) with ordinality as requested(photo_id, ordinality)
  where pp.id = requested.photo_id and pp.persona_id = p_persona_id;

  return query
    select pp.* from public.persona_photos pp
    where pp.persona_id = p_persona_id
    order by pp.sort_order;
end $$;

create or replace function public.delete_persona_photo(p_persona_id uuid, p_photo_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_persona public.personas;
  v_path text;
  v_count integer;
begin
  if v_user is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  select * into v_persona from public.personas where id = p_persona_id and user_id = v_user for update;
  if not found then raise exception using errcode = 'P0002', message = 'PERSONA_NOT_FOUND'; end if;
  select storage_path into v_path from public.persona_photos where id = p_photo_id and persona_id = p_persona_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'PHOTO_NOT_FOUND'; end if;
  select count(*) into v_count from public.persona_photos where persona_id = p_persona_id;
  if v_persona.status = 'active' and v_count <= 1 then
    raise exception using errcode = '23514', message = 'ACTIVE_PERSONA_LAST_PHOTO';
  end if;

  delete from public.persona_photos where id = p_photo_id;
  set constraints persona_photos_persona_sort_order_key deferred;
  with ranked as (
    select id, row_number() over (order by sort_order, created_at, id) - 1 as next_order
    from public.persona_photos
    where persona_id = p_persona_id
  )
  update public.persona_photos pp
  set sort_order = ranked.next_order
  from ranked
  where pp.id = ranked.id;

  return v_path;
end $$;

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
  p_body_build text
) returns setof public.photoshoots
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_persona public.personas;
  v_photo_paths text[];
  v_photoshoot public.photoshoots;
begin
  if v_user is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  select * into v_persona from public.personas where id = p_persona_id and user_id = v_user for share;
  if not found then raise exception using errcode = 'P0002', message = 'PERSONA_NOT_FOUND'; end if;
  if v_persona.status <> 'active' then raise exception using errcode = '23514', message = 'PERSONA_NOT_ACTIVE'; end if;

  select array_agg(pp.storage_path order by pp.sort_order)
  into v_photo_paths
  from public.persona_photos pp
  where pp.persona_id = v_persona.id;
  if coalesce(cardinality(v_photo_paths), 0) = 0 then
    raise exception using errcode = '23514', message = 'PERSONA_HAS_NO_PHOTOS';
  end if;

  insert into public.photoshoots(
    user_id, persona_id, persona_snapshot, style_id, status, images,
    gender, body_type, eye_color, hair_color
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
    p_style_id, 'pending', p_images, p_gender, p_body_type, p_eye_color, p_hair_color
  ) returning * into v_photoshoot;
  return next v_photoshoot;
end $$;

revoke all on function public.reorder_persona_photos(uuid, uuid[]) from public;
grant execute on function public.reorder_persona_photos(uuid, uuid[]) to authenticated;
revoke all on function public.add_persona_photo(uuid, text) from public;
grant execute on function public.add_persona_photo(uuid, text) to authenticated;
revoke all on function public.delete_persona_photo(uuid, uuid) from public;
grant execute on function public.delete_persona_photo(uuid, uuid) to authenticated;
revoke all on function public.create_photoshoot_with_persona(uuid, text, text[], text, text, text, text, integer, integer, text, text, text) from public;
grant execute on function public.create_photoshoot_with_persona(uuid, text, text[], text, text, text, text, integer, integer, text, text, text) to authenticated;
