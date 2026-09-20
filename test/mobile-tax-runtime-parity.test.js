import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { transformAppSource } from '../scripts/runtime-tax-transform.mjs';
import { stripWebAnalyticsForNative } from '../scripts/legal-runtime.mjs';

const nativeTag = '<script src="mobile-native.js" defer></script>';
const browserSplash = /<div id="splash-screen"><div class="splash-content">[\s\S]*?<\/div><\/div>\s*/i;

function stripNativeInjection(html) {
  const count = html.split(nativeTag).length - 1;
  assert.equal(count, 1, 'mobile build must inject mobile-native.js exactly once');
  return html.replace(nativeTag, '');
}

function expectedNativeIndexFromFinalizedPublic(publicIndex) {
  return stripWebAnalyticsForNative(publicIndex)
    .replace(/<script\s+src="\/pwa-register\.js[^>]*><\/script>/gi, '')
    .replace(/<script\s+src="\/src\/teki-report-fix-r2\.js[^>]*><\/script>/gi, '')
    .replace(/<script\s+src="src\/teki-report-fix-r2\.js[^>]*><\/script>/gi, '')
    .replace(browserSplash, '');
}

test('mobile build materializes the finalized approved runtime instead of raw legacy sources', () => {
  const rawIndex = readFileSync('index.html', 'utf8');
  const rawApp = readFileSync('src/app.js', 'utf8');
  const finalizedIndex = readFileSync('public/index.html', 'utf8');
  const finalizedApp = readFileSync('public/src/app.js', 'utf8');
  const finalizedVnext = readFileSync('public/src/mobile-vnext-ui.js', 'utf8');

  // Repository sources still contain legacy material that must never be copied raw into Capacitor webDir.
  assert.ok(rawIndex.includes("<script>\nconst WA='17873566336', PIN='1234';"));
  assert.ok(rawApp.includes("if(typeof s.rate==='undefined') s.rate=.115;"));

  // The finalized public bundle is the canonical, already-remediated/approved UI source for native.
  assert.equal(finalizedApp, transformAppSource(rawApp));
  assert.ok(finalizedVnext.includes('aria-label="Seleccionar mes"'));
  assert.ok(finalizedVnext.includes('aria-label="Seleccionar año"'));
  assert.ok(finalizedVnext.includes('aria-label=\"Cerrar menú\"'));
  assert.ok(finalizedIndex.includes('mercatax-approved-home-static'));
  assert.ok(finalizedIndex.includes('id="splash-screen"'));
  assert.ok(!finalizedIndex.includes('teki-report-fix-r2.js'));

  execFileSync(process.execPath, ['scripts/build-mobile.mjs'], { stdio: 'pipe' });

  const builtIndex = readFileSync('www/index.html', 'utf8');
  const builtApp = readFileSync('www/src/app.js', 'utf8');
  const builtVnext = readFileSync('www/src/mobile-vnext-ui.js', 'utf8');
  const expectedIndex = expectedNativeIndexFromFinalizedPublic(finalizedIndex);

  assert.equal(stripNativeInjection(builtIndex), expectedIndex);
  assert.equal(builtApp, finalizedApp);
  assert.equal(builtVnext, finalizedVnext);
  assert.notEqual(stripNativeInjection(builtIndex), rawIndex);
  assert.notEqual(builtApp, rawApp);

  assert.ok(builtIndex.includes('<script src="/script.js"></script>'));
  assert.ok(builtIndex.includes('<select id="taxProfile"'));
  assert.ok(builtIndex.includes('legal-links.js'));
  assert.ok(builtIndex.includes('mercatax-approved-home-static'));
  assert.ok(!builtIndex.includes('id="splash-screen"'));
  assert.ok(!builtIndex.includes('googletagmanager.com'));
  assert.ok(!builtIndex.includes("gtag('config'"));
  assert.ok(!builtIndex.includes('teki-report-fix-r2.js'));
  assert.ok(!builtIndex.includes('id="rate" class="input" type="number" value="11.5"'));
  assert.ok(!builtIndex.includes('<b class="mono">20</b>'));
  assert.ok(!builtApp.includes("if(typeof s.rate==='undefined') s.rate=.115;"));
  assert.ok(!builtApp.includes('let today=new Date(),days=20-today.getDate();'));
  assert.ok(!builtApp.includes('Use el reporte mensual para separar el IVU y radicar antes del día 20.'));
});
