import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { transformAppSource, transformIndexSource } from '../scripts/runtime-tax-transform.mjs';

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const HEADER_LOGO = 'logo.png';
const APPROVED_PWA_BLOBS = {
  'icon-192.png': '4eae27ff1365eb7f6e56bdc5c146c6b7999d2778',
  'icon-512.png': '1100d87dcbbb810813ec0066c3d3e9e8b6cea0a6'
};
const PWA_AUX_ICONS = new Set(['favicon-32.png', 'favicon.ico']);
const PWA_ICONS = {
  'icon-192.png': { width: 192, height: 192 },
  'icon-512.png': { width: 512, height: 512 },
  'apple-touch-icon.png': { width: 180, height: 180 }
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
  if (PWA_AUX_ICONS.has(path)) return true;
  if (path.startsWith('android/app/src/main/res/mipmap-')) return true;
  if (path.startsWith('ios/App/App/Assets.xcassets/AppIcon.appiconset/')) return true;
  return false;
}

function pngSize(buffer) {
  assert.equal(buffer.subarray(1, 4).toString('ascii'), 'PNG');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function gitBlobSha(buffer) {
  return createHash('sha1')
    .update(Buffer.from(`blob ${buffer.length}\0`))
    .update(buffer)
    .digest('hex');
}

test('PWA seed uses the approved official-preview-r2 artwork and technical sizes are valid', () => {
  for (const [path, expected] of Object.entries(PWA_ICONS)) {
    assert.equal(existsSync(path), true, `missing approved PWA icon: ${path}`);
    const buffer = readFileSync(path);
    assert.deepEqual(pngSize(buffer), { width: expected.width, height: expected.height });
    if (Object.hasOwn(APPROVED_PWA_BLOBS, path)) {
      assert.equal(gitBlobSha(buffer), APPROVED_PWA_BLOBS[path], `unexpected approved PWA artwork: ${path}`);
    }
  }

  const unexpected = walk().filter(isIconAsset).filter((path) => !isAllowedIconAsset(path));
  assert.deepEqual(unexpected, []);
});

test('PWA manifest declares only the approved 192 and 512 install assets', () => {
  assert.equal(manifest.icons.length, 2);
  assert.equal(manifest.icons[0].src, '/icon-192.png?v=official-preview-r2');
  assert.equal(manifest.icons[0].sizes, '192x192');
  assert.equal(manifest.icons[0].purpose, 'any');
  assert.equal(manifest.icons[1].src, '/icon-512.png?v=official-preview-r2');
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

test('runtime metadata resolves only to the rootfix PWA identity', () => {
  const transformedIndex = transformIndexSource(readFileSync('index.html', 'utf8'));
  assert.match(transformedIndex, /manifest\.json\?v=pwa-rootfix-r1-official/);
  assert.match(transformedIndex, /apple-touch-icon\.png\?v=pwa-rootfix-r1-official/);
  assert.match(transformedIndex, /icon-192\.png\?v=pwa-rootfix-r1-official/);
  assert.doesNotMatch(transformedIndex, /assets\/apple-touch-icon\.png/);
  assert.doesNotMatch(transformedIndex, /<link rel="icon" href="data:image/);

  const transformedApp = transformAppSource(readFileSync('src/app.js', 'utf8'));
  assert.match(transformedApp, /icon:'icon-192\.png\?v=pwa-rootfix-r1-official'/);
  assert.doesNotMatch(transformedApp, /icon:'assets\/icon-192\.png'/);
});
