import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const copy = readFileSync('src/mobile-copy-r1.js', 'utf8');
const build = readFileSync('scripts/build.mjs', 'utf8');

test('WhatsApp filing CTA uses approved radicar wording', () => {
  assert.match(copy, /Radicar por WhatsApp/);
  assert.match(copy, /Compartir por WhatsApp/);
  assert.ok(build.includes('src/mobile-copy-r1.js'));
  assert.ok(build.indexOf('src/mobile-vnext-ui.js') < build.indexOf('src/mobile-copy-r1.js'));
});
