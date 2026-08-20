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
  'privacy.html',
  'terms.html',
  'legal-links.js',
  'logo.png'
];

for (const file of files) {
  if (existsSync(file)) cpSync(file, `${out}/${file}`);
}
for (const dir of ['assets', 'src']) {
  if (existsSync(dir)) cpSync(dir, `${out}/${dir}`, { recursive: true });
}

// Source of truth: only assets from the user-approved AppIcons package.
const officialAndroidIcon192 = 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png';
const officialIosIcon1024 = 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png';
for (const source of [officialAndroidIcon192, officialIosIcon1024]) {
  if (!existsSync(source)) throw new Error(`Approved MercaTax icon asset is missing: ${source}`);
}

// Runtime aliases are exact byte-for-byte copies of approved package assets.
// No alternate icon artwork is stored at repository root.
cpSync(officialAndroidIcon192, `${out}/icon-192.png`);
cpSync(officialIosIcon1024, `${out}/icon-512.png`);
cpSync(officialAndroidIcon192, `${out}/apple-touch-icon.png`);

// Preserve the approved 1024px AppIcon for branded report preview/print/export.
const reportLogoSource = officialIosIcon1024;
const reportLogoDir = `${out}/ios/App/App/Assets.xcassets/AppIcon.appiconset`;
mkdirSync(reportLogoDir, { recursive: true });
cpSync(reportLogoSource, `${reportLogoDir}/AppIcon-512@2x.png`);

// Static hosting must serve the same certified TAX runtime as server.js.
writeFileSync(
  `${out}/index.html`,
  injectLegalLinks(transformIndexSource(readFileSync('index.html', 'utf8'))),
);
writeFileSync(
  `${out}/src/app.js`,
  transformAppSource(readFileSync('src/app.js', 'utf8')),
);

console.log('Static web bundle ready in public/ with certified TAX transforms, legal navigation and approved AppIcons-only install assets.');
