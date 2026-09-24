-- Safe two-phase deletion for a reusable Persona.
-- Apply after supabase_persona_photo_safe_deletion.sql.
begin;

alter table public.personas
  add column if not exists deletion_pending boolean not null default false;

alter table public.photoshoots
  drop constraint if exists photoshoots_persona_id_fkey;
alter table public.photoshoots
  alter column persona_id drop not null;
alter table public.photoshoots
  add constraint photoshoots_persona_id_fkey
  foreign key (persona_id) references public.personas(id) on delete set null;

create or replace function public.guard_photoshoot_persona()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.persona_id is null or new.persona_snapshot is null then
      raise exception using errcode = '23502', message = 'PERSONA_REQUIRED';
    end if;
    if exists (
      select 1 from public.personas p
      where p.id = new.persona_id and p.deletion_pending
    ) then
      raise exception using errcode = '23514', message = 'PERSONA_DELETION_PENDING';
    end if;
  elsif current_setting('photogen.allow_persona_photo_scrub', true) <> 'on'
     and (new.persona_id is distinct from old.persona_id
       or new.persona_snapshot is distinct from old.persona_snapshot) then
    raise exception using errcode = '42501', message = 'PERSONA_SNAPSHOT_IMMUTABLE';
  end if;
  return new;
end $$;

create or replace function public.guard_pending_persona_photo_use()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status in ('training', 'queued', 'generating')
     and (
       exists (
         select 1 from public.personas p
         where p.id = new.persona_id and p.deletion_pending
       )
       or exists (
         select 1 from public.persona_photos pp
         join public.personas p on p.id = pp.persona_id
         where (pp.deletion_pending or p.deletion_pending)
           and (
             pp.storage_path = any(new.images)
             or coalesce(new.persona_snapshot->'photos', '[]'::jsonb) ? pp.storage_path
           )
       )
     ) then
    raise exception using errcode = '23514', message = 'PERSONA_DELETION_PENDING';
  end if;
  return new;
end $$;

create or replace function public.prepare_persona_deletion(p_persona_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_persona public.personas;
  v_prefix text;
begin
  if v_user is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  select * into v_persona from public.personas
  where id = p_persona_id and user_id = v_user for update;
  if not found then raise exception using errcode = 'P0002', message = 'PERSONA_NOT_FOUND'; end if;
  if v_persona.is_default then
    raise exception using errcode = '23514', message = 'DEFAULT_PERSONA_DELETE';
  end if;
  if exists (
    select 1 from public.photoshoots ps
    where ps.user_id = v_user
      and ps.status in ('training', 'queued', 'generating')
      and (
        ps.persona_id = p_persona_id
        or exists (
          select 1 from public.persona_photos pp
          where pp.persona_id = p_persona_id
            and (
              pp.storage_path = any(ps.images)
              or coalesce(ps.persona_snapshot->'photos', '[]'::jsonb) ? pp.storage_path
            )
        )
      )
  ) then
    raise exception using errcode = '23514', message = 'PERSONA_IN_ACTIVE_JOB';
  end if;
  update public.personas set deletion_pending = true where id = p_persona_id;
  v_prefix := 'personas/' || v_user::text || '/' || p_persona_id::text || '/';
  return v_prefix;
end $$;

create or replace function public.cancel_persona_deletion(p_persona_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  update public.personas set deletion_pending = false
  where id = p_persona_id and user_id = v_user;
end $$;

drop function if exists public.delete_persona(uuid);

create or replace function public.delete_persona(p_persona_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_persona public.personas;
  v_paths text[];
  v_prefix text;
begin
  if v_user is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  select * into v_persona from public.personas
  where id = p_persona_id and user_id = v_user and deletion_pending for update;
  if not found then raise exception using errcode = 'P0002', message = 'PERSONA_DELETION_NOT_PREPARED'; end if;
  if v_persona.is_default then
    raise exception using errcode = '23514', message = 'DEFAULT_PERSONA_DELETE';
  end if;
  if exists (
    select 1 from public.photoshoots ps
    where ps.user_id = v_user
      and ps.status in ('training', 'queued', 'generating')
      and (
        ps.persona_id = p_persona_id
        or exists (
          select 1 from public.persona_photos pp
          where pp.persona_id = p_persona_id
            and (
              pp.storage_path = any(ps.images)
              or coalesce(ps.persona_snapshot->'photos', '[]'::jsonb) ? pp.storage_path
            )
        )
      )
  ) then
    raise exception using errcode = '23514', message = 'PERSONA_IN_ACTIVE_JOB';
  end if;

  select coalesce(array_agg(storage_path), '{}'::text[]) into v_paths
  from public.persona_photos where persona_id = p_persona_id;
  perform set_config('photogen.allow_persona_photo_scrub', 'on', true);
  update public.photoshoots ps
  set images = array(
        select image_path from unnest(ps.images) image_path
        where not (image_path = any(v_paths))
      ),
      persona_snapshot = jsonb_build_object('personaDeleted', true)
  where ps.user_id = v_user
    and (
      ps.persona_id = p_persona_id
      or exists (
        select 1 from unnest(v_paths) source_path
        where source_path = any(ps.images)
          or coalesce(ps.persona_snapshot->'photos', '[]'::jsonb) ? source_path
      )
    );

  delete from public.personas where id = p_persona_id;
  perform set_config('photogen.allow_persona_photo_scrub', 'off', true);
  v_prefix := 'personas/' || v_user::text || '/' || p_persona_id::text || '/';
  return v_prefix;
end $$;

revoke all on function public.prepare_persona_deletion(uuid) from public, anon, authenticated, service_role;
revoke all on function public.cancel_persona_deletion(uuid) from public, anon, authenticated, service_role;
revoke all on function public.delete_persona(uuid) from public, anon, authenticated, service_role;
grant execute on function public.prepare_persona_deletion(uuid) to authenticated;
grant execute on function public.cancel_persona_deletion(uuid) to authenticated;
grant execute on function public.delete_persona(uuid) to authenticated;

commit;
