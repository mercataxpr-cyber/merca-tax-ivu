# MercaTax IVU PR — R1-B Capacitor foundation

Authorized integration base: `store/mobile-r1` at `4fdba3456625afcac16f32a9cfd3cc9afd65f3af`.

Native identity:

- iOS bundle ID: `com.mercatax.ivupr`
- Android application ID: `com.mercatax.ivupr`
- Version: `1.0.0`
- iOS build: `1`
- Android versionCode: `1`

The application loads the generated local `www/` bundle through Capacitor. `capacitor.config.json` intentionally has no `server.url`.

R1-B native foundation includes:

- structured local IndexedDB bridge without replacing the existing R1 storage contract;
- Capacitor Preferences only for small settings;
- Local Notifications with explicit denied-permission handling;
- Filesystem helpers for report/backup files;
- native Share sheet integration;
- HTTPS external links through Capacitor Browser;
- app foreground/background lifecycle events;
- network/offline status events;
- generated Android/iOS icons and splash assets from the approved `assets/icon-source.svg`.

Out of scope in R1-B: Firebase, cloud sync, authentication, Gemini, remote push, payments, subscriptions, deep/universal links, biometrics, backend/API work, tax-logic changes, or secure storage used as a database.

## Reproduce

```bash
npm ci
npm run mobile:build
npx cap sync
npx cap open ios
npx cap open android
```

## Validate

```bash
npm run gate
npm run mobile:gate
cd android && ./gradlew assembleDebug
```

On macOS/Xcode, also build the `App` scheme for an iOS Simulator with code signing disabled and perform a clean-launch smoke check.

R1-B completion does not make the product STORE READY. DORKO/KORA review remains required.
