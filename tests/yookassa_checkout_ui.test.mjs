import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import ts from "typescript";

const read = (path) => fs.readFile(new URL(`../${path}`, import.meta.url), "utf8");

async function loadPolling() {
  const source = await read("src/lib/payments/polling.ts");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const compiledModule = { exports: {} };
  new Function("module", "exports", code)(compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

test("checkout offers bank card, hosted SBP and existing crystals flow", async () => {
  const source = await read("src/app/dashboard/pay/[id]/CheckoutPanel.tsx");
  assert.match(source, /'bank_card'/);
  assert.match(source, /'sbp'/);
  assert.match(source, /payWithCrystals/);
  assert.doesNotMatch(source, /QR|deeplink|deep link/i);
});

test("browser request sends only photoshoot id and payment method then redirects", async () => {
  const source = await read("src/app/dashboard/pay/[id]/CheckoutPanel.tsx");
  assert.match(source, /fetch\('\/api\/payments\/yookassa\/create'/);
  assert.match(source, /photoshoot_id:\s*photoshootId/);
  assert.match(source, /payment_method:\s*paymentMethod/);
  assert.doesNotMatch(source, /amount\s*:|currency\s*:|status\s*:/);
  assert.match(source, /window\.location\.assign\(confirmationUrl\.toString\(\)\)/);
  assert.match(source, /confirmationUrl\.protocol !== 'https:'/);
});

test("checkout analytics contains only the allowed payment method", async () => {
  const source = await read("src/app/dashboard/pay/[id]/CheckoutPanel.tsx");
  const page = await read("src/app/dashboard/pay/[id]/page.tsx");
  assert.match(source, /trackAnalyticsGoal\('payment_checkout_started', \{ payment_method: paymentMethod \}\)/);
  assert.doesNotMatch(source, /payment_checkout_started',\s*\{[^}]*photoshoot/i);
  assert.doesNotMatch(page, /AnalyticsEvent|payment_started/);
});

test("return page polls read-only status and never confirms payment", async () => {
  const source = await read("src/app/dashboard/pay/[id]/result/PaymentResult.tsx");
  assert.match(source, /\/api\/payments\/\$\{encodeURIComponent\(paymentId\)\}\/status/);
  assert.doesNotMatch(source, /confirm|webhook|yookassa\/create/i);
  assert.match(source, /clearTimeout\(timer\)/);
});

test("polling continues only for non-terminal results and has a finite limit", async () => {
  const { decidePaymentPoll } = await loadPolling();
  assert.equal(decidePaymentPoll("pending", 1, 40), "continue");
  assert.equal(decidePaymentPoll(null, 1, 3), "continue");
  assert.equal(decidePaymentPoll("succeeded", 1, 40), "succeeded");
  assert.equal(decidePaymentPoll("canceled", 1, 40), "canceled");
  assert.equal(decidePaymentPoll("pending", 40, 40), "error");
  assert.equal(decidePaymentPoll(null, 3, 3), "error");
});

test("result UI has pending, succeeded, canceled and safe error states", async () => {
  const source = await read("src/app/dashboard/pay/[id]/result/PaymentResult.tsx");
  for (const text of [
    "Проверяем оплату",
    "Оплата прошла",
    "Оплата не завершена",
    "Статус пока не получен",
    "Вернуться к оплате",
  ]) {
    assert.match(source, new RegExp(text));
  }
  assert.match(source, /href="\/account\/generated"/);
});

test("production checkout UI contains no mock-confirm action", async () => {
  const sources = await Promise.all([
    read("src/app/dashboard/pay/[id]/page.tsx"),
    read("src/app/dashboard/pay/[id]/CheckoutPanel.tsx"),
    read("src/app/dashboard/pay/[id]/SubmitPayButton.tsx"),
  ]);
  const ui = sources.join("\n");
  assert.doesNotMatch(ui, /mockPayment|confirmMock|эмуляц|заглушк/i);
});
