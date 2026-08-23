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

// Remove the obsolete embedded Base64 splash artwork from the preview bundle and
// point the splash directly to the already-approved PWA 512px icon.
const legacySplashImage = /(<div id="splash-screen"><div class="splash-content"><img\s+)src="data:image\/[^"]+"/;
if (!legacySplashImage.test(builtIndex)) {
  throw new Error('Legacy splash image was not found for official icon replacement');
}
builtIndex = builtIndex.replace(
  legacySplashImage,
  '$1src="/icon-512.png?v=splash-r6"',
);

const splashStyle = `
<style id="pwa-splash-r6">
#splash-screen {
  position: fixed !important;
  inset: 0 !important;
  box-sizing: border-box !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  overflow: hidden !important;
  padding: max(24px, env(safe-area-inset-top)) 24px max(24px, env(safe-area-inset-bottom)) !important;
  background: #050608 !important;
}
#splash-screen .splash-content {
  width: 100% !important;
  max-width: 420px !important;
  margin: 0 auto !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center !important;
  transform: none !important;
}
#splash-screen img {
  display: block !important;
  width: min(180px, 44vw) !important;
  height: auto !important;
  max-width: 180px !important;
  max-height: 180px !important;
  object-fit: contain !important;
  margin: 0 auto 18px !important;
  animation: none !important;
  transform: none !important;
  filter: drop-shadow(0 8px 22px rgba(0,0,0,.28));
}
#splash-screen h1 {
  max-width: 100% !important;
  margin: 0 auto 10px !important;
  font-size: clamp(26px, 7vw, 34px) !important;
  line-height: 1.08 !important;
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
  transform: none !important;
}
#splash-screen .subtitle,
#splash-screen .version,
#splash-screen p {
  max-width: 100% !important;
  white-space: normal !important;
  overflow: visible !important;
}
@media (max-height: 620px) {
  #splash-screen img {
    width: min(136px, 36vw) !important;
    max-width: 136px !important;
    max-height: 136px !important;
    margin-bottom: 12px !important;
  }
  #splash-screen h1 {
    font-size: clamp(23px, 6vw, 30px) !important;
  }
}
</style>`;
if (!builtIndex.includes('pwa-splash-r6')) {
  builtIndex = builtIndex.replace('</head>', `${splashStyle}</head>`);
}

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

console.log('Static web bundle ready in public/ with certified TAX transforms, legal navigation, installable PWA assets and official centered splash identity.');
