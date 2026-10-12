import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('login exposes password recovery and auth pages do not render social providers', async () => {
  const [login, signup] = await Promise.all([
    read('src/app/login/page.tsx'),
    read('src/app/signup/page.tsx'),
  ]);

  assert.match(login, /href="\/forgot-password"/);
  assert.doesNotMatch(login, /SocialAuth|signInWithOAuth/);
  assert.doesNotMatch(signup, /SocialAuth|signInWithOAuth/);
});

test('recovery request uses the standard Supabase flow without email enumeration', async () => {
  const source = await read('src/app/forgot-password/page.tsx');

  assert.match(source, /resetPasswordForEmail/);
  assert.match(source, /\/auth\/callback\?next=/);
  assert.match(source, /Если аккаунт с таким email существует/);
  assert.doesNotMatch(source, /resetError\.message/);
});

test('callback exchanges the recovery code and rejects external next URLs', async () => {
  const source = await read('src/app/auth/callback/route.ts');

  assert.match(source, /exchangeCodeForSession\(code\)/);
  assert.match(source, /value\.startsWith\('\/\/'\)/);
  assert.match(source, /reset-password\?error=invalid_or_expired/);
});

test('new password form validates recovery session and updates the password', async () => {
  const source = await read('src/app/reset-password/page.tsx');

  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /supabase\.auth\.updateUser\(\{ password \}\)/);
  assert.match(source, /minLength=\{8\}/);
  assert.match(source, /signOut\(\{ scope: 'local' \}\)/);
  assert.match(source, /<Suspense/);
});