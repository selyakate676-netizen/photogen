import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { catalogJtbdCollections, catalogQuickFilters } from '../src/lib/catalogJtbd.ts';
import { getPhotoPackForHistory, photoPacks } from '../src/lib/photoPacks.ts';

const activeIds = new Set(photoPacks.map(({ id }) => id));

test('JTBD collections reference active packs without duplicates inside a row', () => {
  assert.equal(catalogJtbdCollections.length, 9);

  for (const collection of catalogJtbdCollections) {
    assert.equal(new Set(collection.cardIds).size, collection.cardIds.length, collection.title);
    for (const id of collection.cardIds) {
      assert.ok(activeIds.has(id), `${collection.title} references inactive pack ${id}`);
    }
  }
});

test('canonical JTBD config provides the required rows and quick filters', () => {
  assert.deepEqual(
    catalogJtbdCollections.filter(({ id }) => ['dating', 'art-studio', 'family'].includes(id)).map(({ title }) => title),
    ['\u0414\u043b\u044f \u0437\u043d\u0430\u043a\u043e\u043c\u0441\u0442\u0432 \u0438 \u0430\u0432\u0430\u0442\u0430\u0440\u043a\u0438', '\u0410\u0440\u0442 \u0438 \u0441\u0442\u0443\u0434\u0438\u0439\u043d\u044b\u0435', '\u0421\u0435\u043c\u044c\u044f \u0438 \u0431\u043b\u0438\u0437\u043a\u0438\u0435'],
  );
  assert.deepEqual(
    catalogQuickFilters.map(({ label }) => label),
    ['\u041f\u043e\u043f\u0443\u043b\u044f\u0440\u043d\u043e\u0435', '\u041d\u043e\u0432\u0438\u043d\u043a\u0438', '\u0421\u043e\u0446\u0441\u0435\u0442\u0438', '\u0417\u043d\u0430\u043a\u043e\u043c\u0441\u0442\u0432\u0430', '\u0420\u0430\u0431\u043e\u0442\u0430', '\u041f\u0440\u0430\u0437\u0434\u043d\u0438\u043a\u0438', '\u0410\u0440\u0442 \u0438 \u0441\u0442\u0443\u0434\u0438\u044f', '\u0421\u0435\u043c\u044c\u044f'],
  );
});

test('Red Square is prominent in social and reused for travel and dating jobs', () => {
  const byId = new Map(catalogJtbdCollections.map((collection) => [collection.id, collection]));
  assert.ok(byId.get('social-lifestyle').cardIds.indexOf('red-square-autumn') < 3);
  assert.ok(byId.get('walks-travel').cardIds.includes('red-square-autumn'));
  assert.ok(byId.get('dating').cardIds.includes('red-square-autumn'));
});

test('one active pack can intentionally appear in multiple JTBD collections', () => {
  const appearances = catalogJtbdCollections.filter(({ cardIds }) => cardIds.includes('autumn-promenade'));
  assert.ok(appearances.length > 1);
});

test('active registry excludes archived packs while history lookup remains compatible', () => {
  assert.equal(activeIds.has('career'), false);
  assert.equal(getPhotoPackForHistory('career')?.id, 'career');
});

test('catalog uses the canonical active registry for search and all-photoshoots rendering', async () => {
  const source = await readFile(new URL('../src/components/CatalogSection.tsx', import.meta.url), 'utf8');

  assert.match(source, /const catalogCards = realCards/);
  assert.match(source, /catalogCards\s*[\r\n]+\s*\.filter\(\(card\) => matchesSearch\(card, trimmedQuery\)\)/);
  assert.match(source, /catalogJtbdCollections\.map/);
  assert.match(source, /fullCatalogCards\.map/);
  assert.match(source, /data-expanded=\{showAllPhotoshoots\}/);
  assert.match(source, /setShowAllPhotoshoots\(\(current\) => !current\)/);
});

test('initial all-photoshoots grid is bounded by responsive three-row limits', async () => {
  const css = await readFile(new URL('../src/components/CatalogSection.module.css', import.meta.url), 'utf8');

  assert.match(css, /repeat\(5, minmax\(0, 1fr\)\)[\s\S]*nth-child\(n \+ 16\)/);
  assert.match(css, /repeat\(4, minmax\(0, 1fr\)\)[\s\S]*nth-child\(n \+ 13\)/);
  assert.match(css, /repeat\(3, minmax\(0, 1fr\)\)[\s\S]*nth-child\(n \+ 10\)/);
  assert.match(css, /repeat\(2, minmax\(0, 1fr\)\)[\s\S]*nth-child\(n \+ 7\)/);
  assert.match(css, /@media \(max-width: 360px\)[\s\S]*grid-template-columns: 1fr[\s\S]*nth-child\(n \+ 4\)/);
  assert.match(css, /\.rail \{[\s\S]*overflow-x: auto/);
});


