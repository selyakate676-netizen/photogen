-- Apply immediately after supabase_personas_migration.sql.
-- Prevent clients from bypassing transactional functions for invariant-changing writes.
drop policy if exists "Users can insert own personas" on public.personas;
drop policy if exists "Users can delete own personas" on public.personas;
drop policy if exists "Users can insert own persona photos" on public.persona_photos;
drop policy if exists "Users can delete own persona photos" on public.persona_photos;

revoke insert, delete on public.personas from authenticated;
revoke insert, update, delete on public.persona_photos from authenticated;

create or replace function public.guard_persona_protected_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_setting('app.persona_internal_write', true) <> 'on'
     and (new.user_id, new.is_default, new.status) is distinct from (old.user_id, old.is_default, old.status) then
    raise exception using errcode = '42501', message = 'PROTECTED_PERSONA_FIELDS';
  end if;
  return new;
end $$;
drop trigger if exists guard_persona_protected_fields on public.personas;
create trigger guard_persona_protected_fields before update on public.personas
for each row execute function public.guard_persona_protected_fields();

-- Functions are definer-rights because table DML is intentionally unavailable to
-- API clients. Every function derives and verifies the owner via auth.uid().
alter function public.create_persona(text, integer, integer, text, text) security definer;
alter function public.set_default_persona(uuid) security definer;
alter function public.add_persona_photo(uuid, text) security definer;
alter function public.delete_persona_photo(uuid, uuid) security definer;
alter function public.delete_persona(uuid) security definer;

create or replace function public.update_persona(
  p_persona_id uuid,
  p_name text,
  p_height integer,
  p_weight integer,
  p_gender text,
  p_eye_color text
) returns setof public.personas
language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_persona public.personas;
begin
  if v_user is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  update public.personas set name = btrim(p_name), height = p_height, weight = p_weight,
    gender = p_gender, eye_color = nullif(btrim(p_eye_color), '')
    where id = p_persona_id and user_id = v_user returning * into v_persona;
  if not found then raise exception using errcode = 'P0002', message = 'PERSONA_NOT_FOUND'; end if;
  return next v_persona;
end $$;
revoke all on function public.update_persona(uuid, text, integer, integer, text, text) from public;
grant execute on function public.update_persona(uuid, text, integer, integer, text, text) to authenticated;

-- Internal functions may change status/default; the guard still rejects direct API writes.
create or replace function public.persona_internal_write_on()
returns void language plpgsql security definer set search_path = public as $$
begin perform set_config('app.persona_internal_write', 'on', true); end $$;
revoke all on function public.persona_internal_write_on() from public, anon, authenticated;

-- Patch the two functions that legitimately change protected columns.
create or replace function public.set_default_persona(p_persona_id uuid)
returns setof public.personas language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_persona public.personas;
begin
  if v_user is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  select * into v_persona from public.personas where id = p_persona_id and user_id = v_user for update;
  if not found then raise exception using errcode = 'P0002', message = 'PERSONA_NOT_FOUND'; end if;
  perform public.persona_internal_write_on();
  update public.personas set is_default = false where user_id = v_user and is_default and id <> p_persona_id;
  update public.personas set is_default = true where id = p_persona_id returning * into v_persona;
  return next v_persona;
end $$;

create or replace function public.add_persona_photo(p_persona_id uuid, p_storage_path text)
returns setof public.persona_photos language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_persona public.personas; v_photo public.persona_photos; v_count integer;
begin
  if v_user is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  select * into v_persona from public.personas where id = p_persona_id and user_id = v_user for update;
  if not found then raise exception using errcode = 'P0002', message = 'PERSONA_NOT_FOUND'; end if;
  select count(*) into v_count from public.persona_photos where persona_id = p_persona_id;
  if v_count >= 3 then raise exception using errcode = '23514', message = 'PERSONA_PHOTO_LIMIT'; end if;
  if p_storage_path not like 'personas/' || v_user::text || '/' || p_persona_id::text || '/%' then raise exception using errcode = '23514', message = 'INVALID_STORAGE_PATH'; end if;
  insert into public.persona_photos(persona_id, storage_path) values(p_persona_id, p_storage_path) returning * into v_photo;
  if v_persona.status = 'draft' then
    perform public.persona_internal_write_on();
    update public.personas set status = 'active' where id = p_persona_id;
  end if;
  return next v_photo;
end $$;
