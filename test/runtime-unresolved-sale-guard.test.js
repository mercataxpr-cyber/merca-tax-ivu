import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const guardSource = readFileSync('src/runtime-unresolved-sale-guard.js', 'utf8');
const buildSource = readFileSync('scripts/build.mjs', 'utf8');

test('web loader installs aggregate guard after app state migration and before vNext render', () => {
  const app = buildSource.indexOf("load('src/app.js'");
  const guard = buildSource.indexOf("load('src/runtime-unresolved-sale-guard.js'");
  const vnext = buildSource.indexOf("load('src/mobile-vnext-ui.js'");
  assert.ok(app >= 0 && guard > app && vnext > guard);
});

test('aggregate guard keeps certified sale-level policy strict and skips unresolved rows only in totals', () => {
  assert.doesNotMatch(guardSource, /taxProfile\s*=|resolveTaxProfile|sale\.rate\s*=/);

  const context = {
    MercaTaxDomain: {
      roundCurrency(value) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; },
    },
    MercaTaxTaxUi: {
      breakdownForSale(sale) {
        if (!sale.taxProfile) {
          const error = new Error('profile required');
          error.code = 'TAX_PROFILE_REQUIRED';
          throw error;
        }
        return sale.breakdown;
      },
    },
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(guardSource, context);

  const sales = [
    { rate: 0.115 },
    { taxProfile: 'GENERAL_11_5', breakdown: { base: 100, ivu: 11.5, estatal: 10.5, municipal: 1 } },
  ];

  assert.equal(context.sumBase(sales), 100);
  assert.equal(context.sumIvu(sales), 11.5);
  assert.equal(context.sumIvuEstatal(sales), 10.5);
  assert.equal(context.sumIvuMunicipal(sales), 1);
  assert.equal(context.MercaTaxUnresolvedSaleCount(sales), 1);
  assert.equal(sales[0].taxProfile, undefined);
});
