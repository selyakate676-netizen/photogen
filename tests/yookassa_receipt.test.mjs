import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import ts from "typescript";

async function loadReceipt() {
  const source = await fs.readFile(new URL("../src/lib/payments/receipt.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const compiledModule = { exports: {} };
  new Function("require", "module", "exports", code)(() => ({}), compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

test("receipt requires explicit fiscal settings and customer", async () => {
  const { buildYooKassaReceipt } = await loadReceipt();
  assert.throws(() => buildYooKassaReceipt({ customer: {}, description: "Pack", amountMinor: 9900, fiscal: { vatCode: 1, paymentMode: "full_payment", paymentSubject: "service" } }), /RECEIPT_CUSTOMER_REQUIRED/);
  assert.throws(() => buildYooKassaReceipt({ customer: { email: "a@example.test" }, description: "Pack", amountMinor: 9900 }), /RECEIPT_FISCAL_SETTINGS_REQUIRED/);
});

test("receipt uses caller-provided fiscal values", async () => {
  const { buildYooKassaReceipt } = await loadReceipt();
  const receipt = buildYooKassaReceipt({ customer: { email: "a@example.test" }, description: "Photo pack", amountMinor: 18900, fiscal: { vatCode: 6, paymentMode: "full_payment", paymentSubject: "service" } });
  assert.equal(receipt.items[0].amount.value, "189.00");
  assert.equal(receipt.items[0].vat_code, 6);
  assert.equal(receipt.items[0].payment_mode, "full_payment");
  assert.equal(receipt.items[0].payment_subject, "service");
});
