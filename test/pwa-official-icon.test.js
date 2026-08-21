import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const HEADER_LOGO = 'logo.png';
const PWA_ICONS = {
  'icon-192.png': { width: 192, height: 192, sha256: 'bb91613a1f1a549259ead5d0100589d9ff92c190c55df15826e37e3d73c43e1d' },
  'icon-512.png': { width: 512, height: 512, sha256: '4f14659fb8ef5a60be621fa49ab92b3f254291bbbaa94312c7f657e36d84b786' },
  'apple-touch-icon.png': { width: 180, height: 180, sha256: '5fd1e3930783d0668bb6672c32314b1eab7f32bcd6fb7e5f731c27bf48241238' }
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
  assert.equal(manifest.icons[0].src, 'icon-192.png?v=pwa-r4-approved');
  assert.equal(manifest.icons[0].sizes, '192x192');
  assert.equal(manifest.icons[0].purpose, 'any');
  assert.equal(manifest.icons[1].src, 'icon-512.png?v=pwa-r4-approved');
  assert.equal(manifest.icons[1].sizes, '512x512');
  assert.equal(manifest.icons[1].purpose, 'any');
});

test('static web build ships the approved PWA assets directly', () => {
  const source = readFileSync('scripts/build-web.mjs', 'utf8');
  for (const path of Object.keys(PWA_ICONS)) assert.match(source, new RegExp(path.replaceAll('.', '\\.')));
  assert.doesNotMatch(source, /officialAndroidIcon192|mipmap-xxxhdpi\/ic_launcher\.png/);
  assert.doesNotMatch(source, /sharp\(|resize\(|composite\(|icon-source\.svg/);
});
