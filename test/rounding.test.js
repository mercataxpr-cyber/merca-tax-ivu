import test from 'node:test';
import assert from 'node:assert/strict';
import { domain } from './helpers.js';

test('roundCurrency redondea valores monetarios positivos a centavos', () => {
  assert.equal(domain.roundCurrency(1.005), 1.01);
  assert.equal(domain.roundCurrency(10.235), 10.24);
});

test('desglose siempre reconcilia total, base e IVU a centavos', () => {
  for (const amount of [0.01, 1, 9.99, 19.95, 100, 123.45, 9999.99]) {
    const result = domain.calculateIvuBreakdown(amount, 0.115);
    assert.equal(domain.roundCurrency(result.base + result.ivu), result.total);
    assert.equal(domain.roundCurrency(result.estatal + result.municipal), result.ivu);
  }
});
