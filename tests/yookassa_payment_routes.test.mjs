import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";

const read = (path) => fs.readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("create route accepts only photoshoot_id and supported payment_method", async () => {
  const source = await read("src/app/api/payments/yookassa/create/route.ts");
  assert.match(source, /PAYMENT_METHODS.*bank_card.*sbp/s);
  assert.match(source, /photoshoot_id/);
  assert.doesNotMatch(source, /body\.amount|body\.currency|body\.status/);
  assert.match(source, /Auth required/);
});

test("service enforces ownership, payable status and snapshot price", async () => {
  const source = await read("src/lib/payments/service.ts");
  assert.match(source, /lookup\.data\.user_id !== input\.userId/);
  assert.match(source, /pending.*awaiting_payment/s);
  assert.match(source, /package_snapshot/);
  assert.match(source, /price_rub/);
  assert.match(source, /return priceRub \* 100/);
  assert.doesNotMatch(source, /input\.amount|input\.currency|input\.status/);
});

test("repeated create reuses pending attempt and its idempotency key", async () => {
  const source = await read("src/lib/payments/service.ts");
  assert.match(source, /from\("payments"\).*eq\("photoshoot_id".*eq\("status", "pending"\)/s);
  assert.match(source, /idempotencyKey: internalPayment\.idempotency_key/);
  assert.match(source, /created\.error\?\.code === "23505"/);
  assert.match(source, /internalPayment\.payment_method !== input\.paymentMethod/);
  assert.match(source, /attribution_snapshot: photoshoot\.attribution_snapshot/);
});

test("provider response and stored snapshot are safe", async () => {
  const service = await read("src/lib/payments/service.ts");
  const route = await read("src/app/api/payments/yookassa/create/route.ts");
  assert.match(service, /safeProviderSnapshot/);
  assert.doesNotMatch(service, /authorization|secretKey|customer/);
  assert.match(service, /paymentId.*status.*confirmationUrl/s);
  assert.doesNotMatch(route, /provider_snapshot|provider_payment_id|idempotency_key/);
});

test("status endpoint is authenticated, owner-scoped and read-only", async () => {
  const route = await read("src/app/api/payments/[id]/status/route.ts");
  const service = await read("src/lib/payments/service.ts");
  assert.match(route, /Auth required/);
  assert.match(service, /eq\("id", input\.paymentId\)\.eq\("user_id", input\.userId\)/);
  assert.doesNotMatch(route, /getYooKassaClient|\.update\(|\.insert\(/);
  assert.match(route, /private, no-store/);
});
