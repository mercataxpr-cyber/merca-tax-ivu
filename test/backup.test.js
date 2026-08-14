import test from 'node:test';
import assert from 'node:assert/strict';
import { domain, sampleState } from './helpers.js';

test('backup v1 tiene schema versionado y excluye identificadores no necesarios', () => {
  const payload = domain.createBackupPayload(sampleState(), { exportedAt: '2026-08-13T20:00:00.000Z' });
  assert.equal(payload.schema, 'mercatax-ivu-backup/v1');
  const serialized = JSON.stringify(payload);
  for (const forbidden of ['00-0000000', 'owner@example.com', 'private@example.com', '7870000000', 'Calle 1', 'REG-1']) {
    assert.equal(serialized.includes(forbidden), false, `no debe incluir ${forbidden}`);
  }
});

test('backup v1 restaura negocios, ventas y relaciones', () => {
  const payload = domain.createBackupPayload(sampleState(), { exportedAt: '2026-08-13T20:00:00.000Z' });
  const restored = domain.parseBackupJson(JSON.stringify(payload));
  assert.equal(restored.currentBusinessId, 'biz_a');
  assert.equal(restored.businesses.length, 2);
  assert.equal(restored.sales.length, 3);
  assert.equal(restored.sales[1].businessId, 'biz_b');
  assert.equal(restored.businesses[0].ein, '');
  assert.equal(domain.validateStateShape(restored), true);
});
