import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { catalogJtbdCollections } from '../src/lib/catalogJtbd.ts';
import { getPhotoPackForHistory, photoPacks } from '../src/lib/photoPacks.ts';

const activeIds = new Set(photoPacks.map(({ id }) => id));

test('JTBD collections reference active packs without duplicates inside a row', () => {
  assert.equal(catalogJtbdCollections.length, 6);

  for (const collection of catalogJtbdCollections) {
    assert.equal(new Set(collection.cardIds).size, collection.cardIds.length, collection.title);
    for (const id of collection.cardIds) {
      assert.ok(activeIds.has(id), `${collection.title} references inactive pack ${id}`);
    }
  }
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


