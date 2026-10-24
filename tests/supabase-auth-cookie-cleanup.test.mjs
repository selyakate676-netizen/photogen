import assert from 'node:assert/strict';
import test from 'node:test';
import { clearSupabaseAuthCookies, getSupabaseAuthStorageKey } from '../src/lib/auth/supabase-cookie-cleanup.ts';

const url = 'https://project-ref.supabase.co';
const key = getSupabaseAuthStorageKey(url);

function cookieStore(initialCookies) {
  const cookies = new Map(initialCookies.map(({ name, value }) => [name, value]));
  const writes = [];
  return {
    cookies,
    writes,
    getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
    set(name, value, options) {
      writes.push({ name, value, options });
      if (options.maxAge === 0) cookies.delete(name);
      else cookies.set(name, value);
    },
  };
}

test('clears unchunked and all chunked Supabase auth storage cookies', () => {
  const store = cookieStore([
    { name: key, value: 'session' },
    { name: `${key}.0`, value: 'first' },
    { name: `${key}.1`, value: 'second' },
    { name: `${key}.5`, value: 'stale' },
    { name: `${key}-code-verifier`, value: 'verifier' },
    { name: `${key}-user.0`, value: 'user' },
  ]);

  const removed = clearSupabaseAuthCookies(store, url);

  assert.equal(removed.length, 6);
  assert.equal(store.cookies.size, 0);
  assert.ok(store.writes.every(({ value, options }) => value === '' && options.maxAge === 0 && options.path === '/'));
});

test('preserves unrelated, consent, and lookalike cookies', () => {
  const untouched = ['consent', 'other-app-session', `${key}.x`, `${key}.1.extra`, `prefix-${key}.0`];
  const store = cookieStore([
    { name: `${key}.0`, value: 'session' },
    ...untouched.map((name) => ({ name, value: 'keep' })),
  ]);

  clearSupabaseAuthCookies(store, url);

  assert.deepEqual([...store.cookies.keys()].sort(), untouched.sort());
});

test('a subsequent request cannot reconstruct the cleared local session', () => {
  const store = cookieStore([
    { name: `${key}.0`, value: 'first' },
    { name: `${key}.1`, value: 'second' },
  ]);

  clearSupabaseAuthCookies(store, url);
  assert.deepEqual(clearSupabaseAuthCookies(store, url), []);
  assert.equal(store.cookies.has(key), false);
  assert.equal([...store.cookies.keys()].some((name) => name.startsWith(`${key}.`)), false);
});

test('surfaces a response-cookie write failure instead of masking cleanup', () => {
  const store = {
    getAll: () => [{ name: key, value: 'session' }],
    set() {
      throw new Error('response cookies unavailable');
    },
  };

  assert.throws(() => clearSupabaseAuthCookies(store, url), /response cookies unavailable/);
});
