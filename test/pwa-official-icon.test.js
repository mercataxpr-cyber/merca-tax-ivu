import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const HEADER_LOGO = 'logo.png';
const PWA_ICONS = {
  'icon-192.png': { width: 192, height: 192, sha256: 'e083d140f053cd45c9de98a24dd4ec8a120a490da51cf5cbae93242dc70b50c6' },
  'icon-512.png': { width: 512, height: 512, sha256: 'eebe12d444a036167a41029c11d20e410c1222c65457068e4430d6ebfe02a724' },
  'apple-touch-icon.png': { width: 180, height: 180, sha256: 'ddb8650bb4e99c29d2f8e9d2b0620b71ff911727b1f6e009428f467bb7166104' }
};

function walk(dir = '.') {
  const ignored = new Set(['.git', 'node_modules', 'public', 'www']);
  const files = [];
  for (const name of readdirSync(dir)) {
    if (ignored.has(name)) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...walk(full));
    else files.push(relative('.', full).replaceAll('\\', '/'));
  }
  return files;
}

function isIconAsset(path) {
  const name = basename(path);
  const imageAsset = /\.(png|jpe?g|webp|svg|ico)$/i.test(name) && /(icon|launcher|logo)/i.test(name);
  const launcherXml = /\.xml$/i.test(name) && /ic_launcher/i.test(name);
  return imageAsset || launcherXml;
}

function isAllowedIconAsset(path) {
  if (path === HEADER_LOGO) return true;
  if (Object.hasOwn(PWA_ICONS, path)) return true;
  if (path.startsWith('android/app/src/main/res/mipmap-')) return true;
  if (path.startsWith('ios/App/App/Assets.xcassets/AppIcon.appiconset/')) return true;
  return false;
}

function pngSize(buffer) {
  assert.equal(buffer.subarray(1, 4).toString('ascii'), 'PNG');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test('approved PWA install icons are frozen by dimensions and checksum', () => {
  for (const [path, expected] of Object.entries(PWA_ICONS)) {
    assert.equal(existsSync(path), true, `missing approved PWA icon: ${path}`);
    const bytes = readFileSync(path);
    assert.deepEqual(pngSize(bytes), { width: expected.width, height: expected.height });
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.sha256);
  }

  const unexpected = walk().filter(isIconAsset).filter((path) => !isAllowedIconAsset(path));
  assert.deepEqual(unexpected, []);
});

test('PWA manifest declares the approved 192 and 512 install assets', () => {
  assert.equal(manifest.icons[0].src, 'icon-192.png?v=pwa-rootfix-r1-official');
  assert.equal(manifest.icons[0].sizes, '192x192');
  assert.equal(manifest.icons[0].purpose, 'any');
  assert.equal(manifest.icons[1].src, 'icon-512.png?v=pwa-rootfix-r1-official');
  assert.equal(manifest.icons[1].sizes, '512x512');
  assert.equal(manifest.icons[1].purpose, 'any');
});

test('web and mobile builds ship the same official PWA root assets', () => {
  for (const scriptPath of ['scripts/build-web.mjs', 'scripts/build-mobile.mjs']) {
    const source = readFileSync(scriptPath, 'utf8');
    for (const path of Object.keys(PWA_ICONS)) assert.match(source, new RegExp(path.replaceAll('.', '\\.')));
    assert.doesNotMatch(source, /cpSync\(officialAndroidIcon192/);
    assert.doesNotMatch(source, /icon-source\.svg/);
  }
});

test('runtime metadata cannot fall back to the old inline or assets icons', () => {
  const source = readFileSync('scripts/runtime-tax-transform.mjs', 'utf8');
  assert.match(source, /pwa-rootfix-r1-official/);
  assert.match(source, /apple-touch-icon\.png/);
  assert.match(source, /icon-192\.png/);
  assert.doesNotMatch(source, /new Notification\([^\n]+icon:'assets\/icon-192\.png'/);
});
