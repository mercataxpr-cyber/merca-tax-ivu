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

for (const source of ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png']) {
  if (!existsSync(source)) throw new Error(`Approved PWA install icon is missing: ${source}`);
}

const reportLogoSource = 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png';
if (!existsSync(reportLogoSource)) throw new Error(`Approved report logo asset is missing: ${reportLogoSource}`);
const reportLogoDir = `${out}/ios/App/App/Assets.xcassets/AppIcon.appiconset`;
mkdirSync(reportLogoDir, { recursive: true });
cpSync(reportLogoSource, `${reportLogoDir}/AppIcon-512@2x.png`);

let preparedIndex = stripWebAnalyticsForNative(
  injectLegalLinks(transformIndexSource(readFileSync('index.html', 'utf8')))
);

const modalMarkup = '<div id="modal" class="modal"><div class="dialog"><h2 id="modalTitle"></h2><div id="modalBody"></div><div class="dialogActions" id="modalActions"><button class="linkBtn" onclick="closeDialog()">Cerrar</button></div></div></div>';
const modalMarkupWithClose = '<div id="modal" class="modal"><div class="dialog" style="position:relative"><button type="button" class="tekiModalCloseStatic" aria-label="Cerrar" title="Cerrar" onclick="closeDialog()">×</button><h2 id="modalTitle"></h2><div id="modalBody"></div><div class="dialogActions" id="modalActions"><button class="linkBtn" onclick="closeDialog()">Cerrar</button></div></div></div>';
if (!preparedIndex.includes('tekiModalCloseStatic')) {
  if (!preparedIndex.includes(modalMarkup)) throw new Error('Modal markup not found for native close-control injection');
  preparedIndex = preparedIndex.replace(modalMarkup, modalMarkupWithClose);
}
const modalCloseStyle = '<style id="teki-modal-close-static">.tekiModalCloseStatic{position:absolute;top:10px;right:10px;width:44px;height:44px;min-width:44px;min-height:44px;border:0;border-radius:50%;background:rgba(17,20,24,.08);color:#111418;font-size:30px;line-height:1;display:grid;place-items:center;cursor:pointer;z-index:20}.tekiModalCloseStatic:active{transform:scale(.96)}#modalTitle{padding-right:52px}</style>';
if (!preparedIndex.includes('teki-modal-close-static')) {
  preparedIndex = preparedIndex.replace('</head>', `${modalCloseStyle}</head>`);
}

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
}
if (!html.includes('teki-report-fix-r2.js')) {
  const tag = '<script src="src/teki-report-fix-r2.js?v=report-modal-r3" defer></script>';
  html = /<\/body>/i.test(html)
    ? html.replace(/<\/body>/i, `${tag}</body>`)
    : `${html}\n${tag}\n`;
}
writeFileSync(indexPath, html);

console.log('Mobile web bundle ready in www/ with certified TAX transforms, legal pages, native bridge, official report icon and baked modal close control.');
