# MercaTax IVU PR — Store Submission R2

Candidate line: `release/store-ready-r2-candidate`

## Product identity

- App name: **MercaTax IVU PR**
- Bundle / application ID: `com.mercatax.ivupr`
- Version: `1.0.0`
- iOS build: `1`
- Android versionCode: `1`
- Audience: merchants and small businesses in Puerto Rico
- Primary language: Spanish (Puerto Rico)
- Account required: No

## Release scope frozen for 1.0

Included:

- IVU calculation and tax breakdown using the certified runtime profiles.
- Sales registration and history.
- Monthly report / PDF workflow.
- Radicar por WhatsApp action.
- Multi-business local records.
- Local backup/export helpers.
- Local notifications when permitted.
- Privacy Policy and Terms available in-app.

Not included in 1.0:

- AI-generated reports.
- Advertising surfaces or ad SDKs.
- Cloud account/sync.
- Remote analytics in the native package.
- Payments/subscriptions.

The Store Release UI R2 layer removes the unreleased AI and advertising placeholders from the visible v1.0 interface.

## Privacy / data model

Current native model:

- Business and sales records are primarily stored locally on-device.
- No MercaTax account is created.
- Native build strips the web Google Analytics bootstrap.
- No advertising SDK is included in the native 1.0 package.
- User-initiated WhatsApp/share/export actions may transfer information only after the user chooses to continue.
- Local notification permission is optional.

Store privacy declarations must be reconciled against the exact signed binary uploaded to each store.

## Public legal pages

The build publishes:

- `/privacy.html` — app-specific MercaTax IVU PR Privacy Policy.
- `/terms.html` — app-specific Terms and Conditions.

For submission, use the HTTPS production URL that serves these exact files. The current Netlify site can serve these paths after the candidate is deployed.

## KORA R2 automated gate

`.github/workflows/kora-store-ready-r2.yml` validates:

- full web/domain regression suite;
- TAX and mobile TAX parity;
- v1 store presentation cleanup;
- approved PWA icon identity;
- native icon source transfer;
- native bundle construction and no packaged web analytics;
- Android debug APK + release AAB construction;
- Android package/runtime parity;
- iOS Release simulator build;
- unsigned iOS device archive;
- iOS bundle ID/version/PrivacyInfo.xcprivacy;
- clean candidate tree.

## External release steps that cannot be completed in repository-only CI

### Google Play

1. Configure Play App Signing / upload key in the Google Play Console.
2. Sign the final AAB with the authorized upload key.
3. Create or select the Play Console application for `com.mercatax.ivupr`.
4. Upload screenshots and listing assets.
5. Complete Content Rating, App Access and Data Safety using the exact final signed AAB.
6. Upload the signed AAB to Internal Testing, smoke test, then promote for review.

### Apple App Store

1. Configure the Apple Developer Team and App Store Connect app for `com.mercatax.ivupr`.
2. Create/verify signing certificate and provisioning profile.
3. Produce a signed Release archive and upload to App Store Connect/TestFlight.
4. Upload screenshots and listing assets.
5. Complete Age Rating, App Privacy and Review Information using the exact signed build.
6. Run TestFlight clean-install smoke test, then submit for review.

## Release rule

No additional feature, SDK, analytics, advertising, account/sync or tax-logic change is allowed after KORA R2 certification without rerunning the full Store Ready gate and reconciling privacy declarations again.
