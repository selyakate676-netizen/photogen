-- Trusted finalization for automatic retries. Storage cleanup remains in the app worker.
begin;

create or replace function public.finalize_deletion_task(p_task_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_task public.deletion_tasks;
  v_persona_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;

  select * into v_task from public.deletion_tasks
  where id = p_task_id and status = 'storage_deleted' for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'DELETION_TASK_NOT_READY';
  end if;

  -- Existing finalizers own all active-job checks and scrub semantics.
  perform set_config('request.jwt.claim.sub', v_task.user_id::text, true);
  if v_task.entity_type = 'persona_photo' then
    select persona_id into v_persona_id from public.persona_photos where id = v_task.entity_id;
    if found then perform public.delete_persona_photo(v_persona_id, v_task.entity_id); end if;
  elsif v_task.entity_type = 'persona' then
    if exists (select 1 from public.personas where id = v_task.entity_id) then
      perform public.delete_persona(v_task.entity_id);
    end if;
  else
    raise exception using errcode = '22023', message = 'INVALID_DELETION_TASK_TYPE';
  end if;
end $$;

revoke all on function public.finalize_deletion_task(uuid) from public, anon, authenticated, service_role;
grant execute on function public.finalize_deletion_task(uuid) to service_role;

commit;
