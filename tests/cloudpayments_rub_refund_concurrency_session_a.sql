-- Run concurrently with cloudpayments_rub_refund_concurrency_session_b.sql.
-- Required psql variables: payment_id (succeeded direct RUB payment), amount_minor.
-- Start this session first; session B must start while pg_sleep is active.

begin;
set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);

select (public.register_cloudpayments_rub_refund_intent(
  :'payment_id'::uuid,
  :'amount_minor'::bigint,
  'two-session concurrency probe A'
)).id as session_a_refund_id;

select pg_sleep(10);
commit;
