import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'src/components/Reviews.tsx'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'src/components/Reviews.module.css'), 'utf8');

const cards = [
  ['01_recognition_cafe.png', 'Татьяна', 'Это действительно я, только фотогеничная'],
  ['02_no_glamour_park.png', 'Ольга', 'Без гламура и странных поз'],
  ['03_work_avatar_bench.png', 'Евгения', 'Для резюме и рабочих аватарок'],
  ['04_dating_cardigan.png', 'Марина', 'Для сайта знакомств'],
  ['05_real_people_autumn.png', 'Ксения', 'Реальные люди, а не модели'],
];

test('homepage renders the five approved JTBD stories in canonical order', () => {
  let previousIndex = -1;
  for (const [filename, name, title] of cards) {
    const imagePath = `/jtbd-stories/${filename}`;
    const currentIndex = source.indexOf(imagePath);
    assert.ok(currentIndex > previousIndex, `${filename} must keep its approved position`);
    assert.ok(source.includes(`name: '${name}'`));
    assert.ok(source.includes(`title: '${title}'`));
    assert.ok(fs.existsSync(path.join(root, 'public', 'jtbd-stories', filename)));
    previousIndex = currentIndex;
  }
});

test('JTBD section uses neutral editorial framing without testimonial metadata', () => {
  assert.ok(source.includes('Это действительно я. Только фотогеничная.'));
  assert.ok(source.includes('Хорошие фотографии нужны не только для особых случаев.'));
  assert.doesNotMatch(source, /rating|verified|purchaseDate|stars/);
});

test('cards use a compact single-row horizontal rail with round avatars', () => {
  assert.match(source, /className=\{styles\.reviewRail\}/);
  assert.match(source, /width=\{64\}/);
  assert.match(styles, /\.reviewRail\s*\{[^}]*display:\s*flex;/s);
  assert.match(styles, /\.reviewRail\s*\{[^}]*overflow-x:\s*auto;/s);
  assert.match(styles, /\.cardReveal\s*\{[^}]*flex:\s*0 0/s);
  assert.match(styles, /\.avatar\s*\{[^}]*border-radius:\s*50%;/s);
  assert.doesNotMatch(styles, /column-count|aspect-ratio:\s*4\/5/);
});