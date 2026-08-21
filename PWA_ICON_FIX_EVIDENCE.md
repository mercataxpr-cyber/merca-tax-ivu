# MercaTax IVU PR — PWA Icon R4 evidence

Status: remediation in progress; do not declare PASS until the checksum-gated import, build, tests, and visual/output verification complete.

Authoritative user-delivered package: `AppIcons (1).zip`.

Exact package gate:
- size: `5316497` bytes
- SHA-256: `8dd8041143235b96a12f969d6a575623573688e45b0113e5a9b99b9fc5648773`

The PWA must use only these package members:
- `android/mipmap-xxxhdpi/ic_launcher.png` -> 192x192 install icon
- `playstore.png` -> 512x512 install icon
- `Assets.xcassets/AppIcon.appiconset//180.png` -> Apple Touch Icon

The black generic `MT / IVU PR` artwork is explicitly rejected and must never be used as a PWA build source.

No TAX/domain logic is modified by this remediation.
