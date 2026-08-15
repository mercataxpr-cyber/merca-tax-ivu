import test from 'node:test';
import assert from 'node:assert/strict';
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

async function loadServedRuntime(base) {
  const html = await (await fetch(`${base}/`)).text();
  assert.match(html, /<script src="\/script\.js"><\/script>/);
  assert.doesNotMatch(html, /const WA='17873566336', PIN='1234'/);
  assert.doesNotMatch(html, /20-today\.getDate|rate\|\|\.115|radicar antes del día 20/i);
  assert.match(html, /id="taxProfile"/);
  assert.match(html, /id="effectiveDueDate">—</);

  const browser = fakeBrowser();
  const paths = ['/src/domain.js','/src/tax-remediation.js','/src/tax-calendar-contract.js','/src/tax-ui-bridge.js','/src/app.js'];
  for (const scriptPath of paths) {
    const response = await fetch(`${base}${scriptPath}`);
    assert.equal(response.status, 200, `${scriptPath} must be served`);
    const source = await response.text();
    if (scriptPath === '/src/app.js') {
      assert.doesNotMatch(source, /20-today\.getDate|days=20-d|radicar antes del día 20|s\.rate\?\?MercaTaxDomain\.DEFAULT_RATE|getElementById\('rate'\)/i);
      assert.match(source, /fecha efectiva certificada del calendario contributivo/i);
    }
    vm.runInContext(source, browser.context, { filename: scriptPath });
  }
  return { html, ...browser };
}

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
  assert.notEqual(special.estatalRate, 0.03);
  assert.notEqual(special.municipalRate, 0.01);
  assert.throws(() => context.saleBreakdown({ amount: 110, rate: 0.10 }), (error) => error && error.code === 'TAX_PROFILE_REQUIRED');
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
  assert.doesNotMatch(element('daysLeft').textContent, /vence el día 20/i);
}));

test('served app countdown and reminder consume the same certified April 2026 effectiveDate', async () => withServer(async (base) => {
  const { context, element, notifications } = await loadServedRuntime(base);
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
  assert.match(notifications[0].body, /2026-05-29/);
  assert.doesNotMatch(notifications[0].body, /día 20|20 -/i);
}));
