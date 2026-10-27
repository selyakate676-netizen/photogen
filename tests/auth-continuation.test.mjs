import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  DEFAULT_AUTH_CONTINUATION,
  safeAuthContinuation,
  withAuthContinuation,
} from '../src/lib/auth/continuation.ts';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('accepts an internal pack continuation including its query string', () => {
  assert.equal(
    safeAuthContinuation('/dashboard/new?style=flowers'),
    '/dashboard/new?style=flowers',
  );
  assert.equal(
    withAuthContinuation('/login', '/dashboard/new?style=flowers'),
    '/login?next=%2Fdashboard%2Fnew%3Fstyle%3Dflowers',
  );
});

test('rejects external, protocol-relative, encoded and malformed continuations', () => {
  for (const value of [
    'https://evil.example/path',
    'javascript:alert(1)',
    '//evil.example/path',
    '/\\evil.example/path',
    '/%2f%2fevil.example/path',
    '/%255c%255cevil.example/path',
    ' /dashboard/new?style=flowers',
    '/dashboard/%E0%A4%A',
  ]) {
    assert.equal(safeAuthContinuation(value), DEFAULT_AUTH_CONTINUATION, value);
  }
});

test('auth routes preserve the continuation through login, signup, callback and consent', async () => {
  const [middleware, login, signup, callback, consent] = await Promise.all([
    read('src/utils/supabase/middleware.ts'),
    read('src/app/login/page.tsx'),
    read('src/app/signup/page.tsx'),
    read('src/app/auth/callback/route.ts'),
    read('src/app/consent/page.tsx'),
  ]);

  assert.match(middleware, /request\.nextUrl\.pathname.*request\.nextUrl\.search/s);
  assert.match(middleware, /searchParams\.set\(\s*'next'/s);
  assert.match(login, /setContinuation\(authContinuationFromLocation\(\)\)/);
  assert.match(login, /\/consent\?next=/);
  assert.match(signup, /auth\/callback\?next=/);
  assert.match(signup, /data\.session/);
  assert.match(callback, /safeAuthContinuation/);
  assert.match(callback, /\/consent\?next=/);
  assert.match(consent, /safeAuthContinuation/);
  assert.match(consent, /router\.replace\(nextPath\)/);
});
