import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [login, forgot, reset, callback, helper, stashRoute, updateRoute, signup] = await Promise.all([
  read('src/app/login/page.tsx'), read('src/app/forgot-password/page.tsx'), read('src/app/reset-password/page.tsx'),
  read('src/app/auth/callback/route.ts'), read('src/lib/auth/password-reset.ts'),
  read('src/app/api/auth/password-reset/recovery-token/route.ts'), read('src/app/api/auth/password-reset/route.ts'),
  read('src/app/signup/page.tsx'),
]);

test('ordinary login session and forged recovery query do not grant reset access', () => {
  assert.doesNotMatch(reset, /auth\.getUser|sessionValid/);
  assert.doesNotMatch(callback, /recovery=1|isPasswordRecovery|\/reset-password/);
  assert.match(updateRoute, /verifyOtp\(\{ token_hash: tokenHash, type: 'recovery' \}\)/);
  assert.match(updateRoute, /RECOVERY_REQUIRED/);
});

test('recovery token is kept out of server URL and stored only in protected short-lived cookie', () => {
  assert.match(reset, /window\.location\.hash/);
  assert.match(reset, /history\.replaceState\(\{\}, '', '\/reset-password'\)/);
  assert.match(stashRoute, /httpOnly: true/);
  assert.match(stashRoute, /sameSite: 'lax'/);
  assert.match(stashRoute, /maxAge: RECOVERY_TOKEN_MAX_AGE_SECONDS/);
  assert.doesNotMatch(`${reset}\n${stashRoute}\n${updateRoute}`, /console\./);
});

test('expired and reused recovery tokens are rejected and marker is cleared', () => {
  assert.match(updateRoute, /verifyError \|\| !verified\.user/);
  assert.match(updateRoute, /RECOVERY_INVALID_OR_EXPIRED/);
  assert.match(updateRoute, /maxAge: 0/);
  assert.strictEqual((updateRoute.match(/verifyOtp/g) ?? []).length, 1);
});

test('recovery context cannot be switched to another user', () => {
  assert.match(updateRoute, /current\.user\.id !== verified\.user\.id/);
  assert.match(updateRoute, /RECOVERY_USER_MISMATCH/);
  assert.ok(updateRoute.indexOf('verifyOtp') < updateRoute.indexOf('updateUser'));
});

test('forgot-password is enumeration-safe and cooldown is UX-only', () => {
  assert.match(forgot, /resetPasswordForEmail/);
  assert.match(forgot, /GENERIC_SUCCESS/);
  assert.doesNotMatch(forgot, /requestError|\.error\.message|authError/);
  assert.match(forgot, /PASSWORD_RESET_COOLDOWN_MS/);
  assert.match(forgot, /disabled=\{loading\}/);
});

test('password update falls back to local cookie cleanup and reports cleanup failure', () => {
  assert.match(updateRoute, /terminateRecoverySession\(supabase\.auth\)/);
  assert.match(updateRoute, /signOutResult === 'failed'/);
  assert.match(updateRoute, /clearCurrentSupabaseAuthCookies\(\)/);
  assert.match(updateRoute, /SESSION_TERMINATION_FAILED/);
  assert.strictEqual((updateRoute.match(/updateUser/g) ?? []).length, 1);
  assert.match(reset, /result\.passwordUpdated/);
});

test('all changed user-facing sources are valid UTF-8 text without replacement question marks', () => {
  for (const source of [login, forgot, reset, helper]) assert.doesNotMatch(source, /\?{4,}/);
  assert.match(login, /Забыли пароль/);
  assert.match(forgot, /Восстановление пароля/);
  assert.match(reset, /Новый пароль/);
});

test('signup consents and normal callback routing remain intact', () => {
  assert.match(signup, /offerAccepted/);
  assert.match(signup, /personalDataAccepted/);
  assert.match(callback, /\/consent\?next=/);
});
