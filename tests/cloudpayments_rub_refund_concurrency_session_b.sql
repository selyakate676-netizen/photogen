-- Start while session A is sleeping. This call must wait for session A to commit,
-- then return the same intent instead of inserting a second active row.
-- Required psql variables: payment_id (same value as session A), amount_minor.

begin;
set local role service_role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'service_role', true);

select (public.register_cloudpayments_rub_refund_intent(
  :'payment_id'::uuid,
  :'amount_minor'::bigint,
  'two-session concurrency probe B'
)).id as session_b_refund_id;

select count(*) as active_refund_count
from public.cloudpayments_rub_refunds
where payment_id = :'payment_id'::uuid
  and status in ('intent', 'pending', 'succeeded');

commit;

-- PASS requires matching session_a_refund_id/session_b_refund_id and
-- active_refund_count = 1. Roll the isolated database back to its snapshot after the test.
