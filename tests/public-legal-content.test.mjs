import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');

test('public legal routes and footer links are present without placeholders', () => {
  const routes = ['privacy', 'offer', 'personal-data-consent', 'generation-consent'];
  for (const route of routes) {
    const source = read(`src/app/${route}/page.tsx`);
    assert.doesNotMatch(source, /redirect\(|requireUser|getUser\(/);
  }

  const footer = read('src/components/Footer.tsx');
  for (const route of routes) assert.match(footer, new RegExp(`href="/${route}"`));
  assert.doesNotMatch(footer, /href="#"/);
  assert.match(footer, /href="\/catalog"/);
});

test('FAQ reflects the current Persona and generation contract', () => {
  const faq = read('src/components/FAQ.tsx');
  assert.match(faq, /референсы внешности/);
  assert.match(faq, /от 1 до 5/);
  assert.match(faq, /закрытом хранилище/);
  assert.match(faq, /несколько минут/);
  assert.doesNotMatch(faq, /обучается именно|через 24 часа|10–20|15 до 30|100% вы|без каких-либо ограничений/);
});

test('authenticated upload copy matches private Persona storage behavior', () => {
  const upload = read('src/app/dashboard/new/PhotoUpload.tsx');
  assert.match(upload, /хранятся приватно/);
  assert.match(upload, /следующих фотосессий/);
  assert.match(upload, /удаляются при удалении Persona/);
  assert.doesNotMatch(upload, /24 часа/);
});
test('landing uses neutral use cases instead of unverified testimonials', () => {
  const reviews = read('src/components/Reviews.tsx');
  assert.match(reviews, /Примеры/);
  assert.match(reviews, /использования/);
  assert.doesNotMatch(reviews, /Реальные истории|stars|review\.text|«/);
});
