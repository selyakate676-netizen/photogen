begin;
create extension if not exists pgtap;
select plan(20);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values ('99000000-0000-4000-8000-000000000099', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'deletion-tasks@example.test', '', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '99000000-0000-4000-8000-000000000099', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select public.create_persona(null, null, null, 'woman', 'green');
select public.create_persona('Retry Persona', 170, 60, 'woman', 'brown');
select public.add_persona_photo(
  (select id from public.personas where name = 'Retry Persona'),
  'personas/99000000-0000-4000-8000-000000000099/' ||
    (select id from public.personas where name = 'Retry Persona') || '/retry.jpg'
);

select public.prepare_persona_photo_deletion(
  (select id from public.personas where name = 'Retry Persona'),
  (select id from public.persona_photos where storage_path like '%/retry.jpg')
);
reset role;

select ok(
  not has_table_privilege('authenticated', 'public.deletion_tasks', 'SELECT'),
  'authenticated cannot read the service-only manifest'
);
select is((select count(*) from public.deletion_tasks), 1::bigint, 'photo reservation atomically creates one task');
select is((select entity_type from public.deletion_tasks), 'persona_photo', 'photo task has known entity type');
select is(
  (select entity_id from public.deletion_tasks),
  (select id from public.persona_photos where storage_path like '%/retry.jpg'),
  'photo task points to PersonaPhoto'
);
select is(
  (select object_key from public.deletion_tasks),
  (select storage_path from public.persona_photos where storage_path like '%/retry.jpg'),
  'photo task stores exact object key'
);
select is((select status from public.deletion_tasks), 'pending', 'new task is pending');
select is((select attempts from public.deletion_tasks), 0, 'new task has zero attempts');
select is((select last_error from public.deletion_tasks), null::text, 'new task has no error');

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
select public.claim_deletion_task(
  (select id from public.deletion_tasks),
  '99000000-0000-4000-8000-000000000099'
);
select is((select attempts from public.deletion_tasks), 1, 'claim increments attempts');
select is((select status from public.deletion_tasks), 'processing', 'claim marks task processing');
select public.set_deletion_task_state(
  (select id from public.deletion_tasks),
  '99000000-0000-4000-8000-000000000099',
  'pending',
  'temporary storage error'
);
select is((select status from public.deletion_tasks), 'pending', 'temporary failure keeps task retryable');
select is((select last_error from public.deletion_tasks), 'temporary storage error', 'temporary failure is recorded');
select public.claim_deletion_task(
  (select id from public.deletion_tasks),
  '99000000-0000-4000-8000-000000000099'
);
select is((select attempts from public.deletion_tasks), 2, 'retry increments attempts again');
select public.set_deletion_task_state(
  (select id from public.deletion_tasks),
  '99000000-0000-4000-8000-000000000099',
  'completed',
  null
);
select is((select status from public.deletion_tasks), 'completed', 'successful retry completes task');
select is((select last_error from public.deletion_tasks), null::text, 'completion clears last error');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '99000000-0000-4000-8000-000000000099', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select public.cancel_persona_photo_deletion(
  (select id from public.personas where name = 'Retry Persona'),
  (select id from public.persona_photos where storage_path like '%/retry.jpg')
);
select public.prepare_persona_deletion((select id from public.personas where name = 'Retry Persona'));
reset role;

select is(
  (select count(*) from public.deletion_tasks where entity_type = 'persona'),
  1::bigint,
  'Persona reservation creates one prefix task'
);
select is(
  (select object_key from public.deletion_tasks where entity_type = 'persona'),
  'personas/99000000-0000-4000-8000-000000000099/' ||
    (select id from public.personas where name = 'Retry Persona') || '/',
  'Persona task stores the known private prefix'
);
select is(
  (select attempts from public.deletion_tasks where entity_type = 'persona'),
  0,
  'Persona prefix task starts retryable'
);
select throws_ok(
  $$insert into public.deletion_tasks(user_id, object_key, entity_type, entity_id)
    values (
      '99000000-0000-4000-8000-000000000099',
      'unknown/key',
      'unknown',
      '99999999-0000-4000-8000-000000000999'
    )$$,
  '23514',
  'new row for relation "deletion_tasks" violates check constraint "deletion_tasks_entity_type_check"',
  'manifest rejects unknown cleanup types'
);
select is(
  (select count(*) from public.deletion_tasks where entity_type = 'persona' and status = 'pending'),
  1::bigint,
  'failed or interrupted cleanup remains available to reconcile'
);

select * from finish();
rollback;
