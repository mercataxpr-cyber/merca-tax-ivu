import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { transformAppSource, transformIndexSource } from './runtime-tax-transform.mjs';
import { injectLegalLinks } from './legal-runtime.mjs';

const out = 'public';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const files = [
  'script.js',
  'style.css',
  'mobile-r1.css',
  'manifest.json',
  'sw.js',
  'pwa-register.js',
  'privacy.html',
  'terms.html',
  'legal-links.js',
  'logo.png',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png'
];

for (const file of files) {
  if (existsSync(file)) cpSync(file, `${out}/${file}`);
}
for (const dir of ['assets', 'src']) {
  if (existsSync(dir)) cpSync(dir, `${out}/${dir}`, { recursive: true });
}

// PWA install source of truth: the user-approved MercaTax icon set committed at repo root.
// Do not substitute native launcher artwork here; PWA and native packaging are separate concerns.
for (const source of ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png']) {
  if (!existsSync(source)) throw new Error(`Approved PWA install icon is missing: ${source}`);
}
if (!existsSync('sw.js')) throw new Error('PWA service worker is missing: sw.js');
if (!existsSync('pwa-register.js')) throw new Error('PWA registration script is missing: pwa-register.js');

// Preserve the approved native 1024px AppIcon for branded report preview/print/export only.
const reportLogoSource = 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png';
if (!existsSync(reportLogoSource)) throw new Error(`Approved report logo asset is missing: ${reportLogoSource}`);
const reportLogoDir = `${out}/ios/App/App/Assets.xcassets/AppIcon.appiconset`;
mkdirSync(reportLogoDir, { recursive: true });
cpSync(reportLogoSource, `${reportLogoDir}/AppIcon-512@2x.png`);

// Static hosting must serve the same certified TAX runtime as server.js.
let builtIndex = injectLegalLinks(transformIndexSource(readFileSync('index.html', 'utf8')));
builtIndex = builtIndex.replace(
  '<link rel="manifest" href="manifest.json?v=pwa-rootfix-r1-official">',
  '<link rel="manifest" crossorigin="use-credentials" href="manifest.json?v=icon-preview-r4-auth">',
);
if (!builtIndex.includes('/pwa-register.js')) {
  builtIndex = builtIndex.replace(
    '</body>',
    '<script src="/pwa-register.js?v=icon-preview-r4-auth"></script></body>',
  );
}
writeFileSync(`${out}/index.html`, builtIndex);
writeFileSync(
  `${out}/src/app.js`,
  transformAppSource(readFileSync('src/app.js', 'utf8')),
);

console.log('Static web bundle ready in public/ with certified TAX transforms, legal navigation and installable PWA assets.');
