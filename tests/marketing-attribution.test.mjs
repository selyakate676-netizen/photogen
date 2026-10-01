import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/lib/marketingAttribution.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const attribution = await import('data:text/javascript;base64,' + Buffer.from(javascript).toString('base64'));

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test('parses only approved UTM fields, yclid, and a referrer without query or hash', () => {
  const touch = attribution.parseAttribution(
    'https://photogenlab.ru/?utm_source=yandex&utm_medium=cpc&utm_campaign=beta&utm_content=hero&utm_term=ai&yclid=123&email=private',
    'https://yandex.ru/search/?text=private#secret',
    '2026-09-15T10:00:00.000Z',
  );
  assert.deepEqual(touch, {
    source: 'yandex', medium: 'cpc', campaign: 'beta', content: 'hero', term: 'ai', yclid: '123',
    referrer: 'https://yandex.ru', capturedAt: '2026-09-15T10:00:00.000Z',
  });
});

test('direct traffic produces a non-null attribution snapshot', () => {
  const snapshot = attribution.captureAttribution(memoryStorage(), 'https://photogenlab.ru/', '', '2026-09-15T10:00:00.000Z');
  assert.equal(snapshot.first.source, 'direct');
  assert.equal(snapshot.first.medium, 'none');
  assert.deepEqual(snapshot.last, snapshot.first);
});

test('photoshoot snapshot is non-null for attributed and direct visits', () => {
  const attributed = attribution.captureAttribution(memoryStorage(), 'https://photogenlab.ru/?utm_source=test', '', '2026-09-15T10:00:00.000Z');
  const direct = attribution.captureAttribution(memoryStorage(), 'https://photogenlab.ru/', '', '2026-09-15T10:00:00.000Z');
  assert.ok(attribution.sanitizeAttributionSnapshot(attributed));
  assert.ok(attribution.sanitizeAttributionSnapshot(direct));
});

test('first touch is immutable and last touch updates', () => {
  const storage = memoryStorage();
  attribution.captureAttribution(storage, 'https://photogenlab.ru/?utm_source=yandex&utm_campaign=launch', '', '2026-09-15T10:00:00.000Z');
  const latest = attribution.captureAttribution(storage, 'https://photogenlab.ru/catalog?utm_source=telegram&utm_medium=social', '', '2026-09-15T12:00:00.000Z');
  assert.equal(latest.first.source, 'yandex');
  assert.equal(latest.first.campaign, 'launch');
  assert.equal(latest.last.source, 'telegram');
  assert.equal(latest.last.medium, 'social');
});

test('UTM survives navigation, reload, and signup/login flow before analytics consent', () => {
  const storage = memoryStorage();
  attribution.captureAttribution(storage, 'https://photogenlab.ru/?utm_source=vk&utm_medium=cpc&utm_campaign=test&yclid=123', '', '2026-09-15T10:00:00.000Z');
  const afterNavigation = attribution.captureAttribution(storage, 'https://photogenlab.ru/signup', '', '2026-09-15T10:05:00.000Z', true);
  assert.equal(afterNavigation.first.source, 'vk');
  assert.equal(afterNavigation.first.yclid, '123');

  const persistedValue = storage.getItem(attribution.ATTRIBUTION_STORAGE_KEY);
  const reloadedStorage = memoryStorage();
  reloadedStorage.setItem(attribution.ATTRIBUTION_STORAGE_KEY, persistedValue);
  const afterReload = attribution.captureAttribution(reloadedStorage, 'https://photogenlab.ru/signup', '', '2026-09-15T10:06:00.000Z', true);
  const afterLogin = attribution.captureAttribution(reloadedStorage, 'https://photogenlab.ru/login', '', '2026-09-15T10:07:00.000Z', true);
  assert.equal(afterReload.first.campaign, 'test');
  assert.equal(afterLogin.first.source, 'vk');
  assert.equal(afterLogin.last.source, 'vk');
});

test('last-touch updates do not extend the first-touch TTL', () => {
  const storage = memoryStorage();
  attribution.captureAttribution(storage, 'https://photogenlab.ru/?utm_source=first', '', '2026-01-01T00:00:00.000Z');
  attribution.captureAttribution(storage, 'https://photogenlab.ru/?utm_source=last', '', '2026-03-31T00:00:00.000Z');
  const fresh = attribution.captureAttribution(storage, 'https://photogenlab.ru/?utm_source=fresh', '', '2026-04-02T00:00:00.000Z');
  assert.equal(fresh.first.source, 'fresh');
});

test('TTL expires the old first touch after 90 days', () => {
  const storage = memoryStorage();
  attribution.captureAttribution(storage, 'https://photogenlab.ru/?utm_source=old', '', '2026-01-01T00:00:00.000Z');
  const fresh = attribution.captureAttribution(storage, 'https://photogenlab.ru/?utm_source=new', '', '2026-04-02T00:00:00.000Z');
  assert.equal(fresh.first.source, 'new');
});

test('sanitizer drops unexpected and personal fields', () => {
  const snapshot = attribution.sanitizeAttributionSnapshot({
    first: { source: 'yandex', capturedAt: 'now', email: 'private@example.test', personaId: 'secret' },
    last: { source: 'yandex', campaign: 'safe', capturedAt: 'now', signedUrl: 'secret' },
  });
  assert.deepEqual(snapshot, {
    first: { source: 'yandex', capturedAt: 'now' },
    last: { source: 'yandex', campaign: 'safe', capturedAt: 'now' },
  });
});

test('analytics params expose only approved campaign dimensions', () => {
  const params = attribution.attributionAnalyticsParams({
    first: { source: 'first', term: 'private-term', yclid: 'click', referrer: 'https://example.com/', capturedAt: 'one' },
    last: { source: 'last', medium: 'cpc', campaign: 'launch', content: 'card', term: 'not-sent', yclid: 'not-sent', capturedAt: 'two' },
  });
  assert.deepEqual(params, { source: 'last', medium: 'cpc', campaign: 'launch', content: 'card' });
});
