import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const navbar = readFileSync(new URL('../src/components/Navbar.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/components/Navbar.module.css', import.meta.url), 'utf8');

test('desktop logo owns its rendered width instead of overflowing into navigation links', () => {
  assert.match(styles, /\.logo \{[\s\S]*?width: max-content;[\s\S]*?flex: 0 0 auto;/);
  assert.match(styles, /\.logoMark \{[\s\S]*?min-width: max-content;[\s\S]*?white-space: nowrap;/);
  assert.doesNotMatch(styles, /\.logo \{ width: 132px; \}/);
});

test('desktop and mobile navigation share the authenticated-safe How It Works target', () => {
  assert.match(navbar, /href: '\/\?section=how-it-works#how-it-works'/);
  assert.equal((navbar.match(/leftLinks\.map/g) ?? []).length, 2);
});