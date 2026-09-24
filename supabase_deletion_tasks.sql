-- Durable, minimal deletion manifest for Persona and PersonaPhoto storage cleanup.
-- Apply after supabase_persona_safe_deletion.sql.
begin;

create table if not exists public.deletion_tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  object_key text not null check (btrim(object_key) <> ''),
  entity_type text not null check (entity_type in ('persona_photo', 'persona')),
  entity_id uuid not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'storage_deleted', 'completed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, entity_id, object_key)
);

create index if not exists deletion_tasks_user_status_created_idx
  on public.deletion_tasks(user_id, status, created_at);

create trigger set_deletion_tasks_updated_at
before update on public.deletion_tasks
for each row execute function public.set_updated_at();

create or replace function public.enqueue_persona_photo_deletion()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  if new.deletion_pending and not old.deletion_pending then
    select user_id into v_user from public.personas where id = new.persona_id;
    insert into public.deletion_tasks(user_id, object_key, entity_type, entity_id)
    values (v_user, new.storage_path, 'persona_photo', new.id)
    on conflict (entity_type, entity_id, object_key)
    do update set status = 'pending', last_error = null;
  end if;
  return new;
end $$;

drop trigger if exists enqueue_persona_photo_deletion on public.persona_photos;
create trigger enqueue_persona_photo_deletion
after update of deletion_pending on public.persona_photos
for each row execute function public.enqueue_persona_photo_deletion();

create or replace function public.enqueue_persona_deletion()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.deletion_pending and not old.deletion_pending then
    insert into public.deletion_tasks(user_id, object_key, entity_type, entity_id)
    values (
      new.user_id,
      'personas/' || new.user_id::text || '/' || new.id::text || '/',
      'persona',
      new.id
    )
    on conflict (entity_type, entity_id, object_key)
    do update set status = 'pending', last_error = null;
  end if;
  return new;
end $$;

drop trigger if exists enqueue_persona_deletion on public.personas;
create trigger enqueue_persona_deletion
after update of deletion_pending on public.personas
for each row execute function public.enqueue_persona_deletion();

insert into public.deletion_tasks(user_id, object_key, entity_type, entity_id)
select p.user_id, pp.storage_path, 'persona_photo', pp.id
from public.persona_photos pp join public.personas p on p.id = pp.persona_id
where pp.deletion_pending
on conflict (entity_type, entity_id, object_key) do nothing;

insert into public.deletion_tasks(user_id, object_key, entity_type, entity_id)
select user_id, 'personas/' || user_id::text || '/' || id::text || '/', 'persona', id
from public.personas where deletion_pending
on conflict (entity_type, entity_id, object_key) do nothing;

create or replace function public.claim_deletion_task(p_task_id uuid, p_user_id uuid)
returns setof public.deletion_tasks
language plpgsql security definer set search_path = public as $$
declare v_task public.deletion_tasks;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  update public.deletion_tasks
  set status = 'processing', attempts = attempts + 1, last_error = null
  where id = p_task_id and user_id = p_user_id and status <> 'completed'
  returning * into v_task;
  if not found then raise exception using errcode = 'P0002', message = 'DELETION_TASK_NOT_FOUND'; end if;
  return next v_task;
end $$;

create or replace function public.set_deletion_task_state(
  p_task_id uuid,
  p_user_id uuid,
  p_status text,
  p_last_error text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  if p_status not in ('pending', 'storage_deleted', 'completed') then
    raise exception using errcode = '22023', message = 'INVALID_DELETION_TASK_STATUS';
  end if;
  update public.deletion_tasks
  set status = p_status,
      last_error = case when p_status = 'pending' then left(nullif(p_last_error, ''), 500) else null end
  where id = p_task_id and user_id = p_user_id;
  if not found then raise exception using errcode = 'P0002', message = 'DELETION_TASK_NOT_FOUND'; end if;
end $$;

alter table public.deletion_tasks enable row level security;
revoke all privileges on table public.deletion_tasks from public, anon, authenticated, service_role;
grant select, insert, update on table public.deletion_tasks to service_role;

revoke all on function public.claim_deletion_task(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.set_deletion_task_state(uuid, uuid, text, text) from public, anon, authenticated, service_role;
revoke all on function public.enqueue_persona_photo_deletion() from public, anon, authenticated, service_role;
revoke all on function public.enqueue_persona_deletion() from public, anon, authenticated, service_role;
grant execute on function public.claim_deletion_task(uuid, uuid) to service_role;
grant execute on function public.set_deletion_task_state(uuid, uuid, text, text) to service_role;

commit;
