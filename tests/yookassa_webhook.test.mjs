import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import ts from "typescript";

async function compile(path, requireMap) {
  const source = await fs.readFile(new URL("../" + path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const compiledModule = { exports: {} };
  const localRequire = (name) => {
    if (name in requireMap) return requireMap[name];
    throw new Error("Unexpected import: " + name);
  };
  new Function("require", "module", "exports", "Buffer", code)(
    localRequire,
    compiledModule,
    compiledModule.exports,
    Buffer,
  );
  return compiledModule.exports;
}

const adapterModule = await compile("src/lib/payments/yookassa.ts", {
  "server-only": {},
  "@/lib/env": { getYooKassaConfig: () => ({}) },
});
const webhookModule = await compile("src/lib/payments/webhook.ts", {
  "server-only": {},
  "@/lib/payments/yookassa": { getYooKassaClient: () => ({}) },
  "@/utils/supabase/admin": { createServiceRoleClient: () => ({}) },
});

const { createYooKassaClient } = adapterModule;
const { processVerifiedYooKassaPayment, YooKassaWebhookError } = webhookModule;

const basePayment = () => ({
  id: "internal-payment",
  user_id: "user",
  photoshoot_id: "photoshoot",
  purpose: "photoshoot_purchase",
  provider: "yookassa",
  payment_method: "bank_card",
  provider_payment_id: "provider-payment",
  amount_minor: 18900,
  currency: "RUB",
  status: "pending",
  idempotency_key: "idem",
  is_test_mode: true,
  attribution_snapshot: null,
  provider_snapshot: null,
  failure_code: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  paid_at: null,
});

const providerPayment = (overrides = {}) => ({
  id: "provider-payment",
  status: "succeeded",
  paid: true,
  test: true,
  amount: { value: "189.00", currency: "RUB" },
  payment_method: { type: "bank_card" },
  ...overrides,
});

function harness({ payment: initial = basePayment(), provider = providerPayment(), unlocked = false } = {}) {
  let payment = initial;
  let isUnlocked = unlocked;
  let providerCalls = 0;
  let confirmCalls = 0;
  const walletCalls = 0;
  const analytics = [];

  const fetchMock = async (url, init) => {
    providerCalls += 1;
    assert.equal(url, "https://api.yookassa.ru/v3/payments/provider-payment");
    assert.equal(init.method, "GET");
    return new Response(JSON.stringify(provider), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  const client = createYooKassaClient({ shopId: "shop", secretKey: "secret" }, fetchMock);

  return {
    deps: {
      findPayment: async (providerId) => providerId === payment?.provider_payment_id ? payment : null,
      getProviderPayment: (providerId) => client.getPayment(providerId),
      setTerminalStatus: async ({ status, providerSnapshot, failureCode }) => {
        if (!payment || payment.status !== "pending") return false;
        payment = { ...payment, status, provider_snapshot: providerSnapshot, failure_code: failureCode };
        return true;
      },
      isPhotoshootUnlocked: async () => isUnlocked,
      confirmPhotoshootPayment: async () => {
        confirmCalls += 1;
        isUnlocked = true;
      },
      emitAnalytics: (event, params) => analytics.push({ event, params }),
    },
    state: () => ({ payment, providerCalls, confirmCalls, walletCalls, analytics, isUnlocked }),
  };
}

test("confirmed succeeded webhook updates payment and unlocks exactly once", async () => {
  const h = harness();
  const first = await processVerifiedYooKassaPayment("provider-payment", h.deps);
  const second = await processVerifiedYooKassaPayment("provider-payment", h.deps);
  assert.deepEqual(first, { outcome: "processed", status: "succeeded" });
  assert.equal(second.outcome, "duplicate");
  assert.equal(h.state().payment.status, "succeeded");
  assert.equal(h.state().confirmCalls, 1);
  assert.equal(h.state().analytics.length, 1);
  assert.equal(h.state().analytics[0].event, "payment_completed");
  assert.deepEqual(Object.keys(h.state().analytics[0].params).sort(), [
    "amount", "currency", "is_test_mode", "payment_status",
  ]);
});

test("confirmed canceled webhook never unlocks and emits terminal analytics", async () => {
  const h = harness({ provider: providerPayment({ status: "canceled", paid: false }) });
  await processVerifiedYooKassaPayment("provider-payment", h.deps);
  assert.equal(h.state().payment.status, "canceled");
  assert.equal(h.state().confirmCalls, 0);
  assert.equal(h.state().walletCalls, 0);
  assert.equal(h.state().analytics[0].event, "payment_canceled");
});

test("forged or unknown provider id is ignored without provider HTTP", async () => {
  const h = harness();
  const result = await processVerifiedYooKassaPayment("forged", h.deps);
  assert.equal(result.outcome, "ignored");
  assert.equal(h.state().providerCalls, 0);
});

for (const [name, provider, code] of [
  ["provider id", providerPayment({ id: "other" }), "PROVIDER_PAYMENT_ID_MISMATCH"],
  ["amount", providerPayment({ amount: { value: "199.00", currency: "RUB" } }), "PAYMENT_AMOUNT_MISMATCH"],
  ["currency", providerPayment({ amount: { value: "189.00", currency: "USD" } }), "PAYMENT_CURRENCY_MISMATCH"],
  ["payment method", providerPayment({ payment_method: { type: "sbp" } }), "PAYMENT_METHOD_MISMATCH"],
  ["test mode", providerPayment({ test: false }), "PAYMENT_TEST_MODE_MISMATCH"],
]) {
  test("rejects confirmed provider " + name + " mismatch", async () => {
    const h = harness({ provider });
    await assert.rejects(
      () => processVerifiedYooKassaPayment("provider-payment", h.deps),
      (error) => error instanceof YooKassaWebhookError && error.code === code,
    );
    assert.equal(h.state().confirmCalls, 0);
  });
}

test("reordered notification uses current provider GET status, not notification event", async () => {
  const h = harness({ provider: providerPayment({ status: "succeeded" }) });
  const result = await processVerifiedYooKassaPayment("provider-payment", h.deps);
  assert.equal(result.status, "succeeded");
  assert.equal(h.state().confirmCalls, 1);
});

test("already succeeded and unlocked payment is a safe no-op", async () => {
  const h = harness({
    payment: { ...basePayment(), status: "succeeded" },
    unlocked: true,
  });
  const result = await processVerifiedYooKassaPayment("provider-payment", h.deps);
  assert.equal(result.outcome, "duplicate");
  assert.equal(h.state().confirmCalls, 0);
  assert.equal(h.state().analytics.length, 0);
});

test("already succeeded but not unlocked recovers trusted transition once", async () => {
  const h = harness({ payment: { ...basePayment(), status: "succeeded" } });
  const result = await processVerifiedYooKassaPayment("provider-payment", h.deps);
  assert.equal(result.outcome, "recovered");
  assert.equal(h.state().confirmCalls, 1);
  assert.equal(h.state().analytics.length, 1);
});

test("pending provider state does not mutate internal payment", async () => {
  const h = harness({ provider: providerPayment({ status: "waiting_for_capture", paid: false }) });
  const result = await processVerifiedYooKassaPayment("provider-payment", h.deps);
  assert.equal(result.outcome, "pending");
  assert.equal(h.state().payment.status, "pending");
  assert.equal(h.state().confirmCalls, 0);
});

test("route rejects malformed notifications and extracts only object.id", async () => {
  const source = await fs.readFile(
    new URL("../src/app/api/payments/yookassa/webhook/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /const paymentId = providerPaymentId\(notification\)/);
  assert.match(source, /INVALID_NOTIFICATION/);
  assert.doesNotMatch(source, /\.object\.(?:status|amount|payment_method)/);
});

test("webhook runtime does not import wallet or refund functions", async () => {
  const source = await fs.readFile(
    new URL("../src/lib/payments/webhook.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /wallet|ledger|refund|claim_photoshoot_generation/i);
  assert.match(source, /confirm_yookassa_photoshoot_payment/);
});
