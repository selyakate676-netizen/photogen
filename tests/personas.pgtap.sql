begin;
create extension if not exists pgtap;
select plan(15);

-- Fixed test users. Tests roll back and never touch persistent application data.
insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
 ('10000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'persona-a@example.test', '', now(), now()),
 ('20000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'persona-b@example.test', '', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select lives_ok($$select public.create_persona(null, null, null, null, null)$$, 'default persona bootstraps');
select lives_ok($$select public.create_persona(null, null, null, null, null)$$, 'bootstrap is idempotent');
select is((select count(*) from public.personas where name = 'Я' and is_default), 1::bigint, 'only one Я exists');
select lives_ok($$select public.create_persona('Друг', 180, 75, 'man', 'green')$$, 'additional persona can be created');
select is((select count(*) from public.personas), 2::bigint, 'owner lists both personas');
select lives_ok($$
  update public.personas
  set name = 'Друг 2', height = 181, weight = 76, gender = 'man', eye_color = 'blue'
  where id = (select id from public.personas where name = 'Друг')
$$, 'additional persona can be edited');
select lives_ok($$select public.set_default_persona((select id from public.personas where name='Друг 2'))$$, 'default switches atomically');
select is((select count(*) from public.personas where is_default), 1::bigint, 'exactly one default remains');
select throws_ok($$select public.delete_persona((select id from public.personas where is_default))$$, '23514', 'DEFAULT_PERSONA_DELETE', 'default cannot be deleted');
select lives_ok($$select public.add_persona_photo((select id from public.personas where is_default), 'personas/10000000-0000-4000-8000-000000000001/'||(select id from public.personas where is_default)||'/1.jpg')$$, 'first photo activates draft');
select is((select status from public.personas where is_default), 'active', 'first photo sets active');
select lives_ok($$select public.delete_persona_photo((select id from public.personas where is_default), (select id from public.persona_photos where persona_id=(select id from public.personas where is_default)))$$, 'last active photo can be deleted');
select is((select status from public.personas where is_default), 'draft', 'deleting last active photo returns Persona to draft');
select ok((select is_default from public.personas where is_default), 'default Persona remains default without photos');

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.personas), 0::bigint, 'other user cannot list personas');
select * from finish();
rollback;
