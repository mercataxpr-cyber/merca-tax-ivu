import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const compatSource = readFileSync('src/runtime-state-compat.js', 'utf8');
const buildSource = readFileSync('scripts/build.mjs', 'utf8');

function runCompat(initialValue) {
  const values = new Map();
  if (initialValue !== undefined) values.set('mt_ai_state', initialValue);
  const localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
  };
  vm.runInNewContext(compatSource, { localStorage, Date, JSON });
  return values.get('mt_ai_state');
}

test('web loader normalizes persisted state before app.js executes', () => {
  const compatIndex = buildSource.indexOf("src/runtime-state-compat.js");
  const appIndex = buildSource.indexOf("src/app.js");
  assert.ok(compatIndex >= 0, 'compatibility guard must be loaded');
  assert.ok(appIndex >= 0, 'app.js must be loaded');
  assert.ok(compatIndex < appIndex, 'compatibility guard must run before app.js');
});

test('legacy annual selectedMonth token is converted to a valid current month', () => {
  const initial = JSON.stringify({ selectedMonth: 'all', sales: [], businesses: [] });
  const saved = JSON.parse(runCompat(initial));
  assert.equal(saved.selectedMonth, new Date().toISOString().slice(0, 7));
  assert.deepEqual(saved.sales, []);
});

test('valid persisted monthly state is preserved byte-for-byte', () => {
  const initial = JSON.stringify({ selectedMonth: '2026-08', sales: [], marker: 'keep-me' });
  assert.equal(runCompat(initial), initial);
});

test('malformed JSON is left untouched for app.js safe parser', () => {
  const initial = '{not-json';
  assert.equal(runCompat(initial), initial);
});
