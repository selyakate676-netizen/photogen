import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const worker = await read("src/lib/payments/cloudpayments-generation-worker.ts");
const route = await read("src/app/api/internal/cloudpayments-generation/route.ts");
const auth = await read("src/lib/payments/cloudpayments-cron-auth.ts");
const webhook = await read("src/app/api/payments/cloudpayments/[event]/route.ts");
const adapter = await read("src/lib/ai/mvp-generation-adapter.ts");
const recovery = await read("supabase_cloudpayments_rub_generation_recovery.sql");

test("Pay webhook persists payment and returns without starting Replicate", () => {
  assert.ok(webhook.indexOf("verifyCloudPaymentsSignature") < webhook.indexOf("process_cloudpayments_notification"));
  assert.doesNotMatch(webhook, /startQueuedPhotoshootGenerationFromPayment|startMvpGenerationForPhotoshoot|Replicate/);
  assert.match(webhook, /return NextResponse\.json\(\{ code: 0 \}\)/);
});

test("cron endpoint requires a server-only constant-time bearer secret", () => {
  assert.match(auth, /import "server-only"/);
  assert.match(auth, /getCloudPaymentsGenerationCronSecret/);
  assert.match(auth, /createHash\("sha256"\)/);
  assert.match(auth, /timingSafeEqual/);
  assert.match(route, /verifyCloudPaymentsCronAuthorization\(request\.headers\.get\("authorization"\)\)/);
  assert.doesNotMatch(route + auth, /NEXT_PUBLIC_CLOUDPAYMENTS_GENERATION_CRON_SECRET/);
});

test("worker starts only succeeded linked direct RUB payments", () => {
  assert.match(worker, /from\("cloudpayments_payments"\)[\s\S]*eq\("purchase_type", "direct_photoshoot"\)[\s\S]*eq\("provider", "cloudpayments"\)[\s\S]*eq\("status", "succeeded"\)/);
  assert.match(worker, /eq\("photoshoots\.status", "queued"\)/);
  assert.match(worker, /eq\("photoshoots\.payment_source", "rub"\)/);
  assert.match(worker, /linked\.payment_id !== payment\.id/);
});

test("overlapping cron runs remain fenced by the existing atomic claim", () => {
  assert.match(worker, /DEFAULT_START_LIMIT = 1/);
  assert.match(worker, /startQueuedPhotoshootGenerationFromPayment/);
  assert.match(adapter, /claimPhotoshootGeneration\(serviceClient, photoshoot\.id\)/);
  assert.match(recovery, /select \* into v_photoshoot from public\.photoshoots where id = p_photoshoot_id for update/);
  assert.match(recovery, /if v_photoshoot\.status <> 'queued' then return false/);
});

test("pre-provider interruption survives restart and only proven not_started work is recovered", () => {
  assert.match(worker, /provider_dispatch_state", "not_started"/);
  assert.match(worker, /recover_rub_generation_pre_provider/);
  assert.match(recovery, /generation_claimed_at > now\(\) - interval '15 minutes'/);
  assert.match(recovery, /provider_dispatch_state <> 'not_started'/);
  assert.match(recovery, /set status = 'queued', generation_attempt_id = null/);
});

test("unknown Replicate outcomes are visible but never automatically retried", () => {
  assert.match(worker, /in\("provider_dispatch_state", \["dispatching", "ambiguous"\]\)/);
  assert.match(worker, /rub_generation_manual_attention_required/);
  const recoverCall = worker.indexOf("recover_rub_generation_pre_provider");
  const attentionScan = worker.indexOf('["dispatching", "ambiguous"]');
  assert.ok(recoverCall >= 0 && attentionScan > recoverCall);
  assert.match(adapter, /markRubProviderDispatchAmbiguous/);
});

test("worker bounds recovery, starts, deadline and parallelism without touching crystal flow", () => {
  assert.match(worker, /DEFAULT_RUN_BUDGET_MS = 50_000/);
  assert.match(worker, /DEFAULT_RECOVERY_LIMIT = 10/);
  assert.match(worker, /DEFAULT_START_LIMIT = 1/);
  assert.match(worker, /Date\.now\(\) >= deadline/);
  assert.doesNotMatch(worker, /debit_wallet|payment_source", "crystals"/);
});
