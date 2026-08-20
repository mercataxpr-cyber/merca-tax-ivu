import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));

test('PWA install manifest uses official icon assets and cache-busted paths', () => {
  assert.equal(manifest.icons[0].src, 'icon-192.png?v=official-r1');
  assert.equal(manifest.icons[0].sizes, '192x192');
  assert.equal(manifest.icons[0].purpose, 'any');
  assert.equal(manifest.icons[1].src, 'icon-512.png?v=official-r1');
  assert.equal(manifest.icons[1].sizes, '1024x1024');
  assert.equal(manifest.icons[1].purpose, 'any');
});
