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
  'app-icon-official.png'
];

for (const file of files) {
  if (existsSync(file)) cpSync(file, `${out}/${file}`);
}
for (const dir of ['assets', 'src']) {
  if (existsSync(dir)) cpSync(dir, `${out}/${dir}`, { recursive: true });
}

if (!existsSync('sw.js')) throw new Error('PWA service worker is missing: sw.js');
if (!existsSync('pwa-register.js')) throw new Error('PWA registration script is missing: pwa-register.js');
if (!existsSync('app-icon-official.png')) throw new Error('Canonical official app icon is missing: app-icon-official.png');

// Bake the close X into the same vNext source that creates the three-dot menu.
// Pin the drawer itself to the visible viewport so neither the drawer nor its X can overflow right.
const vnextUiPath = `${out}/src/mobile-vnext-ui.js`;
if (!existsSync(vnextUiPath)) throw new Error('vNext UI source is missing from web bundle');
let vnextUi = readFileSync(vnextUiPath, 'utf8');
const menuBuildNeedle = "    const m=$('menu'); if(!m)return; m.classList.add('vxMenu');\n    m.innerHTML=[\n      menuButton(";
const menuBuildReplacement = "    const m=$('menu'); if(!m)return; m.classList.add('vxMenu'); m.style.position='fixed'; m.style.left='auto'; m.style.right='12px'; m.style.top='calc(76px + var(--safe-top, 0px))'; m.style.width='min(520px, calc(100vw - 24px))'; m.style.maxWidth='calc(100vw - 24px)'; m.style.boxSizing='border-box'; m.style.paddingTop='58px';\n    m.innerHTML=[\n      '<button type=\"button\" aria-label=\"Cerrar menú\" title=\"Cerrar menú\" onclick=\"document.getElementById(\\'menu\\').style.display=\\'none\\'\" style=\"position:absolute!important;top:8px;right:18px;width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;padding:0!important;margin:0!important;border:0!important;border-bottom:0!important;border-radius:50%!important;background:#f2f2f1!important;color:#11151b!important;font-size:32px!important;font-weight:400!important;line-height:1!important;display:grid!important;place-items:center!important;z-index:9999!important\">×</button>',\n      menuButton(";
if (!vnextUi.includes('aria-label=\"Cerrar menú\"')) {
  if (!vnextUi.includes(menuBuildNeedle)) throw new Error('vNext three-dot menu builder not found for close-X injection');
  vnextUi = vnextUi.replace(menuBuildNeedle, menuBuildReplacement);
}
writeFileSync(vnextUiPath, vnextUi);

let builtIndex = injectLegalLinks(transformIndexSource(readFileSync('index.html', 'utf8')));

// The old identity artwork was embedded directly in the browser splash markup.
// Remove the image from the generated bundle instead of carrying obsolete artwork forward.
builtIndex = builtIndex.replace(
  /(<div id="splash-screen"><div class="splash-content">)<img\s+src="data:image\/[^"]+"[^>]*>/i,
  '$1',
);

// Keep the three-dot drawer inside the visible viewport.
const menuViewportStyle = `<style id="mercatax-menu-viewport">
#menu.vxMenu,
.menu.vxMenu {
  position: fixed !important;
  left: auto !important;
  right: 12px !important;
  top: calc(76px + var(--safe-top, 0px)) !important;
  width: min(520px, calc(100vw - 24px)) !important;
  max-width: calc(100vw - 24px) !important;
  min-width: 0 !important;
  box-sizing: border-box !important;
  overflow: visible !important;
}
#menu.vxMenu [aria-label="Cerrar menú"],
.menu.vxMenu [aria-label="Cerrar menú"] {
  right: 18px !important;
  left: auto !important;
  max-width: 44px !important;
  box-sizing: border-box !important;
}
</style>`;
if (!builtIndex.includes('mercatax-menu-viewport')) {
  builtIndex = builtIndex.replace('</head>', `${menuViewportStyle}</head>`);
}

// Bake the close control into the actual modal markup so it is present before runtime.
const modalMarkup = '<div id="modal" class="modal"><div class="dialog"><h2 id="modalTitle"></h2><div id="modalBody"></div><div class="dialogActions" id="modalActions"><button class="linkBtn" onclick="closeDialog()">Cerrar</button></div></div></div>';
const modalMarkupWithClose = '<div id="modal" class="modal"><div class="dialog" style="position:relative"><button type="button" class="mercataxModalClose" aria-label="Cerrar" title="Cerrar" onclick="closeDialog()">×</button><h2 id="modalTitle"></h2><div id="modalBody"></div><div class="dialogActions" id="modalActions"><button class="linkBtn" onclick="closeDialog()">Cerrar</button></div></div></div>';
if (!builtIndex.includes('mercataxModalClose')) {
  if (!builtIndex.includes(modalMarkup)) throw new Error('Modal markup not found for close-control injection');
  builtIndex = builtIndex.replace(modalMarkup, modalMarkupWithClose);
}
const modalCloseStyle = '<style id="mercatax-modal-close">.mercataxModalClose{position:absolute;top:10px;right:10px;width:44px;height:44px;min-width:44px;min-height:44px;border:0;border-radius:50%;background:rgba(17,20,24,.08);color:#111418;font-size:30px;line-height:1;display:grid;place-items:center;cursor:pointer;z-index:20}.mercataxModalClose:active{transform:scale(.96)}#modalTitle{padding-right:52px}</style>';
if (!builtIndex.includes('mercatax-modal-close')) {
  builtIndex = builtIndex.replace('</head>', `${modalCloseStyle}</head>`);
}

if (!builtIndex.includes('/pwa-register.js')) {
  builtIndex = builtIndex.replace(
    '</body>',
    '<script src="/pwa-register.js"></script></body>',
  );
}

writeFileSync(`${out}/index.html`, builtIndex);
writeFileSync(
  `${out}/src/app.js`,
  transformAppSource(readFileSync('src/app.js', 'utf8')),
);

console.log('Static web bundle ready in public/ with certified TAX transforms, legal navigation, stable UI controls and canonical official app identity.');
