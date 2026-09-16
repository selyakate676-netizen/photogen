-- P0 marketing attribution snapshot. Apply after supabase_photoshoot_lifecycle.sql.
begin;

alter table public.photoshoots
  add column if not exists attribution_snapshot jsonb;

create or replace function public.guard_photoshoot_attribution()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.attribution_snapshot is distinct from new.attribution_snapshot
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception using errcode = '42501', message = 'PHOTOSHOOT_ATTRIBUTION_IMMUTABLE';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_photoshoot_attribution on public.photoshoots;
create trigger guard_photoshoot_attribution
before update on public.photoshoots
for each row execute function public.guard_photoshoot_attribution();

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
  p_package_snapshot jsonb,
  p_attribution_snapshot jsonb
) returns setof public.photoshoots
language plpgsql security definer set search_path = public as $$
declare
  v_photoshoot public.photoshoots;
  v_allowed_keys text[] := array['source','medium','campaign','content','term','yclid','referrer','capturedAt'];
begin
  if p_attribution_snapshot is not null then
    if jsonb_typeof(p_attribution_snapshot) <> 'object'
       or not (p_attribution_snapshot ? 'first')
       or not (p_attribution_snapshot ? 'last')
       or exists (
         select 1 from jsonb_object_keys(p_attribution_snapshot) key
         where key not in ('first', 'last')
       )
       or jsonb_typeof(p_attribution_snapshot->'first') <> 'object'
       or jsonb_typeof(p_attribution_snapshot->'last') <> 'object'
       or exists (
         select 1 from jsonb_object_keys(p_attribution_snapshot->'first') key
         where not (key = any(v_allowed_keys))
       )
       or exists (
         select 1 from jsonb_object_keys(p_attribution_snapshot->'last') key
         where not (key = any(v_allowed_keys))
       ) then
      raise exception using errcode = '23514', message = 'INVALID_ATTRIBUTION_SNAPSHOT';
    end if;
  end if;

  select * into v_photoshoot
  from public.create_photoshoot_with_persona(
    p_persona_id, p_style_id, p_images, p_gender, p_body_type,
    p_eye_color, p_hair_color, p_height_cm, p_weight_kg,
    p_height_class, p_body_shape, p_body_build,
    p_requested_images_count, p_package_snapshot
  );

  if p_attribution_snapshot is not null then
    update public.photoshoots
    set attribution_snapshot = p_attribution_snapshot
    where id = v_photoshoot.id
    returning * into v_photoshoot;
  end if;

  return next v_photoshoot;
end $$;

revoke all on function public.create_photoshoot_with_persona(
  uuid, text, text[], text, text, text, text, integer, integer,
  text, text, text, integer, jsonb, jsonb
) from public, anon, service_role;
grant execute on function public.create_photoshoot_with_persona(
  uuid, text, text[], text, text, text, text, integer, integer,
  text, text, text, integer, jsonb, jsonb
) to authenticated;

commit;
