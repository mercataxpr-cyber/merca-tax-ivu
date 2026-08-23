import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { transformAppSource, transformIndexSource } from './runtime-tax-transform.mjs';
import { injectLegalLinks, stripWebAnalyticsForNative } from './legal-runtime.mjs';

function requireGate(condition, message) {
  if (!condition) throw new Error(message);
}

function read(path) {
  requireGate(existsSync(path), `Missing packaged runtime file: ${path}`);
  return readFileSync(path);
}

function readText(path) {
  return read(path).toString('utf8');
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function stripNativeInjection(html) {
  const tag = '<script src="mobile-native.js" defer></script>';
  const count = html.split(tag).length - 1;
  requireGate(count === 1, `Expected exactly one mobile-native.js injection; found ${count}`);
  return html.replace(tag, '');
}

function requireIncludes(source, marker, label) {
  requireGate(source.includes(marker), `Missing ${label}: ${marker}`);
}

function requireExcludes(source, marker, label) {
  requireGate(!source.includes(marker), `Legacy ${label} remains reachable: ${marker}`);
}

const wwwIndexPath = 'www/index.html';
const wwwAppPath = 'www/src/app.js';
const wwwLoaderPath = 'www/script.js';
const androidIndexPath = 'android/app/src/main/assets/public/index.html';
const androidAppPath = 'android/app/src/main/assets/public/src/app.js';
const iosIndexPath = 'ios/App/App/public/index.html';
const iosAppPath = 'ios/App/App/public/src/app.js';

const rawIndex = readText('index.html');
const rawApp = readText('src/app.js');
const wwwIndex = readText(wwwIndexPath);
const wwwApp = readText(wwwAppPath);
const wwwLoader = readText(wwwLoaderPath);

const expectedIndex = stripWebAnalyticsForNative(
  injectLegalLinks(transformIndexSource(rawIndex))
);
const expectedApp = transformAppSource(rawApp);
requireGate(stripNativeInjection(wwwIndex) === expectedIndex, 'www/index.html is not the canonical TAX + Legal - web analytics mobile build output plus native injection');
requireGate(wwwApp === expectedApp, 'www/src/app.js is not the certified transformAppSource() output');
requireGate(wwwApp !== rawApp, 'www/src/app.js unexpectedly equals raw legacy source');
requireGate(stripNativeInjection(wwwIndex) !== rawIndex, 'www/index.html unexpectedly equals raw legacy source');

requireIncludes(wwwIndex, '<script src="/script.js"></script>', 'certified loader reference');
requireIncludes(wwwIndex, '<select id="taxProfile"', 'certified tax profile selector');
requireIncludes(wwwIndex, 'id="effectiveDueDate">—</b>', 'certified effective due date placeholder');
requireIncludes(wwwIndex, 'legal-links.js', 'legal runtime reference');
requireIncludes(wwwIndex, '<script src="mobile-native.js" defer></script>', 'native bridge injection');
requireExcludes(wwwIndex, 'googletagmanager.com', 'web analytics bootstrap');
requireExcludes(wwwIndex, 'gtag(', 'web analytics bootstrap');
requireExcludes(wwwIndex, "<script>\nconst WA='17873566336', PIN='1234';", 'inline application');
requireExcludes(wwwIndex, 'id="rate" class="input" type="number" value="11.5"', 'numeric tax input');
requireExcludes(wwwIndex, '<b class="mono">20</b>', 'hard-coded due day');
requireExcludes(wwwIndex, 'IVU Estatal (10.5%):', 'fixed state-rate copy');
requireExcludes(wwwIndex, 'IVU Municipal (1.0%):', 'fixed municipal-rate copy');

for (const marker of [
  'const municipalities=[...MercaTaxDomain.MUNICIPALITIES];',
  'MercaTaxTaxUi.migrateSale(s);',
  'function saleBreakdown(s){return MercaTaxTaxUi.breakdownForSale(s)}',
  "taxProfile=document.getElementById('taxProfile').value",
  'MercaTaxTaxUi.renderDueStatus({reportingPeriod:state.selectedMonth,currentDate:new Date()});',
  'MercaTaxTaxUi.reminderForPeriod({reportingPeriod:state.selectedMonth,currentDate:new Date()})'
]) requireIncludes(wwwApp, marker, 'transformed TAX runtime marker');

for (const marker of [
  "if(typeof s.rate==='undefined') s.rate=.115;",
  'function saleBreakdown(s){return MercaTaxDomain.calculateIvuBreakdown(s.amount,s.rate??MercaTaxDomain.DEFAULT_RATE)}',
  'let today=new Date(),days=20-today.getDate();',
  'let d=new Date().getDate();let days=20-d;',
  'La app desglosa automáticamente: venta sin IVU, IVU estatal 10.5%, IVU municipal 1% y total vendido.',
  'Use el reporte mensual para separar el IVU y radicar antes del día 20.'
]) requireExcludes(wwwApp, marker, 'causal TAX fallback');

const loaderOrder = [
  'src/domain.js',
  'src/tax-remediation.js',
  'src/tax-calendar-contract.js',
  'src/tax-ui-bridge.js',
  'src/app.js',
  'src/mobile-r1-ui.js'
];
let previous = -1;
for (const marker of loaderOrder) {
  const current = wwwLoader.indexOf(marker);
  requireGate(current > previous, `Loader order invalid at ${marker}`);
  previous = current;
}

const pairs = [
  [wwwIndexPath, androidIndexPath],
  [wwwAppPath, androidAppPath],
  [wwwIndexPath, iosIndexPath],
  [wwwAppPath, iosAppPath]
];
for (const [sourcePath, packagedPath] of pairs) {
  const source = read(sourcePath);
  const packaged = read(packagedPath);
  requireGate(source.equals(packaged), `${packagedPath} differs from ${sourcePath}`);
  console.log(`${packagedPath} sha256=${sha256(packaged)}`);
}

console.log(`www/index.html sha256=${sha256(read(wwwIndexPath))}`);
console.log(`www/src/app.js sha256=${sha256(read(wwwAppPath))}`);
console.log('MOBILE_TAX_RUNTIME_PARITY=PASS');
