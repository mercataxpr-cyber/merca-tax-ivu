import test from 'node:test';
import assert from 'node:assert/strict';
import { domain } from './helpers.js';

test('11.5% incluido desglosa 100 + 10.50 estatal + 1.00 municipal', () => {
  const result = domain.calculateIvuBreakdown(111.50, 0.115);
  assert.deepEqual(result, {
    total: 111.5,
    base: 100,
    ivu: 11.5,
    estatal: 10.5,
    municipal: 1,
    rate: 0.115,
    estatalRate: 0.105,
    municipalRate: 0.01,
  });
});

test('0% se mantiene 0% y no cae al default 11.5%', () => {
  const result = domain.calculateIvuBreakdown(100, 0);
  assert.equal(result.base, 100);
  assert.equal(result.ivu, 0);
  assert.equal(result.estatal, 0);
  assert.equal(result.municipal, 0);
});

test('tasa fuera de rango se rechaza', () => {
  assert.throws(() => domain.calculateIvuBreakdown(100, 1.01), /tasa/i);
  assert.throws(() => domain.calculateIvuBreakdown(100, -0.01), /tasa/i);
});
