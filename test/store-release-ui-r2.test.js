import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const build = readFileSync('scripts/build.mjs', 'utf8');
const cleanup = readFileSync('src/store-release-ui-r2.js', 'utf8');

test('store release cleanup loads after vNext and copy normalization', () => {
  const vnext = build.indexOf("load('src/mobile-vnext-ui.js'");
  const copy = build.indexOf("load('src/mobile-copy-r1.js'");
  const release = build.indexOf("load('src/store-release-ui-r2.js'");
  assert.ok(vnext >= 0, 'vNext UI loader must exist');
  assert.ok(copy > vnext, 'copy normalization must load after vNext');
  assert.ok(release > copy, 'store release cleanup must load after copy normalization');
});

test('store release cleanup removes only unreleased presentation surfaces', () => {
  assert.match(cleanup, /\.vxAi, \.vxNote/);
  assert.match(cleanup, /\.vxAdLabel, \.vxAd/);
  assert.match(cleanup, /Radicar por WhatsApp/);
  assert.doesNotMatch(cleanup, /MercaTaxDomain|calculateTax|localStorage\.clear|state\.sales\s*=|removeItem/);
});
