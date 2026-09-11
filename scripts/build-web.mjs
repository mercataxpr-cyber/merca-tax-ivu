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

for (const source of ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png']) {
  if (!existsSync(source)) throw new Error(`Approved PWA install icon is missing: ${source}`);
}
if (!existsSync('sw.js')) throw new Error('PWA service worker is missing: sw.js');
if (!existsSync('pwa-register.js')) throw new Error('PWA registration script is missing: pwa-register.js');

const reportLogoSource = 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png';
if (!existsSync(reportLogoSource)) throw new Error(`Approved report logo asset is missing: ${reportLogoSource}`);
const reportLogoDir = `${out}/ios/App/App/Assets.xcassets/AppIcon.appiconset`;
mkdirSync(reportLogoDir, { recursive: true });
cpSync(reportLogoSource, `${reportLogoDir}/AppIcon-512@2x.png`);

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
builtIndex = builtIndex.replace(
  '<link rel="manifest" href="manifest.json?v=pwa-rootfix-r1-official">',
  '<link rel="manifest" crossorigin="use-credentials" href="manifest.json?v=icon-preview-r4-auth">',
);

// Final CSS guard: the legacy mobile rule can add `left:80px` on narrow screens,
// and runtime code may try to reposition the drawer. Keep the entire panel inside
// the visible viewport with !important so the close X cannot be clipped offscreen.
const menuViewportStyle = `<style id="teki-menu-viewport-r8">
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
if (!builtIndex.includes('teki-menu-viewport-r8')) {
  builtIndex = builtIndex.replace('</head>', `${menuViewportStyle}</head>`);
}

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

// Bake the close control into the actual modal markup so it is present before runtime.
const modalMarkup = '<div id="modal" class="modal"><div class="dialog"><h2 id="modalTitle"></h2><div id="modalBody"></div><div class="dialogActions" id="modalActions"><button class="linkBtn" onclick="closeDialog()">Cerrar</button></div></div></div>';
const modalMarkupWithClose = '<div id="modal" class="modal"><div class="dialog" style="position:relative"><button type="button" class="tekiModalCloseStatic" aria-label="Cerrar" title="Cerrar" onclick="closeDialog()">×</button><h2 id="modalTitle"></h2><div id="modalBody"></div><div class="dialogActions" id="modalActions"><button class="linkBtn" onclick="closeDialog()">Cerrar</button></div></div></div>';
if (!builtIndex.includes('tekiModalCloseStatic')) {
  if (!builtIndex.includes(modalMarkup)) throw new Error('Modal markup not found for close-control injection');
  builtIndex = builtIndex.replace(modalMarkup, modalMarkupWithClose);
}
const modalCloseStyle = '<style id="teki-modal-close-static">.tekiModalCloseStatic{position:absolute;top:10px;right:10px;width:44px;height:44px;min-width:44px;min-height:44px;border:0;border-radius:50%;background:rgba(17,20,24,.08);color:#111418;font-size:30px;line-height:1;display:grid;place-items:center;cursor:pointer;z-index:20}.tekiModalCloseStatic:active{transform:scale(.96)}#modalTitle{padding-right:52px}</style>';
if (!builtIndex.includes('teki-modal-close-static')) {
  builtIndex = builtIndex.replace('</head>', `${modalCloseStyle}</head>`);
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

console.log('Static web bundle ready in public/ with certified TAX transforms, legal navigation, installable PWA assets, official report icon, viewport-locked menu X and no permanent report-fix runtime patch.');