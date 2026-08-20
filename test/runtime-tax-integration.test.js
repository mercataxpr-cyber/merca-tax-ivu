import test from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import vm from 'node:vm';
import { createMercaTaxServer } from '../server.js';

function certifiedCalendar(nonWorkingDates = []) {
  return {
    status: 'CERTIFIED',
    nonWorkingDates,
    jurisdiction: 'Puerto Rico',
    validFrom: '2026-01-01',
    validThrough: '2028-12-31',
    source: 'Runtime integration certified fixture',
    reference: 'RUNTIME-CALENDAR-TEST',
  };
}

function fakeBrowser() {
  const values = new Map();
  const elements = new Map();
  const notifications = [];

  class FakeDate extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-05-28T16:00:00Z'])); }
    static now() { return Date.parse('2026-05-28T16:00:00Z'); }
    static parse(value) { return Date.parse(value); }
    static UTC(...args) { return Date.UTC(...args); }
  }

  class FakeNotification {
    static permission = 'granted';
    static requestPermission() { return Promise.resolve('granted'); }
    constructor(title, options = {}) { notifications.push({ title, ...options }); }
  }

  function element(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        value: '',
        textContent: '',
        innerHTML: '',
        disabled: false,
        style: {},
        dataset: {},
        options: [],
        classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
        add(option) { this.options.push(option); },
        appendChild() {},
        click() {},
        focus() {},
      });
    }
    return elements.get(id);
  }

  const document = {
    readyState: 'complete',
    currentScript: null,
    head: { appendChild() {} },
    body: element('body'),
    getElementById: element,
    querySelectorAll() { return []; },
    querySelector() { return null; },
    createElement(tag) { return element(`created-${tag}-${elements.size}`); },
    addEventListener() {},
  };

  const localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    clear() { values.clear(); },
  };

  const context = {
    console,
    document,
    localStorage,
    Notification: FakeNotification,
    Option: class Option { constructor(text, value = text) { this.text = text; this.value = value; } },
    Date: FakeDate,
    URL,
    Blob,
    FileReader: class FileReader {},
    navigator: {},
    crypto: { randomUUID: () => 'runtime-test-id' },
    setTimeout(fn) { fn(); return 1; },
    clearTimeout() {},
    addEventListener() {},
    removeEventListener() {},
    alert() {},
    confirm() { return true; },
    location: { href: 'http://127.0.0.1/' , assign() {} },
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  return { context, element, localStorage, notifications };
}

async function withServer(run) {
  const server = createMercaTaxServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  try { return await run(base); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

function rawGet(base, requestPath) {
  const target = new URL(base);
  return new Promise((resolve, reject) => {
    const request = httpRequest({
      hostname: target.hostname,
      port: target.port,
      method: 'GET',
      path: requestPath,
    }, (response) => {
      const chunks = [];
      response.setEncoding('utf8');
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, body: chunks.join('') }));
    });
    request.on('error', reject);
    request.end();
  });
}

function loaderPaths(source) {
  return [...source.matchAll(/\bload\('([^']+)'/g)].map((match) => `/${match[1]}`);
}

async function loadServedRuntime(base) {
  const htmlResponse = await rawGet(base, '/');
  assert.equal(htmlResponse.status, 200);
  const html = htmlResponse.body;
  assert.match(html, /<script src="\/script\.js"><\/script>/);
  assert.doesNotMatch(html, /const WA='17873566336', PIN='1234'/);
  assert.doesNotMatch(html, /20-today\.getDate|rate\|\|\.115|radicar antes del día 20/i);
  assert.match(html, /id="taxProfile"/);
  assert.match(html, /id="effectiveDueDate">—</);

  const loaderResponse = await rawGet(base, '/script.js');
  assert.equal(loaderResponse.status, 200, 'script.js must be served');
  const paths = loaderPaths(loaderResponse.body);
  assert.deepEqual(paths, [
    '/src/domain.js',
    '/src/tax-remediation.js',
    '/src/tax-calendar-contract.js',
    '/src/tax-ui-bridge.js',
    '/src/app.js',
    '/src/mobile-r1-ui.js',
    '/src/mobile-vnext-ui.js',
  ]);

  const browser = fakeBrowser();
  let certifiedReminderSource = null;
  for (const scriptPath of paths) {
    const response = await rawGet(base, scriptPath);
    assert.equal(response.status, 200, `${scriptPath} must be served`);
    const source = response.body;
    if (scriptPath === '/src/app.js') {
      assert.doesNotMatch(source, /20-today\.getDate|days=20-d|radicar antes del día 20|s\.rate\?\?MercaTaxDomain\.DEFAULT_RATE|getElementById\('rate'\)/i);
      assert.match(source, /fecha efectiva certificada del calendario contributivo/i);
    }
    if (scriptPath === '/src/mobile-r1-ui.js') {
      assert.doesNotMatch(source, /window\.sendLocalReminder|faltan ['" ]*\+ *days|IVU estatal 10\.5%|IVU municipal 1%|radicar antes del día 20/i);
    }
    if (scriptPath === '/src/mobile-vnext-ui.js') {
      assert.doesNotMatch(source, /sendLocalReminder\s*=|20-today\.getDate|days=20-d|radicar antes del día 20/i);
      assert.match(source, /MercaTaxDomain\.calculateTaxAdded/);
      assert.match(source, /MercaTaxDomain\.calculateTaxIncluded/);
    }
    vm.runInContext(source, browser.context, { filename: scriptPath });
    if (scriptPath === '/src/app.js') certifiedReminderSource = String(browser.context.sendLocalReminder);
  }

  assert.ok(certifiedReminderSource, 'app must install the certified reminder presenter');
  assert.equal(String(browser.context.sendLocalReminder), certifiedReminderSource, 'mobile UI must not replace the certified reminder presenter');
  assert.match(certifiedReminderSource, /reminder\.effectiveDate/);
  assert.doesNotMatch(certifiedReminderSource, /faltan ['" ]*\+ *days|20-/i);
  return { html, loader: loaderResponse.body, paths, ...browser };
}

function assertProtectedAppSource(source) {
  assert.doesNotMatch(source, /20-today\.getDate|days=20-d|s\.rate\?\?MercaTaxDomain\.DEFAULT_RATE|getElementById\('rate'\)|radicar antes del día 20/i);
  assert.match(source, /MercaTaxTaxUi\.breakdownForSale/);
}

function assertProtectedHtml(source) {
  assert.match(source, /<script src="\/script\.js"><\/script>/);
  assert.doesNotMatch(source, /const WA='17873566336', PIN='1234'/);
  assert.doesNotMatch(source, /20-today\.getDate|radicar antes del día 20/i);
}

test('protected HTTP aliases cannot bypass runtime tax transforms', async () => withServer(async (base) => {
  const htmlAliases = [
    '/',
    '/index.html',
    '/./index.html',
    '/x/../index.html',
    '//index.html',
    '/%69ndex.html',
    '/index.html?x=1',
  ];
  for (const requestPath of htmlAliases) {
    const response = await rawGet(base, requestPath);
    assert.equal(response.status, 200, `${requestPath} must resolve through the protected HTML transform`);
    assertProtectedHtml(response.body);
  }

  const appAliases = [
    '/src/app.js',
    '/src//app.js',
    '/src/./app.js',
    '/src/x/../app.js',
    '//src/app.js',
    '/%73rc/app.js',
    '/src/%2e/app.js',
    '/src/x/%2e%2e/app.js',
    '/src%2Fapp.js',
    '/src/app.js?x=1',
  ];
  for (const requestPath of appAliases) {
    const response = await rawGet(base, requestPath);
    assert.equal(response.status, 200, `${requestPath} must resolve through the protected app transform`);
    assertProtectedAppSource(response.body);
  }

  const malformed = await rawGet(base, '/src/%E0%A4%A');
  assert.equal(malformed.status, 400);
  const traversal = await rawGet(base, '/%2e%2e/src/app.js');
  assert.equal(traversal.status, 403);
}));

test('served entrypoint executes certified profile pipeline for GENERAL_11_5, SPECIAL_4 and ZERO', async () => withServer(async (base) => {
  const { context, element, localStorage } = await loadServedRuntime(base);
  assert.equal(element('muni').options.length, 78);

  const cases = [
    ['GENERAL_11_5', '111.50', 10.5, 1, 11.5],
    ['SPECIAL_4', '104.00', 4, 0, 4],
    ['ZERO', '100.00', 0, 0, 0],
  ];
  for (const [profile, amount, stateTax, municipalTax, totalTax] of cases) {
    element('date').value = '2026-04-10';
    element('amount').value = amount;
    element('taxProfile').value = profile;
    element('muni').value = 'San Juan';
    context.addSale();
    const stored = JSON.parse(localStorage.getItem('mt_ai_state'));
    const sale = stored.sales.at(-1);
    assert.equal(sale.taxProfile, profile);
    const breakdown = context.saleBreakdown(sale);
    assert.equal(breakdown.estatal, stateTax);
    assert.equal(breakdown.municipal, municipalTax);
    assert.equal(breakdown.ivu, totalTax);
  }

  const special = context.saleBreakdown({ amount: 104, taxProfile: 'SPECIAL_4' });
  assert.equal(special.base, 100);
  assert.equal(special.estatal, 4);
  assert.equal(special.municipal, 0);
  assert.equal(special.ivu, 4);
  assert.notEqual(special.estatalRate, 0.03);
  assert.notEqual(special.municipalRate, 0.01);
}));

test('served runtime rejects legacy numeric rate as tax-profile authority', async () => withServer(async (base) => {
  const { context } = await loadServedRuntime(base);
  const legacyCases = [
    { amount: 111.5, rate: 0.115 },
    { amount: 104, rate: 0.04 },
    { amount: 107, rate: 0.07 },
    { amount: 100, rate: 0 },
    { amount: 110, rate: 0.10 },
  ];
  for (const sale of legacyCases) {
    const preserved = { ...sale };
    context.MercaTaxTaxUi.migrateSale(preserved);
    assert.equal(preserved.rate, sale.rate);
    assert.equal(preserved.taxProfile, undefined);
    assert.equal(preserved.taxProfileStatus, 'TAX_PROFILE_REQUIRED');
    assert.throws(() => context.saleBreakdown(preserved), (error) => error && error.code === 'TAX_PROFILE_REQUIRED');
  }

  const explicit = context.saleBreakdown({ amount: 104, taxProfile: 'SPECIAL_4' });
  assert.equal(explicit.base, 100);
  assert.equal(explicit.estatal, 4);
  assert.equal(explicit.municipal, 0);
  assert.equal(explicit.ivu, 4);
}));

test('served runtime uses certified effectiveDate for period, weekend, nonWorkingDates and official override', async () => withServer(async (base) => {
  const { context, element } = await loadServedRuntime(base);
  const ui = context.MercaTaxTaxUi;

  ui.resetCalendar();
  const absent = ui.renderDueStatus({ reportingPeriod: '2026-04', currentDate: '2026-05-19' });
  assert.equal(absent.ready, false);
  assert.equal(absent.effectiveDate, null);
  assert.equal(element('effectiveDueDate').textContent, '—');
  assert.match(element('daysLeft').textContent, /calendario certificado requerido/i);
  assert.equal(ui.reminderForPeriod({ reportingPeriod: '2026-04', currentDate: '2026-05-19' }), null);

  ui.configureCalendar({ calendar: certifiedCalendar() });
  const saturday = ui.duePresentation({ reportingPeriod: '2026-05', currentDate: '2026-06-19' });
  assert.equal(saturday.regularDate, '2026-06-20');
  assert.equal(saturday.effectiveDate, '2026-06-22');
  assert.equal(saturday.daysRemaining, 3);

  const sunday = ui.duePresentation({ reportingPeriod: '2026-08', currentDate: '2026-09-18' });
  assert.equal(sunday.regularDate, '2026-09-20');
  assert.equal(sunday.effectiveDate, '2026-09-21');

  ui.configureCalendar({ calendar: certifiedCalendar(['2026-07-20']) });
  const holiday = ui.duePresentation({ reportingPeriod: '2026-06', currentDate: '2026-07-19' });
  assert.equal(holiday.effectiveDate, '2026-07-21');

  ui.configureCalendar({
    calendar: certifiedCalendar(),
    overrides: [{
      obligation: context.MercaTaxDomain.CALENDAR_OBLIGATIONS.MONTHLY_RETURN,
      period: '2026-04',
      officialDate: '2026-05-29',
      reason: 'Certified April 2026 postponement fixture',
      reference: 'OFFICIAL-APR-2026-TEST',
    }],
  });
  const april = ui.renderDueStatus({ reportingPeriod: '2026-04', currentDate: '2026-05-21' });
  assert.equal(april.regularDate, '2026-05-20');
  assert.equal(april.effectiveDate, '2026-05-29');
  assert.equal(april.daysRemaining, 8);
  assert.equal(element('effectiveDueDate').textContent, '2026-05-29');
  assert.doesNotMatch(element('daysLeft').textContent, /vence el día 20|vencido/i);

  const earlyReminder = ui.reminderForPeriod({ reportingPeriod: '2026-04', currentDate: '2026-05-21' });
  assert.equal(earlyReminder.ready, false);
  assert.equal(earlyReminder.effectiveDate, '2026-05-29');
  assert.equal(earlyReminder.daysRemaining, 8);
  assert.equal(earlyReminder.body, null);
}));

test('complete served loader preserves certified April 2026 reminder after mobile UI', async () => withServer(async (base) => {
  const { context, element, notifications, paths } = await loadServedRuntime(base);
  assert.equal(paths.at(-1), '/src/mobile-vnext-ui.js');

  element('date').value = '2026-04-10';
  element('amount').value = '111.50';
  element('taxProfile').value = 'GENERAL_11_5';
  element('muni').value = 'San Juan';
  context.addSale();

  context.MercaTaxTaxUi.configureCalendar({
    calendar: certifiedCalendar(),
    overrides: [{
      obligation: context.MercaTaxDomain.CALENDAR_OBLIGATIONS.MONTHLY_RETURN,
      period: '2026-04',
      officialDate: '2026-05-29',
      reason: 'Certified April 2026 postponement fixture',
      reference: 'OFFICIAL-APR-2026-TEST',
    }],
  });

  context.render();
  assert.equal(element('effectiveDueDate').textContent, '2026-05-29');
  assert.match(element('daysLeft').textContent, /1 días.*2026-05-29/i);
  context.checkIvuReminder();
  assert.equal(notifications.length, 1);
  assert.match(notifications[0].body, /1 día|1 días/i);
  assert.match(notifications[0].body, /2026-05-29/);
  assert.doesNotMatch(notifications[0].body, /\[object Object\]|día 20|20 -/i);
}));
