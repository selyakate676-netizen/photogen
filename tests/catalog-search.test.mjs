import assert from 'node:assert/strict';
import test from 'node:test';

import { matchesCatalogSearch } from '../src/lib/catalogSearch.ts';
import { getPhotoPackForHistory, photoPacks } from '../src/lib/photoPacks.ts';

function searchCatalog(query) {
  return photoPacks.filter((pack) =>
    matchesCatalogSearch(`${pack.title} ${pack.description} ${pack.categoryLabel}`, query),
  );
}

for (const query of [
  'Красная площадь',
  'красная',
  'площадь',
  'Осень на Красной площади',
]) {
  test(`catalog search finds Red Square pack for "${query}"`, () => {
    assert.ok(searchCatalog(query).some(({ id }) => id === 'red-square-autumn'));
  });
}

test('catalog search keeps existing exact-title matches with yo normalization', () => {
  assert.ok(searchCatalog('Чёрный минимализм').some(({ id }) => id === 'black-minimalism'));
  assert.ok(searchCatalog('черный минимализм').some(({ id }) => id === 'black-minimalism'));
});

test('catalog search never returns an archived pack', () => {
  assert.equal(getPhotoPackForHistory('career')?.id, 'career');
  assert.equal(searchCatalog('Бизнес-портрет').some(({ id }) => id === 'career'), false);
});
