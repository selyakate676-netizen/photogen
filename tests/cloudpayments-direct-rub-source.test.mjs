import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../supabase_cloudpayments_direct_rub.sql", import.meta.url), "utf8");
const webhook = await readFile(new URL("../src/app/api/payments/cloudpayments/[event]/route.ts", import.meta.url), "utf8");
const create = await readFile(new URL("../src/app/api/payments/cloudpayments/create/route.ts", import.meta.url), "utf8");
const signature = await readFile(new URL("../src/lib/payments/cloudpayments.ts", import.meta.url), "utf8");

test("checkout fixes RUB amount and invoice on the server", () => {
  assert.match(migration, /package_snapshot->>'price_rub'/);
  assert.match(migration, /v_price_text::bigint \* 100/);
  assert.doesNotMatch(create, /payload\.(amount|currency|status|invoiceId)/);
});
test("only the server can create a payment for the authenticated order owner", () => {
  assert.match(migration, /create_cloudpayments_payment\(\s*p_photoshoot_id uuid,\s*p_user_id uuid\s*\)/);
  assert.match(migration, /drop function if exists public\.create_cloudpayments_payment\(uuid\)/);
  assert.match(migration, /SERVICE_ROLE_REQUIRED/);
  assert.match(migration, /where id = p_photoshoot_id and user_id = p_user_id for update/);
  assert.match(migration, /grant execute on function public\.create_cloudpayments_payment\(uuid, uuid\) to service_role/);
  assert.doesNotMatch(migration, /grant execute on function public\.create_cloudpayments_payment[^;]+to authenticated/);
  assert.match(create, /\.eq\("user_id", user\.id\)/);
  assert.match(create, /createServiceRoleClient\(\)/);
  assert.match(create, /p_user_id: user\.id/);
  assert.doesNotMatch(create, /payload\.userId/);
});
test("payment schema reserves a future top-up type without implementing it", () => {
  assert.match(migration, /purchase_type in \('direct_photoshoot', 'crystal_topup'\)/);
  assert.match(migration, /purchase_type = 'crystal_topup' and photoshoot_id is null/);
  assert.match(migration, /v_payment\.purchase_type <> 'direct_photoshoot'/);
});
test("notifications verify raw body before service-role RPC", () => {
  assert.match(webhook, /const rawBody = await request\.text\(\)/);
  assert.match(signature, /createHmac\("sha256"/);
  assert.match(signature, /timingSafeEqual/);
  assert.ok(webhook.indexOf("verifyCloudPaymentsSignature") < webhook.indexOf("process_cloudpayments_notification"));
});
test("RUB claim bypasses wallet only after succeeded linked payment", () => {
  assert.match(migration, /payment_source = 'rub'[\s\S]*status = 'succeeded'/);
  assert.match(migration, /else[\s\S]*perform public\.debit_wallet\(/);
  assert.match(migration, /MOCK_PAYMENT_FOR_RUB_FORBIDDEN/);
  assert.match(migration, /PAYMENT_LINKAGE_TRUSTED_OPERATION_REQUIRED/);
});
test("Pay is idempotent and Fail cannot undo success", () => {
  assert.match(migration, /if v_payment\.status = 'succeeded'[\s\S]*return query select true, false/);
  assert.match(migration, /if v_payment\.status <> 'succeeded' then[\s\S]*status = 'failed'/);
  assert.match(webhook, /data\.should_start_generation/);
});
test("payment secrets and payloads are not logged", () => {
  assert.match(signature, /import "server-only"/);
  assert.doesNotMatch(webhook + create + signature, /console\.(log|error|warn)/);
  assert.doesNotMatch(create, /CLOUDPAYMENTS_API_SECRET/);
});
