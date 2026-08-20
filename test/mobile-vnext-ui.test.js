import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ui = readFileSync('src/mobile-vnext-ui.js', 'utf8');
const build = readFileSync('scripts/build.mjs', 'utf8');

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
