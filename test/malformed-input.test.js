import test from 'node:test';
import assert from 'node:assert/strict';
import { domain, sampleState } from './helpers.js';

test('JSON corrupto se rechaza antes de producir estado', () => {
  assert.throws(() => domain.parseBackupJson('{not-json'), (error) => error.code === 'MALFORMED_JSON');
});

test('backup sin schema o con schema incompatible se rechaza', () => {
  assert.throws(() => domain.parseBackupJson(JSON.stringify({ data: {} })), (error) => error.code === 'INCOMPATIBLE_BACKUP');
  assert.throws(() => domain.parseBackupJson(JSON.stringify({ schema: 'mercatax-ivu-backup/v2', data: {} })), (error) => error.code === 'INCOMPATIBLE_BACKUP');
});

test('IDs duplicados se rechazan', () => {
  const state = sampleState();
  state.sales[1].id = state.sales[0].id;
  assert.throws(() => domain.validateStateShape(state), (error) => error.code === 'DUPLICATE_ID');
});

test('safeParseStoredState no lanza con storage corrupto', () => {
  assert.equal(domain.safeParseStoredState('{broken'), null);
  assert.equal(domain.safeParseStoredState('[]'), null);
});

test('fecha imposible se rechaza al crear venta', () => {
  const business = sampleState().businesses[0];
  assert.throws(() => domain.createSaleRecord({ date: '2026-02-31', amount: 10, rate: 0.115, muni: 'San Juan', business }), /fecha/i);
});

test('IDs numéricos de venta evitan colisiones existentes en el mismo milisegundo', () => {
  const first = domain.createNumericId([], { now: 1786660000000 });
  const second = domain.createNumericId([first], { now: 1786660000000 });
  assert.equal(second, first + 1);
});

test('ID de negocio puede recuperarse de una colisión determinista', () => {
  const first = domain.createUniqueId('biz', [], { uuid: 'same' });
  const second = domain.createUniqueId('biz', [first], { uuid: 'same' });
  assert.notEqual(second, first);
});
