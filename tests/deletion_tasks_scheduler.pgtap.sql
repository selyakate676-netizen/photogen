begin;
create extension if not exists pgtap;
select plan(7);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values ('98000000-0000-4000-8000-000000000098', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'scheduler@example.test', '', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '98000000-0000-4000-8000-000000000098', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select public.create_persona(null, null, null, 'woman', 'green');
select public.create_persona('Scheduled Retry', 170, 60, 'woman', 'brown');
select public.add_persona_photo(
  (select id from public.personas where name = 'Scheduled Retry'),
  'personas/98000000-0000-4000-8000-000000000098/' ||
    (select id from public.personas where name = 'Scheduled Retry') || '/retry.jpg'
);
select public.prepare_persona_photo_deletion(
  (select id from public.personas where name = 'Scheduled Retry'),
  (select id from public.persona_photos where storage_path like '%/retry.jpg')
);
select ok(
  not has_function_privilege('authenticated', 'public.finalize_deletion_task(uuid)', 'EXECUTE'),
  'authenticated users cannot invoke trusted finalization'
);
reset role;

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
select public.claim_deletion_task(
  (select id from public.deletion_tasks),
  '98000000-0000-4000-8000-000000000098'
);
select public.set_deletion_task_state(
  (select id from public.deletion_tasks),
  '98000000-0000-4000-8000-000000000098', 'storage_deleted', null
);
select lives_ok(
  format('select public.finalize_deletion_task(%L)', (select id from public.deletion_tasks)),
  'service role finalizes a storage-cleaned task'
);
select is((select count(*) from public.persona_photos where storage_path like '%/retry.jpg'), 0::bigint,
  'trusted retry uses the existing photo finalizer');
select is((select attempts from public.deletion_tasks), 1,
  'trusted finalization does not alter attempt counting');
select is((select status from public.deletion_tasks), 'storage_deleted',
  'worker retains responsibility for marking completion');
select lives_ok(
  format('select public.finalize_deletion_task(%L)', (select id from public.deletion_tasks)),
  'finalization is idempotent when the entity is already absent'
);
select public.set_deletion_task_state(
  (select id from public.deletion_tasks),
  '98000000-0000-4000-8000-000000000098', 'pending', 'retry later'
);
select throws_ok(
  format('select public.finalize_deletion_task(%L)', (select id from public.deletion_tasks)),
  'P0002', 'DELETION_TASK_NOT_READY',
  'finalization cannot run before storage cleanup succeeds'
);

select * from finish();
rollback;
