import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('analytics declares the six canonical funnel completion goals', async () => {
  const source = await read('src/lib/analytics.ts');
  for (const goal of ['registration_completed', 'persona_created', 'photoshoot_created', 'payment_started', 'payment_completed', 'generation_completed']) {
    assert.match(source, new RegExp(`'${goal}'`));
  }
  assert.doesNotMatch(source, /'checkout_view'|'mock_payment_click'/);
});

test('registration, Persona and photoshoot events follow confirmed success', async () => {
  const [signup, profile, photoshoot] = await Promise.all([
    read('src/app/signup/page.tsx'),
    read('src/app/account/profile/ProfileWorkspace.tsx'),
    read('src/app/dashboard/new/page.tsx'),
  ]);
  assert.ok(signup.indexOf("if (error) throw error") < signup.indexOf("trackAnalyticsGoal('registration_completed'"));
  assert.ok(profile.indexOf('if (!response.ok) throw') < profile.indexOf("trackAnalyticsGoal('persona_created'"));
  assert.ok(photoshoot.indexOf("if (!result.data?.id) throw") < photoshoot.indexOf("trackAnalyticsGoal('photoshoot_created'"));
});

test('retired mock checkout emits no payment success events', async () => {
  const page = await read('src/app/dashboard/pay/[id]/page.tsx');
  assert.match(page, /redirect\('\/account\/generated'\)/);
  assert.doesNotMatch(page, /payment_started|payment_completed|mockPayment/);
});

test('completed DB status gates deduplicated generation completion observation', async () => {
  const [result, event] = await Promise.all([
    read('src/app/dashboard/result/[id]/page.tsx'),
    read('src/components/AnalyticsEvent.tsx'),
  ]);
  assert.ok(result.indexOf("photoshoot.status !== 'completed'") < result.indexOf('goal="generation_completed"'));
  assert.match(result, /dedupeKey={`generation-completed:\${photoshoot.id}`}/);
  assert.match(event, /window\.sessionStorage\.getItem\(storageKey\)/);
  assert.match(event, /window\.sessionStorage\.setItem\(storageKey, 'sent'\)/);
});
