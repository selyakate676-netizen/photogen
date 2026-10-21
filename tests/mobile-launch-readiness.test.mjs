import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('catalog mobile rails are touch-scrollable and cards are opaque and clipped', async () => {
  const css = await read('src/components/CatalogSection.module.css');
  assert.match(css, /\.filters\s*\{[\s\S]*touch-action:\s*pan-x pan-y/);
  assert.match(css, /\.rail\s*\{[\s\S]*overflow-y:\s*hidden[\s\S]*touch-action:\s*pan-x pan-y/);
  assert.match(css, /\.card\s*\{[\s\S]*background:\s*var\(--surface-secondary\)/);
  assert.match(css, /@media \(max-width:\s*768px\)[\s\S]*\.realCard:hover,[\s\S]*transform:\s*none/);
});

test('questionnaire assets are present and mobile figure cards reserve image space', async () => {
  const workspace = await read('src/app/account/profile/ProfileWorkspace.tsx');
  const css = await read('src/app/account/account.module.css');
  const assets = [...workspace.matchAll(/icon:\s*'(\/body-profile\/[^']+\.png)'/g)].map((match) => match[1]);
  assert.equal(assets.length, 11);
  for (const asset of assets) {
    const info = await stat(new URL(`../public${asset}`, import.meta.url));
    assert.ok(info.size > 0, `${asset} must not be empty`);
  }
  assert.match(css, /\.appearanceCard strong\s*\{[\s\S]*overflow-wrap:\s*anywhere/);
  assert.match(css, /@media \(max-width:\s*640px\)[\s\S]*\.figureCard\s*\{\s*min-height:\s*156px/);
});

test('referral area is an inactive coming-soon placeholder', async () => {
  const workspace = await read('src/app/account/profile/ProfileWorkspace.tsx');
  const page = await read('src/app/account/profile/page.tsx');
  assert.ok(workspace.includes('\u0420\u0435\u0444\u0435\u0440\u0430\u043b\u044c\u043d\u0430\u044f \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 \u2014 \u0441\u043a\u043e\u0440\u043e'));
  assert.ok(workspace.includes('\u0421\u043a\u043e\u0440\u043e \u0432\u044b \u0441\u043c\u043e\u0436\u0435\u0442\u0435 \u043f\u0440\u0438\u0433\u043b\u0430\u0448\u0430\u0442\u044c \u0434\u0440\u0443\u0437\u0435\u0439 \u0438 \u043f\u043e\u043b\u0443\u0447\u0430\u0442\u044c \u0431\u043e\u043d\u0443\u0441\u043d\u044b\u0435 \u043a\u0440\u0438\u0441\u0442\u0430\u043b\u043b\u044b.'));
  assert.doesNotMatch(workspace, /copyReferral|referralUrl|navigator\.clipboard/);
  assert.doesNotMatch(page, /referralCode=/);
});
