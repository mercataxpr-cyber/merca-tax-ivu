import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const ui = readFileSync('src/mobile-vnext-ui.js', 'utf8');
const build = readFileSync('scripts/build.mjs', 'utf8');
const buildMobile = readFileSync('scripts/build-mobile.mjs', 'utf8');
const buildWeb = readFileSync('scripts/build-web.mjs', 'utf8');
const reportLogo = 'icon-512.png';

test('vNext UI is loaded after the existing mobile UI bridge', () => {
  assert.match(build, /src\/mobile-r1-ui\.js/);
  assert.match(build, /src\/mobile-vnext-ui\.js/);
  assert.ok(build.indexOf('src/mobile-r1-ui.js') < build.indexOf('src/mobile-vnext-ui.js'));
});

test('bottom navigation is the approved five-destination model', () => {
  const nav = ui.match(/const navItems = \[[^;]+;/)?.[0] || '';
  for (const label of ['Inicio', 'Registrar', 'Historial', 'Reportes', 'Calcula']) assert.match(nav, new RegExp(label));
  assert.doesNotMatch(nav, /Configuración|Ajustes|Menú/);
});

test('calculator reuses domain operations and does not duplicate 11.5 arithmetic', () => {
  assert.match(ui, /MercaTaxDomain\.calculateTaxAdded/);
  assert.match(ui, /MercaTaxDomain\.calculateTaxIncluded/);
  assert.match(ui, /MercaTaxDomain\.PROFILE_IDS\.GENERAL_11_5/);
  assert.doesNotMatch(ui, /\*\s*0\.115|\/\s*1\.115/);
});

test('overflow menu removes the duplicate business-selection label', () => {
  assert.match(ui, /Gestionar negocio/);
  assert.match(ui, /Editar Perfil del Negocio/);
  assert.doesNotMatch(ui, /Cambiar\s*\/\s*Seleccionar negocio/);
});

test('ads use a neutral reserved slot and no hard-coded sponsor', () => {
  assert.match(ui, /Espacio publicitario/);
  assert.doesNotMatch(ui, /Banco Popular|Popular Bank|Patrocinado por/);
});

test('destructive history actions preserve existing confirmation flows', () => {
  assert.match(ui, /confirmClear\(\)/);
  assert.match(ui, /askDeleteSale\(/);
});

test('AI report CTA cannot simulate a successful operation', () => {
  assert.match(ui, /class=\"vxAi\" disabled/);
  assert.match(ui, /Próximamente/);
});


test('report branding uses the official MercaTax logo and packages it for web/mobile', () => {
  assert.equal(existsSync(reportLogo), true);
  assert.match(ui, /REPORT_LOGO_PATH='icon-512\.png'/);
  assert.match(ui, /MercaTax IVU PR<\/strong><span>Organización Financiera/);
  assert.ok(buildMobile.includes("'icon-512.png'"));
  assert.ok(buildWeb.includes("'icon-512.png'"));
  // The legacy black/gold "MT" artwork must never ship again; reports use the official icon.
  assert.equal(existsSync('logo.png'), false);
  assert.doesNotMatch(ui + readFileSync('src/mobile-r1-ui.js', 'utf8'), /'logo\.png'/);
});

test('three-dot menu stays above the bottom navigation with internal scrolling', () => {
  const index = readFileSync('index.html', 'utf8');
  const style = readFileSync('style.css', 'utf8');
  // The menu must not be trapped inside the sticky header stacking context.
  const header = index.slice(index.indexOf('<header class="top">'), index.indexOf('</header>'));
  assert.doesNotMatch(header, /id="menu"/);
  assert.ok(index.indexOf('<div id="menu" class="menu"></div>') > index.indexOf('</header>'));

  const menuCss = ui.match(/\.menu\.vxMenu\{--vx-menu-top[^}]+\}/)?.[0] || '';
  assert.match(menuCss, /position:fixed/);
  assert.match(menuCss, /max-height:var\(--vx-menu-max\)/);
  assert.match(menuCss, /--vx-menu-bottom:calc\(74px \+ var\(--safe-bottom,0px\)\)/);
  assert.match(ui, /--vx-menu-max:calc\(100dvh - var\(--vx-menu-top\) - var\(--vx-menu-bottom\)\)/);
  const menuZ = Number(menuCss.match(/z-index:(\d+)/)?.[1]);
  const navZ = Number(style.match(/\.bottomNavBar \{[^}]*z-index: (\d+)/)?.[1]);
  assert.ok(menuZ > navZ, `menu z-index ${menuZ} must exceed bottom nav ${navZ}`);
  assert.match(ui, /\.vxMenuList\{max-height:calc\(var\(--vx-menu-max\) - 68px\);overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain/);

  // All ten options remain in the single canonical builder, with its own close control.
  const builder = ui.slice(ui.indexOf('function rebuildMenu()'), ui.indexOf('function due()'));
  assert.equal((builder.match(/menuButton\(/g) || []).length, 10);
  assert.match(builder, /class="vxMenuClose" aria-label="Cerrar menú"/);
  assert.match(ui, /installMenuDismiss\(\)/);
  assert.match(builder, /privacy\.html/);
  assert.match(builder, /terms\.html/);

  // No second runtime injects content into the menu, and no build-time geometry patches compete.
  assert.doesNotMatch(readFileSync('legal-links.js', 'utf8'), /getElementById\('menu'\)|data-mt-legal-links/);
  assert.doesNotMatch(buildWeb, /teki-menu-viewport|m\.style\.position|Cerrar menú/);
  assert.equal(existsSync('src/teki-report-fix-r2.js'), false);
});
