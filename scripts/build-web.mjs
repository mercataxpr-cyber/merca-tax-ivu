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

// Preview-only splash correction. The source HTML still embeds legacy splash artwork;
// hide that artwork at runtime and render the already-approved PWA 512 icon instead.
const splashStyle = `
<style id="pwa-splash-r5">
.splash,
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
.splashContent,
.splash-content {
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
.splashLogo,
.splash-logo {
  display: none !important;
  animation: none !important;
  transform: none !important;
}
.splashContent::before,
.splash-content::before {
  content: "";
  display: block;
  width: min(180px, 44vw) !important;
  height: min(180px, 44vw) !important;
  flex: 0 0 auto;
  margin: 0 auto 18px !important;
  background: url('/icon-512.png?v=splash-r5') center center / contain no-repeat !important;
  filter: drop-shadow(0 8px 22px rgba(0,0,0,.28));
}
.splashTitle,
.splash-content h1 {
  max-width: 100% !important;
  margin: 0 auto 10px !important;
  font-size: clamp(26px, 7vw, 34px) !important;
  line-height: 1.08 !important;
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
  transform: none !important;
}
.splashSub,
.splash-slogan,
.splash-version,
.splash-content p {
  max-width: 100% !important;
  white-space: normal !important;
  overflow: visible !important;
}
@media (max-height: 620px) {
  .splashContent::before,
  .splash-content::before {
    width: min(136px, 36vw) !important;
    height: min(136px, 36vw) !important;
    margin-bottom: 12px !important;
  }
  .splashTitle,
  .splash-content h1 {
    font-size: clamp(23px, 6vw, 30px) !important;
  }
}
</style>`;
if (!builtIndex.includes('pwa-splash-r5')) {
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

console.log('Static web bundle ready in public/ with certified TAX transforms, legal navigation, installable PWA assets and centered official splash identity.');
