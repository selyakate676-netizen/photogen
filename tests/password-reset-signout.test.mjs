import assert from 'node:assert/strict';
import test from 'node:test';
import { terminateRecoverySession } from '../src/lib/auth/password-reset-signout.ts';

function authWithResults(...errors) {
  const calls = [];
  return {
    calls,
    auth: {
      async signOut(options) {
        calls.push(options ?? null);
        return { error: errors.shift() ?? null };
      },
    },
  };
}

test('primary signOut success does not call local fallback', async () => {
  const mock = authWithResults(null);
  assert.equal(await terminateRecoverySession(mock.auth), 'global');
  assert.deepEqual(mock.calls, [null]);
});

test('primary signOut error falls back to local signOut', async () => {
  const mock = authWithResults(new Error('global failed'), null);
  assert.equal(await terminateRecoverySession(mock.auth), 'local');
  assert.deepEqual(mock.calls, [null, { scope: 'local' }]);
});

test('two signOut errors never report terminated session', async () => {
  const mock = authWithResults(new Error('global failed'), new Error('local failed'));
  assert.equal(await terminateRecoverySession(mock.auth), 'failed');
  assert.deepEqual(mock.calls, [null, { scope: 'local' }]);
});
