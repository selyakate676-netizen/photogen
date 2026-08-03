import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  isYandexMetrikaHostAllowed,
  shouldSendAnalyticsPageView,
} from '../src/lib/analytics.ts';

const clientComponentSource = await readFile(
  new URL('../src/components/YandexMetrica.tsx', import.meta.url),
  'utf8',
);

const bootstrapComponentSource = await readFile(
  new URL('../src/components/YandexMetricaBootstrap.tsx', import.meta.url),
  'utf8',
);

test('manual SPA page views use defer and send one hit per distinct URL', () => {
  assert.equal(
    bootstrapComponentSource.match(/window\.ym\(\$\{counterId\}, "init", \{ defer: true \}\)/g)?.length,
    1,
  );
  assert.equal(
    bootstrapComponentSource.match(/window\.ym\(\$\{counterId\}, "hit", currentPageUrl\)/g)?.length,
    1,
  );
  assert.match(
    bootstrapComponentSource,
    /window\.__photogenMetrikaPageUrl = currentPageUrl;[\s\S]*?"init"[\s\S]*?"hit"/,
  );
  assert.equal(
    clientComponentSource.match(/window\.ym\(yandexMetrikaId, 'hit', pageUrl\)/g)?.length,
    1,
  );
  assert.match(
    clientComponentSource,
    /window\.__photogenMetrikaPageUrl === pageUrl/,
  );

  let previousPageUrl = null;
  let hitCount = 0;
  for (const pageUrl of ['/', '/catalog?category=portrait', '/catalog?category=portrait']) {
    if (shouldSendAnalyticsPageView(previousPageUrl, pageUrl)) {
      hitCount += 1;
      previousPageUrl = pageUrl;
    }
  }

  assert.equal(hitCount, 2);
});

test('localhost, loopback and localhost subdomains are blocked', () => {
  for (const hostname of [
    'localhost',
    'LOCALHOST.',
    'app.localhost',
    '127.0.0.1',
    '::1',
    '[::1]',
  ]) {
    assert.equal(isYandexMetrikaHostAllowed(hostname), false, hostname);
  }

  assert.equal(isYandexMetrikaHostAllowed('photogen.example'), true);
});

test('development build ignores a configured production counter ID', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousCounterId = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;

  process.env.NODE_ENV = 'development';
  process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID = '108498956';

  try {
    const moduleUrl = new URL('../src/lib/analytics.ts', import.meta.url);
    moduleUrl.searchParams.set('test', `${Date.now()}-${Math.random()}`);
    const { yandexMetrikaId } = await import(moduleUrl.href);
    assert.equal(yandexMetrikaId, null);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;

    if (previousCounterId === undefined) delete process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;
    else process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID = previousCounterId;
  }
});
