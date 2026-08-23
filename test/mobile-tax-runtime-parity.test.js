import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { transformAppSource, transformIndexSource } from '../scripts/runtime-tax-transform.mjs';
import { injectLegalLinks, stripWebAnalyticsForNative } from '../scripts/legal-runtime.mjs';

const nativeTag = '<script src="mobile-native.js" defer></script>';

function stripNativeInjection(html) {
  const count = html.split(nativeTag).length - 1;
  assert.equal(count, 1, 'mobile build must inject mobile-native.js exactly once');
  return html.replace(nativeTag, '');
}

test('mobile build materializes certified TAX runtime instead of raw legacy sources', () => {
  const rawIndex = readFileSync('index.html', 'utf8');
  const rawApp = readFileSync('src/app.js', 'utf8');

  // These assertions make the regression causal: the repository sources still contain
  // legacy material that must never be copied raw into Capacitor webDir.
  assert.ok(rawIndex.includes("<script>\nconst WA='17873566336', PIN='1234';"));
  assert.ok(rawApp.includes("if(typeof s.rate==='undefined') s.rate=.115;"));

  execFileSync(process.execPath, ['scripts/build-mobile.mjs'], { stdio: 'pipe' });

  const builtIndex = readFileSync('www/index.html', 'utf8');
  const builtApp = readFileSync('www/src/app.js', 'utf8');
  const expectedIndex = stripWebAnalyticsForNative(injectLegalLinks(transformIndexSource(rawIndex)));

  assert.equal(stripNativeInjection(builtIndex), expectedIndex);
  assert.equal(builtApp, transformAppSource(rawApp));
  assert.notEqual(stripNativeInjection(builtIndex), rawIndex);
  assert.notEqual(builtApp, rawApp);

  assert.ok(builtIndex.includes('<script src="/script.js"></script>'));
  assert.ok(builtIndex.includes('<select id="taxProfile"'));
  assert.ok(builtIndex.includes('legal-links.js'));
  assert.ok(!builtIndex.includes('googletagmanager.com'));
  assert.ok(!builtIndex.includes("gtag('config'"));
  assert.ok(!builtIndex.includes('id="rate" class="input" type="number" value="11.5"'));
  assert.ok(!builtIndex.includes('<b class="mono">20</b>'));
  assert.ok(!builtApp.includes("if(typeof s.rate==='undefined') s.rate=.115;"));
  assert.ok(!builtApp.includes('let today=new Date(),days=20-today.getDate();'));
  assert.ok(!builtApp.includes('Use el reporte mensual para separar el IVU y radicar antes del día 20.'));
});
