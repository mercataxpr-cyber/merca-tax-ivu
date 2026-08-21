# MercaTax IVU PR — Official icon source policy

Source of truth is the user-approved **AppIcons** package already installed in the native project.

Allowed icon artwork in the repository:

- Android launcher/adaptive assets under `android/app/src/main/res/mipmap-*`.
- iOS AppIcon asset set under `ios/App/App/Assets.xcassets/AppIcon.appiconset/`.
- `logo.png` only as the approved header/logo asset.

Removed as non-authoritative or duplicate artwork:

- root `icon-192.png` / `icon-512.png` / `apple-touch-icon.png` copies.
- `assets/icon-source.svg` placeholder artwork (`MT`).
- legacy Android Studio default launcher vector/background resources.
- the script that generated alternate PWA artwork from embedded/header imagery.

Static/mobile builds now create runtime install aliases by copying the approved native assets byte-for-byte. They do not redraw, crop, mask, composite, or invent icon artwork.

No TAX/domain logic is modified.
