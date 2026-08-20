import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/mobile-home-card-r2.js', import.meta.url), 'utf8');
const buildSource = readFileSync(new URL('../scripts/build.mjs', import.meta.url), 'utf8');

test('home summary refinement is syntactically valid and loaded after vNext UI', () => {
  assert.doesNotThrow(() => new vm.Script(source));
  assert.match(buildSource, /mobile-vnext-ui\.js', loadHomeCardRefinement/);
  assert.match(buildSource, /mobile-home-card-r2\.js/);
});

test('home summary keeps three compact horizontal metric boxes on small screens', () => {
  assert.match(source, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(source, /border-radius:18px/);
  assert.match(source, /#vx-home \.vxStats>div/);
  assert.match(source, /@media\(max-width:360px\)/);
});

test('Vence derives its day from domain due presentation without hard-coded fiscal math', () => {
  assert.match(source, /MercaTaxTaxUi\.duePresentation/);
  assert.match(source, /presentation\.effectiveDate \|\| presentation\.regularDate/);
  assert.doesNotMatch(source, /20-today\.getDate|days\s*=\s*20-|Vence[^\n]*20|\.115|1\.115/);
});
