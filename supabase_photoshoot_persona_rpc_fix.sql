-- Correct create_photoshoot_with_persona for the deployed photoshoots schema.
-- Keep the RPC signature for backend compatibility; optional body arguments are
-- intentionally not persisted because those columns are not part of the
-- deployed photoshoots model. Persona body data remains in persona_snapshot.
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
    user_id,
    persona_id,
    persona_snapshot,
    style_id,
    status,
    images,
    gender,
    body_type,
    eye_color,
    hair_color
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
    p_style_id,
    'pending',
    p_images,
    p_gender,
    p_body_type,
    p_eye_color,
    p_hair_color
  ) returning * into v_photoshoot;

  return next v_photoshoot;
end $$;

revoke all on function public.create_photoshoot_with_persona(uuid, text, text[], text, text, text, text, integer, integer, text, text, text) from public;
grant execute on function public.create_photoshoot_with_persona(uuid, text, text[], text, text, text, text, integer, integer, text, text, text) to authenticated;
