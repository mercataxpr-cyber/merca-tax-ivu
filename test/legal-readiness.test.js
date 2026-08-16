import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { injectLegalLinks, stripWebAnalyticsForNative } from '../scripts/legal-runtime.mjs';

test('public legal documents exist and identify MercaTax IVU PR', () => {
  for (const file of ['terms.html', 'privacy.html']) {
    assert.equal(existsSync(file), true, `${file} must exist`);
    const html = readFileSync(file, 'utf8');
    assert.match(html, /MercaTax IVU PR|MercaTax · Puerto Rico/);
  }
});

test('legal runtime injection is idempotent', () => {
  const source = '<!doctype html><html><body><main>App</main></body></html>';
  const once = injectLegalLinks(source);
  const twice = injectLegalLinks(once);
  assert.equal((twice.match(/legal-links\.js/g) || []).length, 1);
});

test('native privacy transform removes standard Google Analytics bootstrap', () => {
  const source = `<!doctype html><html><head>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-TEST123"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-TEST123');
</script>
</head><body></body></html>`;
  const native = stripWebAnalyticsForNative(source);
  assert.doesNotMatch(native, /googletagmanager\.com/);
  assert.doesNotMatch(native, /gtag\(['"]config['"]/);
});

test('generated static web output contains legal navigation and certified TAX runtime', () => {
  assert.equal(existsSync('public/index.html'), true, 'npm run build must materialize public/index.html');
  const html = readFileSync('public/index.html', 'utf8');
  assert.match(html, /legal-links\.js/);
  assert.match(html, /id="taxProfile"/);
  assert.doesNotMatch(html, /id="rate" class="input" type="number" value="11\.5"/);
  assert.equal(existsSync('public/privacy.html'), true);
  assert.equal(existsSync('public/terms.html'), true);
});
