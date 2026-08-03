-- Adds Persona ownership and an immutable creation-time snapshot to photoshoots.
-- Existing dev rows remain readable; every new row must reference a Persona.
alter table public.photoshoots
  add column if not exists persona_id uuid references public.personas(id) on delete restrict,
  add column if not exists persona_snapshot jsonb;

create index if not exists photoshoots_persona_id_idx on public.photoshoots(persona_id);

create or replace function public.guard_photoshoot_persona()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.persona_id is null or new.persona_snapshot is null then
      raise exception using errcode = '23502', message = 'PERSONA_REQUIRED';
    end if;
  elsif new.persona_id is distinct from old.persona_id
     or new.persona_snapshot is distinct from old.persona_snapshot then
    raise exception using errcode = '42501', message = 'PERSONA_SNAPSHOT_IMMUTABLE';
  end if;
  return new;
end $$;

drop trigger if exists guard_photoshoot_persona on public.photoshoots;
create trigger guard_photoshoot_persona
before insert or update on public.photoshoots
for each row execute function public.guard_photoshoot_persona();

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
  if v_user is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
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

  select array_agg(pp.storage_path order by pp.created_at, pp.id)
  into v_photo_paths
  from public.persona_photos pp
  where pp.persona_id = v_persona.id;

  if coalesce(cardinality(v_photo_paths), 0) = 0 then
    raise exception using errcode = '23514', message = 'PERSONA_HAS_NO_PHOTOS';
  end if;

  insert into public.photoshoots(
    user_id, persona_id, persona_snapshot, style_id, status, images,
    gender, body_type, eye_color, hair_color, height_cm, weight_kg,
    height_class, body_shape, body_build
  ) values (
    v_user,
    v_persona.id,
    jsonb_build_object(
      'name', v_persona.name,
      'gender', v_persona.gender,
      'height', v_persona.height,
      'weight', v_persona.weight,
      'eyeColor', v_persona.eye_color,
      'photos', to_jsonb(v_photo_paths)
    ),
    p_style_id, 'pending', p_images, p_gender, p_body_type, p_eye_color,
    p_hair_color, p_height_cm, p_weight_kg, p_height_class,
    p_body_shape, p_body_build
  ) returning * into v_photoshoot;

  return next v_photoshoot;
end $$;

revoke insert on public.photoshoots from authenticated;
revoke all on function public.create_photoshoot_with_persona(uuid, text, text[], text, text, text, text, integer, integer, text, text, text) from public;
grant execute on function public.create_photoshoot_with_persona(uuid, text, text[], text, text, text, text, integer, integer, text, text, text) to authenticated;
