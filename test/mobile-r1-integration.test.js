import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const loader = readFileSync('script.js', 'utf8');
const bridge = readFileSync('src/mobile-r1-ui.js', 'utf8');

test('mobile integration loads after hardened domain and app', () => {
  const domainIndex = loader.indexOf("load('src/domain.js'");
  const appIndex = loader.indexOf("load('src/app.js'");
  const mobileIndex = loader.indexOf("load('src/mobile-r1-ui.js'");
  assert.ok(domainIndex >= 0 && appIndex > domainIndex && mobileIndex > appIndex);
});

test('mobile destructive clear preserves active-business isolation', () => {
  assert.match(bridge, /MercaTaxDomain\.clearSalesForBusiness\(state\.sales, state\.currentBusinessId\)/);
  assert.match(bridge, /BORRAR VENTAS/);
  assert.doesNotMatch(bridge, /PIN para borrar/);
});

test('mobile bridge exposes privacy, download/share report and external-link hardening', () => {
  assert.match(bridge, /privacy\.html/);
  assert.match(bridge, /downloadReportHtml/);
  assert.match(bridge, /navigator\.share/);
  assert.match(bridge, /noopener,noreferrer/);
});
