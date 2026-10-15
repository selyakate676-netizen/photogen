import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const homePath = new URL('../src/app/page.tsx', import.meta.url);
const catalogPath = new URL('../src/app/catalog/page.tsx', import.meta.url);
const signoutPath = new URL('../src/app/auth/signout/route.ts', import.meta.url);

test('signed-in homepage redirects to catalog except for an explicit landing section', async () => {
  const source = await readFile(homePath, 'utf8');

  assert.match(source, /export default async function Home/);
  assert.match(source, /createClient\(\)/);
  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /query\.section === 'how-it-works'/);
  assert.match(source, /if \(user && !showHowItWorks\) redirect\('\/catalog'\)/);
  assert.ok(source.indexOf("redirect('/catalog')") < source.indexOf('<Hero />'));
  await access(catalogPath);
});

test('guest homepage retains the complete landing and logout returns to it', async () => {
  const [home, signout] = await Promise.all([
    readFile(homePath, 'utf8'),
    readFile(signoutPath, 'utf8'),
  ]);

  assert.match(home, /<Hero \/>/);
  assert.match(home, /<HowItWorks ctaState=\{user \? 'ready' : 'guest'\} \/>/);
  assert.match(home, /<CatalogSection \/>/);
  assert.match(signout, /supabase\.auth\.signOut\(\)/);
  assert.match(signout, /NextResponse\.redirect\(new URL\('\/'/);
});
