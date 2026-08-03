begin;
create extension if not exists pgtap;
select plan(41);

select is(
  (select count(*) from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) privilege
   where has_table_privilege('anon', 'public.personas', privilege)),
  0::bigint,
  'anon has no direct Persona table privileges'
);
select is(
  (select count(*) from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) privilege
   where has_table_privilege('anon', 'public.persona_photos', privilege)),
  0::bigint,
  'anon has no direct Persona photo table privileges'
);
select is(
  (select count(*) from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) privilege
   where has_table_privilege('anon', 'public.photoshoots', privilege)),
  0::bigint,
  'anon has no direct photoshoot table privileges'
);

select is(
  (select count(*) from unnest(array['INSERT','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) privilege
   where has_table_privilege('authenticated', 'public.personas', privilege)),
  0::bigint,
  'authenticated has no unsafe Persona table privileges'
);
select is(
  (select count(*) from unnest(array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) privilege
   where has_table_privilege('authenticated', 'public.persona_photos', privilege)),
  0::bigint,
  'authenticated has no Persona photo write or administrative privileges'
);
select is(
  (select count(*) from unnest(array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) privilege
   where has_table_privilege('authenticated', 'public.photoshoots', privilege)),
  0::bigint,
  'authenticated has read-only photoshoot table access'
);
select ok(has_table_privilege('authenticated', 'public.personas', 'SELECT'), 'authenticated can select own Persona rows');
select ok(has_table_privilege('authenticated', 'public.personas', 'UPDATE'), 'authenticated can update editable owner Persona fields');
select ok(has_table_privilege('authenticated', 'public.persona_photos', 'SELECT'), 'authenticated can select own Persona photos');
select ok(has_table_privilege('authenticated', 'public.photoshoots', 'SELECT'), 'authenticated dashboard can select own photoshoots');

select ok(
  has_table_privilege('service_role', 'public.photoshoots', 'SELECT')
  and has_table_privilege('service_role', 'public.photoshoots', 'UPDATE'),
  'service_role can read and update internal photoshoot state'
);
select is(
  (select count(*) from unnest(array['INSERT','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) privilege
   where has_table_privilege('service_role', 'public.photoshoots', privilege)),
  0::bigint,
  'service_role has no unnecessary photoshoot table privileges'
);
select is(
  (select count(*)
   from (values ('public.personas'), ('public.persona_photos')) relation(name)
   cross join unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) privilege
   where has_table_privilege('service_role', relation.name, privilege)),
  0::bigint,
  'service_role has no direct Persona table privileges'
);

select is(
  (select count(*) from unnest(array[
    'public.create_persona(text,integer,integer,text,text)',
    'public.set_default_persona(uuid)',
    'public.delete_persona(uuid)',
    'public.add_persona_photo(uuid,text)',
    'public.delete_persona_photo(uuid,uuid)',
    'public.reorder_persona_photos(uuid,uuid[])',
    'public.create_photoshoot_with_persona(uuid,text,text[],text,text,text,text,integer,integer,text,text,text,integer,jsonb)',
    'public.confirm_mock_photoshoot_payment(uuid)'
  ]) signature where has_function_privilege('anon', signature, 'EXECUTE')),
  0::bigint,
  'anon cannot execute owner-facing Persona or order RPCs'
);
select is(
  (select count(*) from unnest(array[
    'public.transition_photoshoot_status(uuid,text,text)',
    'public.claim_photoshoot_generation(uuid)',
    'public.finish_photoshoot_generation(uuid,boolean,text)',
    'public.record_photoshoot_result_images(uuid,text[])',
    'public.is_photoshoot_status_transition_allowed(text,text)'
  ]) signature where has_function_privilege('anon', signature, 'EXECUTE')),
  0::bigint,
  'anon cannot execute lifecycle RPCs'
);
select is(
  (select count(*) from unnest(array[
    'public.create_persona(text,integer,integer,text,text)',
    'public.set_default_persona(uuid)',
    'public.delete_persona(uuid)',
    'public.add_persona_photo(uuid,text)',
    'public.delete_persona_photo(uuid,uuid)',
    'public.reorder_persona_photos(uuid,uuid[])',
    'public.create_photoshoot_with_persona(uuid,text,text[],text,text,text,text,integer,integer,text,text,text,integer,jsonb)',
    'public.confirm_mock_photoshoot_payment(uuid)'
  ]) signature where has_function_privilege('authenticated', signature, 'EXECUTE')),
  8::bigint,
  'authenticated retains every required owner-facing RPC'
);
select is(
  (select count(*) from unnest(array[
    'public.transition_photoshoot_status(uuid,text,text)',
    'public.claim_photoshoot_generation(uuid)',
    'public.finish_photoshoot_generation(uuid,boolean,text)',
    'public.record_photoshoot_result_images(uuid,text[])',
    'public.is_photoshoot_status_transition_allowed(text,text)'
  ]) signature where has_function_privilege('authenticated', signature, 'EXECUTE')),
  0::bigint,
  'authenticated cannot execute internal lifecycle RPCs'
);
select is(
  (select count(*) from unnest(array[
    'public.transition_photoshoot_status(uuid,text,text)',
    'public.claim_photoshoot_generation(uuid)',
    'public.finish_photoshoot_generation(uuid,boolean,text)',
    'public.record_photoshoot_result_images(uuid,text[])'
  ]) signature where has_function_privilege('service_role', signature, 'EXECUTE')),
  4::bigint,
  'service_role retains every required lifecycle RPC'
);
select is(
  (select count(*) from unnest(array[
    'public.create_persona(text,integer,integer,text,text)',
    'public.set_default_persona(uuid)',
    'public.delete_persona(uuid)',
    'public.add_persona_photo(uuid,text)',
    'public.delete_persona_photo(uuid,uuid)',
    'public.reorder_persona_photos(uuid,uuid[])',
    'public.create_photoshoot_with_persona(uuid,text,text[],text,text,text,text,integer,integer,text,text,text,integer,jsonb)',
    'public.confirm_mock_photoshoot_payment(uuid)'
  ]) signature where has_function_privilege('service_role', signature, 'EXECUTE')),
  0::bigint,
  'service_role has no owner-facing RPC grants'
);
select is(
  (select count(*) from unnest(array[
    'public.update_persona(uuid,text,integer,integer,text,text)'
  ]) signature where has_function_privilege('authenticated', signature, 'EXECUTE')),
  0::bigint,
  'unused update_persona RPC is not exposed'
);
select is(
  (select count(*)
   from (values ('anon'), ('authenticated'), ('service_role')) role_name(name)
   cross join unnest(array[
     'public.set_updated_at()',
     'public.guard_persona_protected_fields()',
     'public.persona_internal_write_on()',
     'public.guard_photoshoot_persona()',
     'public.guard_photoshoot_lifecycle()',
     'public.is_photoshoot_status_transition_allowed(text,text)'
   ]) signature
   where has_function_privilege(role_name.name, signature, 'EXECUTE')),
  0::bigint,
  'API roles cannot execute trigger or invariant helpers directly'
);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values ('93000000-0000-4000-8000-000000000093', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'acl-owner@example.test', '', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000093', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$select public.create_persona(null, null, null, 'woman', 'green')$$,
  'authenticated bootstrap Persona RPC still works'
);
select lives_ok(
  $$select public.add_persona_photo(
    (select id from public.personas where user_id = auth.uid() and is_default),
    'personas/93000000-0000-4000-8000-000000000093/' ||
      (select id from public.personas where user_id = auth.uid() and is_default) || '/one.jpg'
  )$$,
  'authenticated owner can add a Persona photo through RPC'
);
select lives_ok(
  $$select public.create_photoshoot_with_persona(
    (select id from public.personas where user_id = auth.uid() and is_default),
    'acl-test', '{}', 'woman', 'average', 'green', '',
    null, null, null, null, null,
    2, '{"id":"acl-test","slug":"acl-test","name":"ACL test"}'::jsonb
  )$$,
  'authenticated owner can create a photoshoot through RPC'
);
select is(
  (select status from public.photoshoots where user_id = auth.uid() and style_id = 'acl-test'),
  'awaiting_payment',
  'new owner order waits for payment'
);
select throws_ok(
  $$select public.transition_photoshoot_status(
    (select id from public.photoshoots where user_id = auth.uid() and style_id = 'acl-test'),
    'paid'
  )$$,
  '42501', 'permission denied for function transition_photoshoot_status',
  'authenticated cannot perform awaiting_payment to paid directly'
);
select is(
  (select status from public.photoshoots where user_id = auth.uid() and style_id = 'acl-test'),
  'awaiting_payment',
  'blocked direct payment transition does not change status'
);
select lives_ok(
  $$select public.confirm_mock_photoshoot_payment(
    (select id from public.photoshoots where user_id = auth.uid() and style_id = 'acl-test')
  )$$,
  'owner-facing mock payment RPC remains available'
);
select is(
  (select status from public.photoshoots where user_id = auth.uid() and style_id = 'acl-test'),
  'queued',
  'mock payment still queues the owner order'
);
select throws_ok(
  $$select public.claim_photoshoot_generation(
    (select id from public.photoshoots where user_id = auth.uid() and style_id = 'acl-test')
  )$$,
  '42501', 'permission denied for function claim_photoshoot_generation',
  'authenticated cannot claim generation'
);
select throws_ok(
  $$select public.finish_photoshoot_generation(
    (select id from public.photoshoots where user_id = auth.uid() and style_id = 'acl-test'), true
  )$$,
  '42501', 'permission denied for function finish_photoshoot_generation',
  'authenticated cannot finish generation'
);
select throws_ok(
  $$select public.record_photoshoot_result_images(
    (select id from public.photoshoots where user_id = auth.uid() and style_id = 'acl-test'), '{}'
  )$$,
  '42501', 'permission denied for function record_photoshoot_result_images',
  'authenticated cannot record result images'
);

reset role;
grant execute on function public.transition_photoshoot_status(uuid, text, text) to authenticated;
grant execute on function public.claim_photoshoot_generation(uuid) to authenticated;
grant execute on function public.finish_photoshoot_generation(uuid, boolean, text) to authenticated;
grant execute on function public.record_photoshoot_result_images(uuid, text[]) to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000093', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok(
  $$select public.transition_photoshoot_status(
    (select id from public.photoshoots where user_id = auth.uid() and style_id = 'acl-test'), 'generating'
  )$$,
  '42501', 'SERVICE_ROLE_REQUIRED',
  'transition RPC body rejects authenticated even after an accidental grant'
);
select throws_ok(
  $$select public.claim_photoshoot_generation(
    (select id from public.photoshoots where user_id = auth.uid() and style_id = 'acl-test')
  )$$,
  '42501', 'SERVICE_ROLE_REQUIRED',
  'claim RPC body rejects authenticated even after an accidental grant'
);
select throws_ok(
  $$select public.finish_photoshoot_generation(
    (select id from public.photoshoots where user_id = auth.uid() and style_id = 'acl-test'), false
  )$$,
  '42501', 'SERVICE_ROLE_REQUIRED',
  'finish RPC body rejects authenticated even after an accidental grant'
);
select throws_ok(
  $$select public.record_photoshoot_result_images(
    (select id from public.photoshoots where user_id = auth.uid() and style_id = 'acl-test'), '{}'
  )$$,
  '42501', 'SERVICE_ROLE_REQUIRED',
  'result RPC body rejects authenticated even after an accidental grant'
);

reset role;
revoke all privileges on function public.transition_photoshoot_status(uuid, text, text) from authenticated;
revoke all privileges on function public.claim_photoshoot_generation(uuid) from authenticated;
revoke all privileges on function public.finish_photoshoot_generation(uuid, boolean, text) from authenticated;
revoke all privileges on function public.record_photoshoot_result_images(uuid, text[]) from authenticated;

set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select ok(
  public.claim_photoshoot_generation(
    (select id from public.photoshoots where style_id = 'acl-test')
  ),
  'service_role atomically claims the queued order'
);
select is(
  public.claim_photoshoot_generation(
    (select id from public.photoshoots where style_id = 'acl-test')
  ),
  false,
  'service_role second claim is a safe no-op'
);
select lives_ok(
  $$select public.record_photoshoot_result_images(
    (select id from public.photoshoots where style_id = 'acl-test'),
    array['photoshoots/generations/' ||
      (select id from public.photoshoots where style_id = 'acl-test') || '/result_one.jpg']
  )$$,
  'service_role records generation results'
);
select lives_ok(
  $$select public.finish_photoshoot_generation(
    (select id from public.photoshoots where style_id = 'acl-test'), true
  )$$,
  'service_role completes generation'
);
select is(
  (select status from public.photoshoots where style_id = 'acl-test'),
  'completed',
  'service-role lifecycle flow reaches completed'
);

reset role;
select * from finish();
rollback;
