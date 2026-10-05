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

test('owner-approved service, refund, use, safety, and contact terms are public', () => {
  const offer = read('src/app/offer/page.tsx');
  const generationConsent = read('src/app/generation-consent/page.tsx');
  const footer = read('src/components/Footer.tsx');
  const privacy = read('src/app/privacy/page.tsx');

  assert.match(offer, /услуга считается оказанной после успешной генерации/);
  assert.match(offer, /до 3 фотографий включительно.*1 бесплатная повторная генерация/s);
  assert.match(offer, /более чем из 3 фотографий.*2 бесплатные повторные генерации/s);
  assert.match(offer, /субъективное недовольство.*само по себе не гарантирует возврат/s);
  assert.match(generationConsent, /личных и коммерческих целях/);
  assert.match(generationConsent, /не означает передачу пользователю исключительных прав/);
  assert.match(generationConsent, /эксплуатацией несовершеннолетних/);
  assert.doesNotMatch(offer + generationConsent, /все права принадлежат|гарантированно уникален/);

  for (const source of [offer, footer, privacy]) {
    assert.match(source, /photogenlab@mail\.ru/);
    assert.match(source, /https:\/\/t\.me\/photogenlab/);
  }
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
