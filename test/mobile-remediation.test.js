import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const nativeBridge = readFileSync('src/mobile-native-entry.js', 'utf8');
const androidManifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
const dataExtractionRules = readFileSync('android/app/src/main/res/xml/data_extraction_rules.xml', 'utf8');
const workflow = readFileSync('.github/workflows/r1b-capacitor-build.yml', 'utf8');

test('native mobile layer does not derive IVU due dates or days remaining', () => {
  for (const forbidden of [
    '20 - day',
    'rendir/pagar IVU',
    'setTimeout(() => window.sendLocalReminder',
    'new Date().getDate()'
  ]) {
    assert.equal(nativeBridge.includes(forbidden), false, `native bridge contains forbidden tax scheduling semantic: ${forbidden}`);
  }

  assert.match(nativeBridge, /schedule: async \(\{ id, title, body, at \}\) => \{/);
  assert.match(nativeBridge, /LocalNotifications\.schedule\(/);
  assert.match(nativeBridge, /schedule: at \? \{ at: new Date\(at\) \} : undefined/);
});

test('native legacy tax reminder hooks are disabled without inventing a fiscal fallback', () => {
  assert.match(nativeBridge, /window\.sendLocalReminder = async \(\) => \(\{ ok: false, reason: 'domain-schedule-required' \}\);/);
  assert.match(nativeBridge, /window\.checkIvuReminder = \(\) => \{/);
  assert.equal(nativeBridge.includes('days = 20'), false);
  assert.equal(nativeBridge.includes('day >= 15'), false);
});

test('Android automatic backup and device-transfer extraction remain disabled for the local-data candidate', () => {
  assert.match(androidManifest, /android:allowBackup="false"/);
  assert.doesNotMatch(androidManifest, /android:allowBackup="true"/);
  assert.match(androidManifest, /android:fullBackupContent="false"/);
  assert.match(androidManifest, /android:dataExtractionRules="@xml\/data_extraction_rules"/);

  assert.match(dataExtractionRules, /<cloud-backup>/);
  assert.match(dataExtractionRules, /<device-transfer>/);
  for (const domain of [
    'root',
    'file',
    'database',
    'sharedpref',
    'external',
    'device_root',
    'device_file',
    'device_database',
    'device_sharedpref'
  ]) {
    const matches = dataExtractionRules.match(new RegExp(`<exclude domain="${domain}" path="\\." \\/>`, 'g')) || [];
    assert.equal(matches.length, 2, `expected cloud and device-transfer exclusion for ${domain}`);
  }
});

test('R1-B CI certifies the checked-out candidate and cannot commit or push', () => {
  assert.match(workflow, /ref: \$\{\{ github\.sha \}\}/);
  assert.match(workflow, /CERTIFIED_SHA=/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npx cap sync/);
  assert.match(workflow, /git diff --exit-code/);
  assert.doesNotMatch(workflow, /git commit\b/);
  assert.doesNotMatch(workflow, /git push\b/);
  assert.doesNotMatch(workflow, /contents: write/);
  assert.doesNotMatch(workflow, /paths:\s*\n\s*- \.github\/workflows\/r1b-capacitor-build\.yml/);
});
