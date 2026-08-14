import test from 'node:test';
import assert from 'node:assert/strict';
import { domain, sampleState } from './helpers.js';

test('ventas de negocio y mes quedan aisladas', () => {
  const state = sampleState();
  const sales = domain.salesForBusinessMonth(state.sales, 'biz_a', '2026-08');
  assert.deepEqual(sales.map((sale) => sale.id), ['sale_a']);
});

test('borrar ventas de un negocio conserva las de los demás', () => {
  const state = sampleState();
  const remaining = domain.clearSalesForBusiness(state.sales, 'biz_a');
  assert.deepEqual(remaining.map((sale) => sale.id), ['sale_b']);
});

test('estado con venta huérfana se rechaza', () => {
  const state = sampleState();
  state.sales[0].businessId = 'biz_missing';
  assert.throws(() => domain.validateStateShape(state), /inexistente|huérfana/i);
});
