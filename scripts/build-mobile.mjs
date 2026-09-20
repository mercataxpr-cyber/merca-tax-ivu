import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { build } from 'esbuild';
import { stripWebAnalyticsForNative } from './legal-runtime.mjs';

const source = 'public';
const out = 'www';

if (!existsSync(`${source}/index.html`)) {
  throw new Error('Finalized public bundle is missing. Run npm run build before mobile build.');
}

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
  'logo.png',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png'
];

for (const file of files) {
  const path = `${source}/${file}`;
  if (existsSync(path)) cpSync(path, `${out}/${file}`);
}
for (const dir of ['assets', 'src']) {
  const path = `${source}/${dir}`;
  if (existsSync(path)) cpSync(path, `${out}/${dir}`, { recursive: true });
}

for (const required of ['index.html', 'script.js', 'src/app.js', 'src/mobile-vnext-ui.js']) {
  if (!existsSync(`${out}/${required}`)) throw new Error(`Finalized native source missing: ${required}`);
}

for (const icon of ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png']) {
  if (!existsSync(`${source}/${icon}`)) throw new Error(`Approved install icon is missing from finalized bundle: ${icon}`);
}

const reportLogoSource = 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png';
if (!existsSync(reportLogoSource)) throw new Error(`Approved report logo asset is missing: ${reportLogoSource}`);
const reportLogoDir = `${out}/ios/App/App/Assets.xcassets/AppIcon.appiconset`;
mkdirSync(reportLogoDir, { recursive: true });
cpSync(reportLogoSource, `${reportLogoDir}/AppIcon-512@2x.png`);

// Native starts from the exact finalized browser bundle approved in preview.
// Remove only web/PWA-only scripts and the browser splash. Android/iOS already
// provide the native launch splash, so keeping the HTML splash would show twice.
let preparedIndex = stripWebAnalyticsForNative(readFileSync(`${source}/index.html`, 'utf8'));
preparedIndex = preparedIndex
  .replace(/<script\s+src="\/pwa-register\.js[^>]*><\/script>/gi, '')
  .replace(/<script\s+src="\/src\/teki-report-fix-r2\.js[^>]*><\/script>/gi, '')
  .replace(/<script\s+src="src\/teki-report-fix-r2\.js[^>]*><\/script>/gi, '');

const browserSplash = /<div id="splash-screen"><div class="splash-content">[\s\S]*?<\/div><\/div>\s*/i;
if (!browserSplash.test(preparedIndex)) {
  throw new Error('Expected browser splash was not found; refusing to build an unverified native payload.');
}
preparedIndex = preparedIndex.replace(browserSplash, '');
if (preparedIndex.includes('id="splash-screen"')) {
  throw new Error('Browser splash still exists in native payload after removal.');
}
writeFileSync(`${out}/index.html`, preparedIndex);

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
}
writeFileSync(indexPath, html);

console.log('Mobile bundle ready in www/ from finalized public/ output; approved UI parity preserved, native launch uses one splash, and no post-render report-fix runtime patch is present.');