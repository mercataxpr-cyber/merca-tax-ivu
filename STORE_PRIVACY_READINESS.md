# MercaTax IVU PR — Store Privacy & Legal Readiness R0

Cut date: 2026-08-15

## Public URLs after deployment

- Privacy policy: `https://mercatax.com/privacy.html`
- Terms and conditions: `https://mercatax.com/terms.html`

## Product/account model

The current MercaTax IVU PR runtime does not create a MercaTax user account. Business profiles, sales and preferences are primarily local to the browser/device. Therefore an account-deletion URL is not applicable unless account creation is added later.

## Web vs native analytics contract

- The public web site may use Google Analytics and the privacy policy discloses that web analytics use.
- `scripts/build-mobile.mjs` applies `stripWebAnalyticsForNative()` to the native `www/index.html` before Capacitor sync.
- The final iOS/Android package must be inspected to prove the Google Analytics web script is absent before Store privacy declarations are finalized.

## In-app legal access

- `legal-links.js` adds Terms and Privacy links to the footer and application menu.
- `script.js` loads the legal runtime for static web hosting.
- `server.js` also injects the legal runtime for the transformed server path.
- The native build copies `terms.html`, `privacy.html`, and `legal-links.js` into `www/`.

## Current data map to validate at release

### Local user-entered data
- Business name and municipality.
- Optional merchant number, EIN, phone, email and address.
- Sales, dates, amounts, tax rates and app preferences.
- Backup-reference email where used.

These local records should not be declared as developer-collected merely because the user stores them locally; validate the final network behavior before making the store declaration.

### External actions
- User-initiated WhatsApp/share flows may send information to the external service only after the user chooses to continue.
- Local notifications may be used if the user grants permission.

### Analytics
- Web: Google Analytics is disclosed.
- Native: the intended R0 contract is no Google Analytics web script in the packaged runtime.

## Apple App Privacy working classification

Do not finalize App Store Connect until the release artifact has been inspected. If the final native binary truly keeps business/sales data only on-device and strips web analytics, those local records are not automatically data “collected” by the developer. Any remote API, crash, analytics or support SDK present in the final artifact must be evaluated separately.

## Google Play Data Safety working classification

Base the answers on the exact Android AAB/APK and network behavior. Local-only business and sales records are distinct from data transmitted off-device. Any remote logging, analytics, crash reporting, ads or new account/sync feature requires an updated declaration.

## Release gate

1. Deploy `privacy.html` and `terms.html` publicly over HTTPS.
2. Verify legal links on desktop/mobile web and inside iOS/Android packaged runtime.
3. Run the mobile build and prove `www/index.html` contains no `googletagmanager.com` or `gtag(` analytics bootstrap.
4. Inspect final native dependency/SDK inventory and permissions.
5. Test network traffic for unexpected transmission of business/sales data.
6. Reconcile App Store App Privacy and Google Play Data Safety with the exact final artifacts.
7. Any new ads, account system, cloud sync, analytics, crash reporting or external SDK requires privacy recertification before release.
