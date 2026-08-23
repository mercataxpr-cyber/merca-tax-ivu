import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Capacitor config uses local web assets and the approved app id', () => {
  const config = JSON.parse(readFileSync('capacitor.config.json', 'utf8'));
  assert.equal(config.appId, 'com.mercatax.ivupr');
  assert.equal(config.appName, 'MercaTax IVU PR');
  assert.equal(config.webDir, 'www');
  assert.equal(config.server?.url, undefined);
});

test('native bridge handles denied notifications without forcing permission', () => {
  const source = readFileSync('src/mobile-native-entry.js', 'utf8');
  assert.match(source, /permission-denied/);
  assert.match(source, /LocalNotifications\.checkPermissions/);
  assert.match(source, /LocalNotifications\.requestPermissions/);
});

test('native bridge includes structured local data, files, share, lifecycle and offline hooks', () => {
  const source = readFileSync('src/mobile-native-entry.js', 'utf8');
  for (const token of [
    'indexedDB.open',
    'Preferences.get',
    'Filesystem.writeFile',
    'Filesystem.readFile',
    'Share.share',
    "App.addListener('appStateChange'",
    "Network.addListener('networkStatusChange'"
  ]) {
    assert.ok(source.includes(token), token);
  }
});

test('native bridge preserves export/share and WhatsApp fallbacks', () => {
  const source = readFileSync('src/mobile-native-entry.js', 'utf8');
  assert.ok(source.includes('window.exportBackup'));
  assert.ok(source.includes('window.downloadReportHtml'));
  assert.ok(source.includes('window.shareReport'));
  assert.ok(source.includes('window.openWhatsAppMessage'));
});
