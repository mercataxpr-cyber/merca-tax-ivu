import test from 'node:test';
import assert from 'node:assert/strict';
import { basePatterns, expectedReplacementCount, transformAppSource } from '../scripts/r1a-transform.mjs';

test('transform requires and replaces every frozen-base target exactly once', () => {
  const fixture = basePatterns.map(({ before }) => before).join('\n\n');
  const transformed = transformAppSource(fixture);
  assert.equal(expectedReplacementCount, 9);
  for (const { before, label } of basePatterns) {
    assert.equal(transformed.includes(before), false, `${label} debe quedar reemplazado`);
  }
});

test('transform aborts instead of guessing when a frozen-base target is absent', () => {
  const fixture = basePatterns.slice(1).map(({ before }) => before).join('\n\n');
  assert.throws(() => transformAppSource(fixture), /expected exactly one/i);
});
