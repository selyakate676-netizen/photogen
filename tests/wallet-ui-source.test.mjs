import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pagePath = new URL('../src/app/account/wallet/page.tsx', import.meta.url);
const navbarPath = new URL('../src/components/Navbar.tsx', import.meta.url);
const detailsPath = new URL('../src/components/PhotoPackDetails.tsx', import.meta.url);
const hookPath = new URL('../src/lib/wallet/useCrystalWallet.ts', import.meta.url);

test('wallet page reads only the authenticated user wallet and ledger through RLS', async () => {
  const source = await readFile(pagePath, 'utf8');

  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /from\('wallets'\)/);
  assert.match(source, /select\('balance_crystals'\)/);
  assert.match(source, /from\('wallet_transactions'\)/);
  assert.match(source, /\.eq\('user_id', user\.id\)/g);
  assert.doesNotMatch(source, /service[_-]?role|createAdminClient/i);
});

test('wallet page renders zero balance, signed amounts, labels and empty state', async () => {
  const source = await readFile(pagePath, 'utf8');

  assert.match(source, /wallet\?\.balance_crystals \?\? 0/);
  assert.match(source, /isCredit \? '\+' : ''/);
  assert.match(source, /credit: 'Начисление'/);
  assert.match(source, /debit: 'Оплата фотосессии'/);
  assert.match(source, /Операций пока нет/);
  assert.match(source, /balance_after_crystals/);
  assert.match(source, /order\('created_at', \{ ascending: false \}\)/);
});

test('wallet UI does not select or render private ledger internals', async () => {
  const source = await readFile(pagePath, 'utf8');
  const selectedFields = source.match(/select\('([^']+)'\)/g) ?? [];

  assert.equal(selectedFields.some((selection) => /idempotency_key|metadata|reference_id|\bid\b/.test(selection)), false);
  assert.doesNotMatch(source, /transaction\.id\b/);
});

test('navbar and catalog use the same real RLS wallet balance without fake fallback', async () => {
  const [navbar, details, hook] = await Promise.all([
    readFile(navbarPath, 'utf8'),
    readFile(detailsPath, 'utf8'),
    readFile(hookPath, 'utf8'),
  ]);

  assert.match(navbar, /useCrystalWallet\(\)/);
  assert.match(navbar, /\{balance \?\? 0\}/);
  assert.match(details, /useCrystalWallet\(\)/);
  assert.match(details, /crystalBalance !== null && crystalBalance >= pack\.priceCrystals/);
  assert.match(hook, /from\('wallets'\)/);
  assert.match(hook, /select\('balance_crystals'\)/);
  assert.match(hook, /data\?\.balance_crystals \?\? 0/);
  assert.doesNotMatch(`${navbar}\n${details}\n${hook}`, /accountTokenBalance|const crystalBalance = 40/);
});

test('package crystal prices remain unchanged and separate from user balance', async () => {
  const packs = await readFile(new URL('../src/lib/photoPacks.ts', import.meta.url), 'utf8');
  assert.match(packs, /priceCrystals: 40/);
});
