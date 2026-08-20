import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const OFFICIAL_ANDROID = 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png';
const OFFICIAL_IOS = 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png';
const HEADER_LOGO = 'logo.png';

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
  if (path.startsWith('android/app/src/main/res/mipmap-')) return true;
  if (path.startsWith('ios/App/App/Assets.xcassets/AppIcon.appiconset/')) return true;
  return false;
}

test('repository keeps only approved AppIcons package assets plus header logo', () => {
  assert.equal(existsSync(OFFICIAL_ANDROID), true);
  assert.equal(existsSync(OFFICIAL_IOS), true);
  assert.equal(existsSync(HEADER_LOGO), true);

  const forbidden = [
    'icon-192.png',
    'icon-512.png',
    'apple-touch-icon.png',
    'assets/icon-source.svg',
    'scripts/official-pwa-icons.mjs',
    'android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml',
    'android/app/src/main/res/drawable/ic_launcher_background.xml',
    'android/app/src/main/res/values/ic_launcher_background.xml'
  ];
  for (const path of forbidden) assert.equal(existsSync(path), false, `forbidden icon source remains: ${path}`);

  const unexpected = walk().filter(isIconAsset).filter((path) => !isAllowedIconAsset(path));
  assert.deepEqual(unexpected, []);
});

test('PWA manifest uses runtime aliases sourced from approved AppIcons package', () => {
  assert.equal(manifest.icons[0].src, 'icon-192.png?v=official-zip-r1');
  assert.equal(manifest.icons[0].sizes, '192x192');
  assert.equal(manifest.icons[0].purpose, 'any');
  assert.equal(manifest.icons[1].src, 'icon-512.png?v=official-zip-r1');
  assert.equal(manifest.icons[1].sizes, '1024x1024');
  assert.equal(manifest.icons[1].purpose, 'any');
});

test('web and mobile builds copy exact approved package assets without generating artwork', () => {
  for (const path of ['scripts/build-web.mjs', 'scripts/build-mobile.mjs']) {
    const source = readFileSync(path, 'utf8');
    assert.match(source, /mipmap-xxxhdpi\/ic_launcher\.png/);
    assert.match(source, /AppIcon\.appiconset\/AppIcon-512@2x\.png/);
    assert.doesNotMatch(source, /sharp\(|resize\(|composite\(|icon-source\.svg/);
  }
});
