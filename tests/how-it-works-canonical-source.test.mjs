import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const home = readFileSync(new URL('../src/app/page.tsx', import.meta.url), 'utf8');
const component = readFileSync(new URL('../src/components/HowItWorks.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/components/HowItWorks.module.css', import.meta.url), 'utf8');

test('homepage renders only the canonical HowItWorks component', () => {
  assert.match(home, /import HowItWorks from '@\/components\/HowItWorks';/);
  assert.equal((home.match(/<HowItWorks \/>/g) ?? []).length, 1);
});

test('canonical HowItWorks exposes three complete steps and both CTA levels', () => {
  assert.match(component, /Три простых шага до вашей AI-фотосессии/);
  assert.match(component, /title: 'Войдите или зарегистрируйтесь'[\s\S]*?href: '\/login'/);
  assert.equal((component.match(/\n    icon:/g) ?? []).length, 3);
  assert.match(component, /title: 'Создайте профиль'[\s\S]*?href: '\/account\/profile'/);
  assert.match(component, /title: 'Выберите фотосессию и получите AI-фото'[\s\S]*?href: '\/catalog'/);
  assert.equal((component.match(/\bimage: '\/[^']+'/g) ?? []).length, 3);
  assert.equal((component.match(/<img\b/g) ?? []).length, 1);
  assert.match(component, /<img src=\{step\.image\} alt="" \/>/);
  assert.equal((component.match(/href=\{step\.href\}/g) ?? []).length, 1);
  assert.match(component, /styles\.stepCta/);
  assert.match(component, /styles\.footerAction/);
  assert.match(component, /href=\{cta\.href\}/);
});

test('legacy four-step and alternate layout are absent', () => {
  assert.doesNotMatch(component, /Четыре простых шага/);
  assert.doesNotMatch(component, /title: 'Получите готовые AI-фото'/);
  assert.doesNotMatch(styles, /grid-template-columns:\s*repeat\(4/);
  assert.match(styles, /grid-template-columns:\s*repeat\(3/);
  assert.match(styles, /@media \(max-width:760px\)[\s\S]*grid-template-columns:\s*1fr/);
});
