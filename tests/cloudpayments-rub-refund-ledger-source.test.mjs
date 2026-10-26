import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile("supabase_cloudpayments_rub_refund_ledger.sql", "utf8");
const worker = await readFile("src/lib/payments/cloudpayments-generation-worker.ts", "utf8");
const crystalRefund = await readFile("supabase_failed_generation_refund.sql", "utf8");

test("refund ledger serializes and deduplicates full refund intents", () => {
  assert.match(migration, /payment_id uuid not null references public\.cloudpayments_payments\(id\) on delete restrict/);
  assert.match(migration, /where status in \('intent', 'pending', 'succeeded'\)/);
  assert.match(migration, /from public\.cloudpayments_payments[\s\S]*where id = p_payment_id[\s\S]*for update/);
  assert.match(migration, /p_amount_minor <> v_payment\.amount_minor[\s\S]*FULL_REFUND_AMOUNT_MISMATCH/);
  assert.match(migration, /ACTIVE_OR_SUCCEEDED_REFUND_EXISTS/);
});

test("operator transitions are service-role only, idempotent, and auditable", () => {
  for (const fn of [
    "register_cloudpayments_rub_refund_intent",
    "record_cloudpayments_rub_refund_pending",
    "confirm_cloudpayments_rub_refund_succeeded",
    "record_cloudpayments_rub_refund_failed",
    "release_cloudpayments_rub_refund_generation",
  ]) {
    assert.match(migration, new RegExp(`create or replace function public\\.${fn}`));
    assert.match(migration, new RegExp(`grant execute on function public\\.${fn}[^;]+ to service_role`));
  }
  assert.match(migration, /status = 'succeeded' and v_refund\.refund_transaction_id = v_transaction_id[\s\S]*return v_refund/);
  assert.match(migration, /status = 'failed' and v_refund\.failure_reason = v_failure_reason[\s\S]*return v_refund/);
  assert.match(migration, /revoke all privileges on table public\.cloudpayments_rub_refunds from public, anon, authenticated, service_role/);
  assert.match(migration, /grant select on table public\.cloudpayments_rub_refunds to service_role/);
  assert.match(migration, /status <> 'failed'[\s\S]*REFUND_GENERATION_RELEASE_NOT_ALLOWED/);
});

test("unreleased failed refunds fence every RUB generation entry point", () => {
  const activeGate = /r\.status in \('intent', 'pending', 'succeeded', 'failed'\)/g;
  assert.ok((migration.match(activeGate) ?? []).length >= 3);
  assert.match(migration, /create or replace function public\.claim_photoshoot_generation[\s\S]*RUB_REFUND_ACTIVE/);
  assert.match(migration, /create or replace function public\.begin_rub_provider_dispatch[\s\S]*cloudpayments_rub_refunds/);
  assert.match(migration, /create or replace function public\.recover_rub_generation_pre_provider[\s\S]*cloudpayments_rub_refunds/);
  assert.match(worker, /from\("cloudpayments_rub_refunds"\)[\s\S]*\.in\("status", \["intent", "pending", "succeeded", "failed"\]\)/);
  assert.match(worker, /blockedPaymentIds\.has\(payment\.id\)/);
});

test("ambiguous or dispatched generations require manual reconciliation", () => {
  assert.match(migration, /provider_dispatch_state is distinct from 'not_started'/);
  assert.match(migration, /REFUND_BLOCKED_PROVIDER_RECONCILIATION_REQUIRED/);
});

test("RUB ledger does not alter crystal refund implementation", () => {
  assert.doesNotMatch(migration, /wallet_transactions|refund_failed_photoshoot|balance_crystals/);
  assert.match(crystalRefund, /refund_failed_photoshoot/);
});
