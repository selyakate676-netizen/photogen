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

test('parses UTM fields, yclid, and a privacy-safe external referrer', () => {
  const touch = attribution.parseAttribution(
    'https://photogenlab.ru/?utm_source=yandex&utm_medium=cpc&utm_campaign=beta&utm_content=hero&utm_term=ai&yclid=123',
    'https://yandex.ru/search/?text=private',
    '2026-09-15T10:00:00.000Z',
  );
  assert.deepEqual(touch, {
    source: 'yandex', medium: 'cpc', campaign: 'beta', content: 'hero', term: 'ai', yclid: '123',
    referrer: 'https://yandex.ru/search/', capturedAt: '2026-09-15T10:00:00.000Z',
  });
});

test('first touch is immutable while a new tagged visit updates last touch', () => {
  const storage = memoryStorage();
  const first = attribution.captureAttribution(storage, 'https://photogenlab.ru/?utm_source=yandex&utm_campaign=launch', '', '2026-09-15T10:00:00.000Z');
  const direct = attribution.captureAttribution(storage, 'https://photogenlab.ru/catalog', '', '2026-09-15T11:00:00.000Z');
  const organic = attribution.captureAttribution(storage, 'https://photogenlab.ru/catalog', 'https://google.com/search?q=photo', '2026-09-15T11:30:00.000Z');
  const last = attribution.captureAttribution(storage, 'https://photogenlab.ru/catalog?utm_source=telegram&utm_medium=social', '', '2026-09-15T12:00:00.000Z');
  assert.deepEqual(direct, first);
  assert.deepEqual(organic, first);
  assert.equal(last.first.source, 'yandex');
  assert.equal(last.last.source, 'telegram');
  assert.equal(last.last.medium, 'social');
});

test('initial tagged landing survives navigation before delayed consent', () => {
  const storage = memoryStorage();
  attribution.clearStagedAttribution();
  attribution.stageInitialAttribution(
    'https://photogenlab.ru/?utm_source=vk&utm_medium=cpc&utm_campaign=test&utm_content=creative_1&yclid=123',
    '',
    '2026-09-15T10:00:00.000Z',
  );
  attribution.stageInitialAttribution('https://photogenlab.ru/catalog', '', '2026-09-15T10:05:00.000Z');

  assert.equal(storage.getItem(attribution.ATTRIBUTION_STORAGE_KEY), null);
  const snapshot = attribution.commitStagedAttribution(storage);
  assert.equal(snapshot.first.source, 'vk');
  assert.equal(snapshot.first.yclid, '123');
  assert.equal(snapshot.last.campaign, 'test');
});

test('rejecting consent discards the staged landing without persistence', () => {
  const storage = memoryStorage();
  attribution.clearStagedAttribution();
  attribution.stageInitialAttribution('https://photogenlab.ru/?utm_source=vk', '');
  attribution.clearStagedAttribution();
  assert.equal(attribution.commitStagedAttribution(storage), null);
  assert.equal(storage.getItem(attribution.ATTRIBUTION_STORAGE_KEY), null);
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
