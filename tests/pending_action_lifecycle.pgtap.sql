begin;
create extension if not exists pgtap;
select plan(9);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('93000000-0000-4000-8000-000000000093', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pending-owner@example.test', '', now(), now()),
  ('94000000-0000-4000-8000-000000000094', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pending-other@example.test', '', now(), now());

set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select public.credit_wallet('93000000-0000-4000-8000-000000000093', 5, 'test:pending-action:credit');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000093', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select public.create_persona(null, null, null, 'woman', 'green');
select public.add_persona_photo(
  (select id from public.personas where user_id = auth.uid() and is_default),
  'personas/93000000-0000-4000-8000-000000000093/' ||
    (select id from public.personas where user_id = auth.uid() and is_default) || '/one.jpg'
);

select public.create_photoshoot_with_persona(
  (select id from public.personas where user_id = auth.uid() and is_default),
  'pending-safe', '{}', 'woman', 'average', 'green', '',
  null, null, null, null, null, 2,
  '{"id":"pending-safe","slug":"pending-safe","name":"Pending safe","price_crystals":1}'::jsonb
);
select public.create_photoshoot_with_persona(
  (select id from public.personas where user_id = auth.uid() and is_default),
  'pending-provider', '{}', 'woman', 'average', 'green', '',
  null, null, null, null, null, 2,
  '{"id":"pending-provider","slug":"pending-provider","name":"Pending provider","price_crystals":1}'::jsonb
);
select public.create_photoshoot_with_persona(
  (select id from public.personas where user_id = auth.uid() and is_default),
  'pending-results', '{}', 'woman', 'average', 'green', '',
  null, null, null, null, null, 2,
  '{"id":"pending-results","slug":"pending-results","name":"Pending results","price_crystals":1}'::jsonb
);
select public.create_photoshoot_with_persona(
  (select id from public.personas where user_id = auth.uid() and is_default),
  'pending-paid', '{}', 'woman', 'average', 'green', '',
  null, null, null, null, null, 2,
  '{"id":"pending-paid","slug":"pending-paid","name":"Pending paid","price_crystals":1}'::jsonb
);

select ok(
  public.is_photoshoot_safe_to_cancel((select id from public.photoshoots where style_id = 'pending-safe')),
  'unpaid and unstarted photoshoot requires action and is safe to cancel'
);
select ok(
  public.cancel_unstarted_photoshoot((select id from public.photoshoots where style_id = 'pending-safe')),
  'safe pre-generation photoshoot can be cancelled'
);
select is(
  (select status from public.photoshoots where style_id = 'pending-safe'),
  'cancelled',
  'safe cancel reaches cancelled'
);

reset role;
select set_config('photogen.allow_status_transition', 'on', true);
update public.photoshoots set generation_id = 'provider-prediction'
where style_id = 'pending-provider';
update public.photoshoots
set result_images = array['photoshoots/generations/test/result.jpg']
where style_id = 'pending-results';

set local role authenticated;
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000093', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  public.is_photoshoot_safe_to_cancel((select id from public.photoshoots where style_id = 'pending-provider')),
  false,
  'provider-associated photoshoot cannot be cancelled'
);
select is(
  public.is_photoshoot_safe_to_cancel((select id from public.photoshoots where style_id = 'pending-results')),
  false,
  'photoshoot with results cannot be cancelled'
);
select public.confirm_mock_photoshoot_payment((select id from public.photoshoots where style_id = 'pending-paid'));
select is(
  public.is_photoshoot_safe_to_cancel((select id from public.photoshoots where style_id = 'pending-paid')),
  false,
  'paid and wallet-debited photoshoot cannot be cancelled'
);
select is(
  public.cancel_unstarted_photoshoot((select id from public.photoshoots where style_id = 'pending-paid')),
  false,
  'atomic cancel rejects a paid photoshoot'
);

select set_config('request.jwt.claim.sub', '94000000-0000-4000-8000-000000000094', true);
select is(
  public.is_photoshoot_safe_to_cancel((select id from public.photoshoots where style_id = 'pending-provider')),
  false,
  'foreign photoshoot is not exposed as cancellable'
);

reset role;
select ok(
  not has_function_privilege('anon', 'public.cancel_unstarted_photoshoot(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.cancel_unstarted_photoshoot(uuid)', 'EXECUTE'),
  'cancel RPC is authenticated-only'
);

select * from finish();
rollback;
