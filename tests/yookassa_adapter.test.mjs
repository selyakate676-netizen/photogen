import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import ts from "typescript";

async function loadModule(path, mocks = {}) {
  const source = await fs.readFile(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const compiledModule = { exports: {} };
  const localRequire = (id) => id in mocks ? mocks[id] : id === "server-only" ? {} : (() => { throw new Error(`Unexpected import: ${id}`); })();
  new Function("require", "module", "exports", code)(localRequire, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

const envMock = { getYooKassaConfig: () => ({ shopId: "shop", secretKey: "secret", isTestMode: true, returnUrl: "https://example.test/return" }) };

for (const method of ["bank_card", "sbp"]) {
  test(`creates ${method} redirect payment with server auth and idempotency`, async () => {
    let request;
    const fetchMock = async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify({ id: "provider-1", status: "pending", confirmation: { type: "redirect", confirmation_url: "https://pay.test/1" } }), { status: 200 });
    };
    const adapter = await loadModule("../src/lib/payments/yookassa.ts", {
      "@/lib/env": envMock,
      "@/lib/payments/types": {},
    });
    const client = adapter.createYooKassaClient({ shopId: "shop", secretKey: "secret" }, fetchMock);
    const result = await client.createPayment({ amountMinor: 26900, idempotencyKey: "idem-1", paymentMethod: method, returnUrl: "https://example.test/return", description: "PhotoGen", metadata: { payment_id: "internal-1" } });
    assert.equal(result.id, "provider-1");
    assert.equal(request.url, "https://api.yookassa.ru/v3/payments");
    assert.equal(request.init.headers["Idempotence-Key"], "idem-1");
    assert.equal(request.init.headers.Authorization, `Basic ${Buffer.from("shop:secret").toString("base64")}`);
    const body = JSON.parse(request.init.body);
    assert.deepEqual(body.amount, { value: "269.00", currency: "RUB" });
    assert.equal(body.capture, true);
    assert.equal(body.payment_method_data.type, method);
    assert.deepEqual(body.confirmation, { type: "redirect", return_url: "https://example.test/return" });
  });
}

test("normalizes provider failure without leaking credentials or payload", async () => {
  const adapter = await loadModule("../src/lib/payments/yookassa.ts", { "@/lib/env": envMock, "@/lib/payments/types": {} });
  const client = adapter.createYooKassaClient({ shopId: "shop", secretKey: "TOP-SECRET" }, async () => new Response(JSON.stringify({ description: "card data" }), { status: 400 }));
  await assert.rejects(
    client.createPayment({ amountMinor: 9900, idempotencyKey: "idem", paymentMethod: "bank_card", returnUrl: "https://example.test", description: "PhotoGen", metadata: {} }),
    (error) => error.code === "PROVIDER_REJECTED" && !error.message.includes("TOP-SECRET") && !error.message.includes("card data"),
  );
});

test("GET payment uses encoded provider id", async () => {
  let requestUrl;
  const adapter = await loadModule("../src/lib/payments/yookassa.ts", { "@/lib/env": envMock, "@/lib/payments/types": {} });
  const client = adapter.createYooKassaClient({ shopId: "shop", secretKey: "secret" }, async (url) => {
    requestUrl = url;
    return new Response(JSON.stringify({ id: "provider/1", status: "pending" }), { status: 200 });
  });
  await client.getPayment("provider/1");
  assert.equal(requestUrl, "https://api.yookassa.ru/v3/payments/provider%2F1");
});
