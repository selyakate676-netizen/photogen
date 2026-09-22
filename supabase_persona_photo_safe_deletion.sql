-- Safe two-phase deletion for one Persona source photo.
-- Apply after Persona Photos 2.0 completion and lifecycle migrations.
begin;

alter table public.persona_photos
  add column if not exists deletion_pending boolean not null default false;

create or replace function public.guard_photoshoot_persona()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.persona_id is null or new.persona_snapshot is null then
      raise exception using errcode = '23502', message = 'PERSONA_REQUIRED';
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
     and exists (
       select 1 from public.persona_photos pp
       where pp.deletion_pending
         and (
           pp.storage_path = any(new.images)
           or coalesce(new.persona_snapshot->'photos', '[]'::jsonb) ? pp.storage_path
         )
     ) then
    raise exception using errcode = '23514', message = 'PERSONA_PHOTO_DELETION_PENDING';
  end if;
  return new;
end $$;

drop trigger if exists guard_pending_persona_photo_use on public.photoshoots;
create trigger guard_pending_persona_photo_use
before insert or update of status, images on public.photoshoots
for each row execute function public.guard_pending_persona_photo_use();

create or replace function public.prepare_persona_photo_deletion(p_persona_id uuid, p_photo_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_path text;
begin
  if v_user is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  perform 1 from public.personas where id = p_persona_id and user_id = v_user for update;
  if not found then raise exception using errcode = 'P0002', message = 'PERSONA_NOT_FOUND'; end if;
  select storage_path into v_path from public.persona_photos
  where id = p_photo_id and persona_id = p_persona_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'PHOTO_NOT_FOUND'; end if;
  if exists (
    select 1 from public.photoshoots ps where ps.user_id = v_user
      and ps.status in ('training', 'queued', 'generating')
      and (v_path = any(ps.images) or coalesce(ps.persona_snapshot->'photos', '[]'::jsonb) ? v_path)
  ) then
    raise exception using errcode = '23514', message = 'PERSONA_PHOTO_IN_ACTIVE_JOB';
  end if;
  update public.persona_photos set deletion_pending = true
  where id = p_photo_id and persona_id = p_persona_id;
  return v_path;
end $$;

create or replace function public.cancel_persona_photo_deletion(p_persona_id uuid, p_photo_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  update public.persona_photos pp set deletion_pending = false from public.personas p
  where pp.id = p_photo_id and pp.persona_id = p_persona_id
    and p.id = pp.persona_id and p.user_id = v_user;
end $$;

create or replace function public.delete_persona_photo(p_persona_id uuid, p_photo_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_persona public.personas;
  v_path text;
  v_count integer;
begin
  if v_user is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  select * into v_persona from public.personas
  where id = p_persona_id and user_id = v_user for update;
  if not found then raise exception using errcode = 'P0002', message = 'PERSONA_NOT_FOUND'; end if;
  select storage_path into v_path from public.persona_photos
  where id = p_photo_id and persona_id = p_persona_id and deletion_pending for update;
  if not found then raise exception using errcode = 'P0002', message = 'PHOTO_DELETION_NOT_PREPARED'; end if;
  if exists (
    select 1 from public.photoshoots ps where ps.user_id = v_user
      and ps.status in ('training', 'queued', 'generating')
      and (v_path = any(ps.images) or coalesce(ps.persona_snapshot->'photos', '[]'::jsonb) ? v_path)
  ) then
    raise exception using errcode = '23514', message = 'PERSONA_PHOTO_IN_ACTIVE_JOB';
  end if;

  perform set_config('photogen.allow_persona_photo_scrub', 'on', true);
  update public.photoshoots ps
  set images = array(select image_path from unnest(ps.images) image_path where image_path <> v_path),
      persona_snapshot = jsonb_set(
        ps.persona_snapshot, '{photos}',
        coalesce((select jsonb_agg(photo_value)
          from jsonb_array_elements(coalesce(ps.persona_snapshot->'photos', '[]'::jsonb)) photo_value
          where photo_value #>> '{}' <> v_path), '[]'::jsonb), true)
  where ps.user_id = v_user
    and (v_path = any(ps.images) or coalesce(ps.persona_snapshot->'photos', '[]'::jsonb) ? v_path);
  perform set_config('photogen.allow_persona_photo_scrub', 'off', true);

  select count(*) into v_count from public.persona_photos where persona_id = p_persona_id;
  delete from public.persona_photos where id = p_photo_id and persona_id = p_persona_id;
  set constraints persona_photos_persona_sort_order_key deferred;
  with ranked as (
    select id, row_number() over (order by sort_order, created_at, id) - 1 as next_order
    from public.persona_photos where persona_id = p_persona_id
  )
  update public.persona_photos pp set sort_order = ranked.next_order
  from ranked where pp.id = ranked.id;
  if v_count = 1 and v_persona.status = 'active' then
    perform public.persona_internal_write_on();
    update public.personas set status = 'draft' where id = p_persona_id;
  end if;
  return v_path;
end $$;

revoke all on function public.prepare_persona_photo_deletion(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.cancel_persona_photo_deletion(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.delete_persona_photo(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.guard_pending_persona_photo_use() from public, anon, authenticated, service_role;
grant execute on function public.prepare_persona_photo_deletion(uuid, uuid) to authenticated;
grant execute on function public.cancel_persona_photo_deletion(uuid, uuid) to authenticated;
grant execute on function public.delete_persona_photo(uuid, uuid) to authenticated;

commit;
