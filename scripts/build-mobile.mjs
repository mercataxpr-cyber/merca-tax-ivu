import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { build } from 'esbuild';
import { transformAppSource, transformIndexSource } from './runtime-tax-transform.mjs';
import { injectLegalLinks, stripWebAnalyticsForNative } from './legal-runtime.mjs';

const out = 'www';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const files = [
  'index.html',
  'script.js',
  'style.css',
  'mobile-r1.css',
  'manifest.json',
  'privacy.html',
  'terms.html',
  'legal-links.js',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
  'logo.png'
];

for (const file of files) {
  if (existsSync(file)) cpSync(file, `${out}/${file}`);
}
for (const dir of ['assets', 'src']) {
  if (existsSync(dir)) cpSync(dir, `${out}/${dir}`, { recursive: true });
}

// Capacitor must consume the same TAX-prepared runtime served by server.js.
// Reuse the certified transform module directly; do not duplicate TAX rules here.
const preparedIndex = stripWebAnalyticsForNative(
  injectLegalLinks(transformIndexSource(readFileSync('index.html', 'utf8')))
);
writeFileSync(`${out}/index.html`, preparedIndex);
writeFileSync(`${out}/src/app.js`, transformAppSource(readFileSync('src/app.js', 'utf8')));

await build({
  entryPoints: ['src/mobile-native-entry.js'],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: ['safari15', 'chrome100'],
  outfile: `${out}/mobile-native.js`,
  sourcemap: false,
  minify: false
});

const indexPath = `${out}/index.html`;
let html = readFileSync(indexPath, 'utf8');
if (!html.includes('mobile-native.js')) {
  const tag = '<script src="mobile-native.js" defer></script>';
  html = /<\/body>/i.test(html)
    ? html.replace(/<\/body>/i, `${tag}</body>`)
    : `${html}\n${tag}\n`;
  writeFileSync(indexPath, html);
}

console.log('Mobile web bundle ready in www/ with certified TAX transforms, legal pages, native analytics parity and native bridge.');
