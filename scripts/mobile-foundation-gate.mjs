import { existsSync, readFileSync } from 'node:fs';

function requireGate(condition, message) {
  if (!condition) throw new Error(message);
}

const config = JSON.parse(readFileSync('capacitor.config.json', 'utf8'));
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const bridge = readFileSync('src/mobile-native-entry.js', 'utf8');
const androidGradle = readFileSync('android/app/build.gradle', 'utf8');
const iosProject = readFileSync('ios/App/App.xcodeproj/project.pbxproj', 'utf8');

requireGate(config.appId === 'com.mercatax.ivupr', 'Capacitor appId mismatch');
requireGate(config.appName === 'MercaTax IVU PR', 'Capacitor appName mismatch');
requireGate(config.webDir === 'www', 'Capacitor webDir must be local www');
requireGate(!config.server?.url, 'Remote server.url is prohibited');
requireGate(existsSync('android/app/src/main/AndroidManifest.xml'), 'Android project missing');
requireGate(existsSync('ios/App/App/Info.plist'), 'iOS project missing');
requireGate(/applicationId\s*(?:=\s*)?["']com\.mercatax\.ivupr["']/.test(androidGradle), 'Android applicationId mismatch');
requireGate(/versionCode\s*(?:=\s*)?1\b/.test(androidGradle), 'Android versionCode must be 1');
requireGate(/versionName\s*(?:=\s*)?["']1\.0\.0["']/.test(androidGradle), 'Android versionName must be 1.0.0');
requireGate(/PRODUCT_BUNDLE_IDENTIFIER = com\.mercatax\.ivupr;/.test(iosProject), 'iOS bundle identifier mismatch');
requireGate(/MARKETING_VERSION = 1\.0\.0;/.test(iosProject), 'iOS marketing version must be 1.0.0');
requireGate(/CURRENT_PROJECT_VERSION = 1;/.test(iosProject), 'iOS build number must be 1');

for (const name of [
  '@capacitor/core',
  '@capacitor/android',
  '@capacitor/ios',
  '@capacitor/app',
  '@capacitor/browser',
  '@capacitor/filesystem',
  '@capacitor/local-notifications',
  '@capacitor/network',
  '@capacitor/preferences',
  '@capacitor/share',
  '@capacitor/splash-screen'
]) {
  requireGate(pkg.dependencies?.[name] || pkg.devDependencies?.[name], `Missing ${name}`);
}

for (const forbidden of ['firebase', '@supabase/supabase-js', '@capacitor/push-notifications']) {
  requireGate(!pkg.dependencies?.[forbidden] && !pkg.devDependencies?.[forbidden], `Forbidden dependency present: ${forbidden}`);
}

for (const marker of [
  'indexedDB.open',
  'Preferences.get',
  'LocalNotifications.checkPermissions',
  'LocalNotifications.requestPermissions',
  'permission-denied',
  'Filesystem.writeFile',
  'Filesystem.readFile',
  'Share.share',
  'Browser.open',
  "App.addListener('appStateChange'",
  "Network.addListener('networkStatusChange'",
  'openWhatsAppMessage',
  'downloadReportHtml'
]) {
  requireGate(bridge.includes(marker), `Bridge capability missing: ${marker}`);
}

requireGate(existsSync('android/app/src/main/res/mipmap-hdpi'), 'Android native icon assets missing');
requireGate(existsSync('ios/App/App/Assets.xcassets/AppIcon.appiconset'), 'iOS native icon assets missing');
requireGate(existsSync('ios/App/App/Assets.xcassets/Splash.imageset'), 'iOS splash assets missing');

console.log('Mobile R1-B foundation gate PASS');
