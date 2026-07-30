-- Persona backend migration. Apply after supabase_schema.sql.
create extension if not exists "uuid-ossp";

create table if not exists public.personas (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  is_default boolean not null default false,
  height integer check (height is null or height between 120 and 230),
  weight integer check (weight is null or weight between 35 and 250),
  gender text check (gender is null or gender in ('woman', 'man')),
  eye_color text check (eye_color is null or char_length(eye_color) between 1 and 40),
  status text not null default 'draft' check (status in ('draft', 'active')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists personas_one_default_per_user_idx on public.personas (user_id) where is_default;
create index if not exists personas_user_created_idx on public.personas (user_id, created_at);

create table if not exists public.persona_photos (
  id uuid primary key default uuid_generate_v4(),
  persona_id uuid not null references public.personas(id) on delete cascade,
  storage_path text not null check (char_length(storage_path) between 1 and 1024 and storage_path !~ '(^|/)\.\.(/|$)'),
  created_at timestamptz not null default now(),
  unique (persona_id, storage_path)
);
create index if not exists persona_photos_persona_created_idx on public.persona_photos (persona_id, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_personas_updated_at on public.personas;
create trigger set_personas_updated_at before update on public.personas for each row execute function public.set_updated_at();

alter table public.personas enable row level security;
alter table public.persona_photos enable row level security;
create policy "Users can view own personas" on public.personas for select using (auth.uid() = user_id);
create policy "Users can insert own personas" on public.personas for insert with check (auth.uid() = user_id);
create policy "Users can update own personas" on public.personas for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own personas" on public.personas for delete using (auth.uid() = user_id);
create policy "Users can view own persona photos" on public.persona_photos for select using (exists (select 1 from public.personas p where p.id = persona_id and p.user_id = auth.uid()));
create policy "Users can insert own persona photos" on public.persona_photos for insert with check (exists (select 1 from public.personas p where p.id = persona_id and p.user_id = auth.uid()));
create policy "Users can delete own persona photos" on public.persona_photos for delete using (exists (select 1 from public.personas p where p.id = persona_id and p.user_id = auth.uid()));

create or replace function public.create_persona(p_name text default null, p_height integer default null, p_weight integer default null, p_gender text default null, p_eye_color text default null)
returns setof public.personas language plpgsql security invoker set search_path = public as $$
declare v_user uuid := auth.uid(); v_default public.personas; v_created public.personas;
begin
  if v_user is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  select * into v_default from public.personas where user_id = v_user and is_default for update;
  if not found then insert into public.personas(user_id, name, is_default, status) values(v_user, 'Я', true, 'draft') returning * into v_default; end if;
  if p_name is null then return next v_default; return; end if;
  insert into public.personas(user_id, name, height, weight, gender, eye_color)
    values(v_user, btrim(p_name), p_height, p_weight, p_gender, nullif(btrim(p_eye_color), '')) returning * into v_created;
  return next v_created;
end $$;

create or replace function public.set_default_persona(p_persona_id uuid)
returns setof public.personas language plpgsql security invoker set search_path = public as $$
declare v_user uuid := auth.uid(); v_persona public.personas;
begin
  if v_user is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  select * into v_persona from public.personas where id = p_persona_id and user_id = v_user for update;
  if not found then raise exception using errcode = 'P0002', message = 'PERSONA_NOT_FOUND'; end if;
  update public.personas set is_default = false where user_id = v_user and is_default and id <> p_persona_id;
  update public.personas set is_default = true where id = p_persona_id returning * into v_persona;
  return next v_persona;
end $$;

create or replace function public.add_persona_photo(p_persona_id uuid, p_storage_path text)
returns setof public.persona_photos language plpgsql security invoker set search_path = public as $$
declare v_user uuid := auth.uid(); v_persona public.personas; v_photo public.persona_photos; v_count integer;
begin
  if v_user is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  select * into v_persona from public.personas where id = p_persona_id and user_id = v_user for update;
  if not found then raise exception using errcode = 'P0002', message = 'PERSONA_NOT_FOUND'; end if;
  select count(*) into v_count from public.persona_photos where persona_id = p_persona_id;
  if v_count >= 3 then raise exception using errcode = '23514', message = 'PERSONA_PHOTO_LIMIT'; end if;
  if p_storage_path not like 'personas/' || v_user::text || '/' || p_persona_id::text || '/%' then raise exception using errcode = '23514', message = 'INVALID_STORAGE_PATH'; end if;
  insert into public.persona_photos(persona_id, storage_path) values(p_persona_id, p_storage_path) returning * into v_photo;
  if v_persona.status = 'draft' then update public.personas set status = 'active' where id = p_persona_id; end if;
  return next v_photo;
end $$;

create or replace function public.delete_persona_photo(p_persona_id uuid, p_photo_id uuid)
returns text language plpgsql security invoker set search_path = public as $$
declare v_user uuid := auth.uid(); v_persona public.personas; v_path text; v_count integer;
begin
  if v_user is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  select * into v_persona from public.personas where id = p_persona_id and user_id = v_user for update;
  if not found then raise exception using errcode = 'P0002', message = 'PERSONA_NOT_FOUND'; end if;
  select storage_path into v_path from public.persona_photos where id = p_photo_id and persona_id = p_persona_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'PHOTO_NOT_FOUND'; end if;
  select count(*) into v_count from public.persona_photos where persona_id = p_persona_id;
  if v_persona.status = 'active' and v_count <= 1 then raise exception using errcode = '23514', message = 'ACTIVE_PERSONA_LAST_PHOTO'; end if;
  delete from public.persona_photos where id = p_photo_id;
  return v_path;
end $$;

create or replace function public.delete_persona(p_persona_id uuid)
returns text[] language plpgsql security invoker set search_path = public as $$
declare v_user uuid := auth.uid(); v_persona public.personas; v_paths text[];
begin
  if v_user is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  select * into v_persona from public.personas where id = p_persona_id and user_id = v_user for update;
  if not found then raise exception using errcode = 'P0002', message = 'PERSONA_NOT_FOUND'; end if;
  if v_persona.is_default then raise exception using errcode = '23514', message = 'DEFAULT_PERSONA_DELETE'; end if;
  select coalesce(array_agg(storage_path), '{}') into v_paths from public.persona_photos where persona_id = p_persona_id;
  delete from public.personas where id = p_persona_id;
  return v_paths;
end $$;

revoke all on function public.create_persona(text, integer, integer, text, text) from public;
revoke all on function public.set_default_persona(uuid) from public;
revoke all on function public.add_persona_photo(uuid, text) from public;
revoke all on function public.delete_persona_photo(uuid, uuid) from public;
revoke all on function public.delete_persona(uuid) from public;
grant execute on function public.create_persona(text, integer, integer, text, text) to authenticated;
grant execute on function public.set_default_persona(uuid) to authenticated;
grant execute on function public.add_persona_photo(uuid, text) to authenticated;
grant execute on function public.delete_persona_photo(uuid, uuid) to authenticated;
grant execute on function public.delete_persona(uuid) to authenticated;
