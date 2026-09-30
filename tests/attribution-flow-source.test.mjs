import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const bootstrap = fs.readFileSync(new URL('../src/components/YandexMetrikaBootstrap.tsx', import.meta.url), 'utf8');
const layout = fs.readFileSync(new URL('../src/app/layout.tsx', import.meta.url), 'utf8');
const routerCapture = fs.readFileSync(new URL('../src/components/YandexMetrica.tsx', import.meta.url), 'utf8');
const page = fs.readFileSync(new URL('../src/app/dashboard/new/page.tsx', import.meta.url), 'utf8');
const action = fs.readFileSync(new URL('../src/app/dashboard/new/actions.ts', import.meta.url), 'utf8');
const analytics = fs.readFileSync(new URL('../src/lib/analytics.ts', import.meta.url), 'utf8');

test('first-party capture is immediate and independent from Yandex consent', () => {
  assert.match(layout, /FIRST_PARTY_ATTRIBUTION_BOOTSTRAP_SCRIPT/);
  assert.match(routerCapture, /captureBrowserAttribution\(true\)/);
  assert.doesNotMatch(bootstrap, /captureBrowserAttribution/);
  assert.doesNotMatch(routerCapture, /if \(canUseYandexMetrika\(\)\) captureBrowserAttribution/);
});

test('photoshoot receives the sanitized attribution snapshot through the existing RPC contract', () => {
  assert.match(page, /attribution: getBrowserAttribution\(\)/);
  assert.match(action, /p_attribution_snapshot: sanitizeAttributionSnapshot\(attribution\)/);
});

test('Yandex analytics remains disabled until consent is granted', () => {
  assert.match(analytics, /getAnalyticsConsent\(\) === 'granted'/);
  assert.match(analytics, /if \(!canUseYandexMetrika\(\) \|\| !yandexMetrikaId\) return false/);
  assert.match(bootstrap, /consent === 'granted'/);
  assert.match(bootstrap, /setAnalyticsConsent\('denied'\)/);
});
