import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/mobile-home-card-r2.js', import.meta.url), 'utf8');
const buildSource = readFileSync(new URL('../scripts/build.mjs', import.meta.url), 'utf8');
const finalizerSource = readFileSync(new URL('../scripts/finalize-approved-ui.mjs', import.meta.url), 'utf8');

test('approved home summary refinement is syntactically valid and baked before first render', () => {
  assert.doesNotThrow(() => new vm.Script(source));
  assert.match(finalizerSource, /mobile-home-card-r2\.js/);
  assert.match(finalizerSource, /mercatax-approved-home-static/);
  assert.match(finalizerSource, /approved home CSS block not found/);
  assert.doesNotMatch(buildSource, /mobile-home-card-r2\.js/);
  assert.doesNotMatch(finalizerSource, /MutationObserver|setInterval\s*\(/);
});

test('home summary keeps three compact horizontal metric boxes on small screens', () => {
  assert.match(source, /#vx-home \.vxStats/);
  assert.match(source, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
  assert.match(source, /#vx-home \.vxStats>div/);
  assert.match(source, /min-height:66px/);
});

test('home keeps business, reminder, period and quick actions compact and horizontal on phones', () => {
  assert.match(source, /#vx-home \.vxBusiness/);
  assert.match(source, /grid-template-columns:48px minmax\(0,1fr\) auto!important/);
  assert.match(source, /#vx-home \.vxReminder/);
  assert.match(source, /grid-template-columns:38px minmax\(0,1fr\) auto!important/);
  assert.match(source, /#vx-home \.vxPeriods/);
  assert.match(source, /flex-direction:row!important/);
  assert.match(source, /#vx-home \.vxQuick/);
  assert.match(source, /#vx-home \.vxPromo/);
});

test('Vence derives its day from domain due presentation without hard-coded fiscal math', () => {
  assert.match(source, /MercaTaxTaxUi\.duePresentation/);
  assert.match(source, /presentation\.effectiveDate \|\| presentation\.regularDate/);
  assert.doesNotMatch(source, /20-today\.getDate|days\s*=\s*20-|Vence[^\n]*20|\.115|1\.115/);
});
