import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const loader = readFileSync('script.js', 'utf8');
const actions = readFileSync('src/ui-actions.js', 'utf8');

test('mobile integration loads after hardened domain and app', () => {
  const domainIndex = loader.indexOf("load('src/domain.js'");
  const appIndex = loader.indexOf("load('src/app.js'");
  const mobileIndex = loader.indexOf("load('src/ui-actions.js'");
  assert.ok(domainIndex >= 0 && appIndex > domainIndex && mobileIndex > appIndex);
});

test('mobile destructive clear preserves active-business isolation', () => {
  assert.match(actions, /MercaTaxDomain\.clearSalesForBusiness\(state\.sales, state\.currentBusinessId\)/);
  assert.match(actions, /BORRAR VENTAS/);
  assert.doesNotMatch(actions, /PIN para borrar/);
});

test('mobile actions exposes privacy, download/share report and external-link hardening', () => {
  assert.match(actions, /privacy\.html/);
  assert.match(actions, /downloadReportHtml/);
  assert.match(actions, /navigator\.share/);
  assert.match(actions, /noopener,noreferrer/);
});
