const russianSearchSuffixes = [
  'иями', 'ьями', 'ого', 'его', 'ому', 'ему', 'ыми', 'ими',
  'иях', 'ьях', 'ами', 'ями', 'ая', 'яя', 'ую', 'юю', 'ое', 'ее',
  'ые', 'ие', 'ый', 'ий', 'ой', 'ей', 'ым', 'им', 'ых', 'их',
  'ию', 'ью', 'ия', 'ья', 'ии', 'ою', 'ею', 'ов', 'ев', 'ом', 'ем',
  'ах', 'ях', 'ы', 'и', 'а', 'я', 'у', 'ю', 'ь',
] as const;

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase('ru-RU')
    .replaceAll('ё', 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function normalizeWord(word: string) {
  if (word.length < 5) return word;

  const suffix = russianSearchSuffixes.find(
    (candidate) => word.endsWith(candidate) && word.length - candidate.length >= 3,
  );

  return suffix ? word.slice(0, -suffix.length) : word;
}

function searchTokens(value: string) {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(' ').map(normalizeWord) : [];
}

export function matchesCatalogSearch(searchableText: string, query: string) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return true;

  const normalizedText = normalizeText(searchableText);
  if (normalizedText.includes(normalizedQuery)) return true;

  const textTokens = new Set(searchTokens(normalizedText));
  return searchTokens(normalizedQuery).every((token) => textTokens.has(token));
}
