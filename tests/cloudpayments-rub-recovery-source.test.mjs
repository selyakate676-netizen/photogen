import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../supabase_cloudpayments_rub_generation_recovery.sql", import.meta.url), "utf8");
const adapter = await readFile(new URL("../src/lib/ai/mvp-generation-adapter.ts", import.meta.url), "utf8");

test("only proven pre-provider RUB failures can be requeued", () => {
  assert.match(migration, /provider_dispatch_state <> 'not_started'/);
  assert.match(migration, /generation_id[\s\S]*is not null/);
  assert.match(migration, /array_length\(v_photoshoot\.result_images/);
  assert.match(migration, /generation_claimed_at > now\(\) - interval '15 minutes'/);
  assert.match(migration, /p\.status = 'succeeded'/);
});

test("provider dispatch is fenced by a generation attempt token", () => {
  assert.match(migration, /generation_attempt_id is distinct from p_generation_attempt_id/);
  assert.match(adapter, /beginRubProviderDispatch[\s\S]*provider_call_started/);
  assert.match(adapter, /RUB_PROVIDER_DISPATCH_NOT_ALLOWED/);
});

test("unknown provider POST result is ambiguous and never auto-recovered", () => {
  const providerCall = adapter.indexOf("createPredictionWithRateLimit(replicate");
  const ambiguous = adapter.indexOf("markRubProviderDispatchAmbiguous", providerCall);
  assert.ok(providerCall >= 0 && ambiguous > providerCall);
  assert.match(migration, /provider_dispatch_state = 'ambiguous'/);
  const recovery = migration.slice(migration.indexOf("create or replace function public.recover_rub_generation_pre_provider"));
  assert.doesNotMatch(recovery, /provider_dispatch_state in \('not_started', 'dispatching'/);
});

test("multi-HC prediction ids are appended atomically before another dispatch", () => {
  assert.match(migration, /string_to_array\(coalesce\(v_photoshoot\.generation_id/);
  assert.match(migration, /array_append\(v_ids, btrim\(p_prediction_id\)\)/);
  assert.match(adapter, /confirmRubProviderPrediction/);
});

test("crystal path remains outside RUB dispatch recovery", () => {
  assert.match(migration, /else[\s\S]*perform public\.debit_wallet/);
  assert.match(adapter, /if \(photoshoot\.payment_source === "rub"\)/);
});
