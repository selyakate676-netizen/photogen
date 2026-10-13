import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const page = await read('src/app/dashboard/pay/[id]/page.tsx');
const checkout = await read('src/app/dashboard/pay/[id]/CloudPaymentsCheckout.tsx');
const create = await read('src/app/api/payments/cloudpayments/create/route.ts');
const status = await read('src/app/api/payments/cloudpayments/status/route.ts');
const webhook = await read('src/app/api/payments/cloudpayments/[event]/route.ts');
const newPhotoshoot = await read('src/app/dashboard/new/page.tsx');
const config = await read('next.config.ts');
const gate = await read('src/lib/payments/cloudpayments-gate.ts');

test('RUB checkout uses the official widget and server-created parameters', () => {
  assert.match(checkout, /https:\/\/widget\.cloudpayments\.ru\/bundles\/cloudpayments\.js/);
  assert.match(checkout, /fetch\('\/api\/payments\/cloudpayments\/create'/);
  assert.match(checkout, /JSON\.stringify\(\{ photoshootId \}\)/);
  assert.match(checkout, /widget\.pay\('charge', payload/);
  for (const field of ['publicId', 'invoiceId', 'amount', 'currency', 'accountId']) {
    assert.match(create, new RegExp(`${field}:`));
  }
  assert.doesNotMatch(checkout, /CLOUDPAYMENTS_API_SECRET/);
  assert.doesNotMatch(checkout, /widget\.pay\('charge',\s*\{/);
});

test('checkout displays immutable snapshot price and RUB does not use mock payment', () => {
  assert.match(page, /snapshotPrice\([\s\S]*?'price_crystals' : 'price_rub'/);
  assert.doesNotMatch(page, /990\s*?|Оплатить \(эмуляция\)/);
  assert.match(page, /crystalFlow \?[\s\S]*?<form action=\{mockPayment\}>[\s\S]*?: rubCheckoutAllowed \? \([\s\S]*?<CloudPaymentsCheckout/);
});

test('status is authenticated, ownership-scoped and read-only', () => {
  assert.match(status, /supabase\.auth\.getUser\(\)/);
  assert.match(status, /\.eq\('user_id', user\.id\)/);
  assert.match(status, /\.eq\('photoshoot_id', photoshoot\.id\)/);
  assert.doesNotMatch(status, /createServiceRoleClient|\.insert\(|\.update\(|\.rpc\(/);
});

test('widget success waits for webhook-confirmed status before generation navigation', () => {
  assert.match(checkout, /onSuccess:[\s\S]*?beginStatusCheck/);
  assert.match(checkout, /paymentStatus === 'succeeded'/);
  assert.match(checkout, /MAX_POLL_ATTEMPTS = 30/);
  assert.doesNotMatch(checkout, /startQueuedPhotoshootGeneration|process_cloudpayments_notification/);
  assert.match(webhook, /event === "pay"[\s\S]*startQueuedPhotoshootGenerationFromPayment/);
});

test('pending reopen, failure, cancellation and repeated clicks are bounded', () => {
  assert.match(checkout, /initialPaymentStatus === 'pending'[\s\S]*setUiStatus\('checking'\)/);
  assert.match(checkout, /paymentStatus === 'failed'/);
  assert.match(checkout, /setUiStatus\('cancelled'\)/);
  assert.match(checkout, /if \(uiStatus === 'loading' \|\| uiStatus === 'checking'\) return/);
  assert.match(checkout, /disabled=\{isBusy\}/);
});

test('crystal selection survives photoshoot creation and keeps its existing action', () => {
  assert.match(newPhotoshoot, /paymentMethod === 'crystals' \? '\?payment=crystals' : ''/);
  assert.match(page, /query\.payment === 'crystals'/);
  assert.match(page, /form action=\{mockPayment\}/);
});

test('production CSP permits only the official widget origin additions', () => {
  assert.match(config, /script-src[^\n]+https:\/\/widget\.cloudpayments\.ru/);
  assert.match(config, /frame-src[^\n]+https:\/\/widget\.cloudpayments\.ru/);
});

test('RUB checkout is server-gated for controlled production rollout', () => {
  assert.match(gate, /getOptionalEnv\("CLOUDPAYMENTS_RUB_CHECKOUT_MODE", "off"\)/);
  assert.match(gate, /mode === "off"/);
  assert.match(gate, /mode === "all"/);
  assert.match(gate, /CLOUDPAYMENTS_RUB_CHECKOUT_TEST_USER_IDS/);
  assert.match(gate, /getAllowedTestUserIds\(\)\.has\(userId\)/);
  assert.match(create, /isCloudPaymentsRubCheckoutAllowed\(user\.id\)/);
  assert.match(create, /RUB_CHECKOUT_NOT_AVAILABLE/);
  assert.ok(create.indexOf('RUB_CHECKOUT_NOT_AVAILABLE') < create.indexOf('create_cloudpayments_payment'));
  assert.match(create, /\.eq\("user_id", user\.id\)/);
  assert.match(create, /createServiceRoleClient\(\)/);
  assert.match(create, /p_user_id: user\.id/);
  assert.match(page, /rubCheckoutAllowed = crystalFlow \|\| isCloudPaymentsRubCheckoutAllowed\(user\.id\)/);
  assert.match(page, /rubCheckoutAllowed \? \([\s\S]*?<CloudPaymentsCheckout/);
  assert.match(page, /Оплата банковской картой сейчас доступна только в закрытом тесте/);
});
