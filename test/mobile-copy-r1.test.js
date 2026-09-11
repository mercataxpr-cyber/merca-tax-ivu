import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const copy = readFileSync('src/mobile-copy-r1.js', 'utf8');
const finalizer = readFileSync('scripts/finalize-approved-ui.mjs', 'utf8');

test('WhatsApp filing CTA uses approved radicar wording', () => {
  assert.match(copy, /Radicar por WhatsApp/);
  assert.match(copy, /Compartir por WhatsApp/);
  assert.ok(finalizer.includes("replaceAll('Compartir por WhatsApp', 'Radicar por WhatsApp')"));
});
