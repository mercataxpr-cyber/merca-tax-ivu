# MercaTax IVU PR — approved PWA icon source

Authoritative user-delivered package: `AppIcons (1).zip`.

PWA install assets must preserve the artwork from that package exactly; no generic `MT / IVU PR` artwork, redraw, composition, generated placeholder, added border, added text, or altered background is permitted.

Approved PWA pixel sources:

- `icon-192.png` ← `android/mipmap-xxxhdpi/ic_launcher.png` (192×192)
- `icon-512.png` ← `playstore.png` (512×512)
- `apple-touch-icon.png` ← `Assets.xcassets/AppIcon.appiconset/180.png` (180×180)

These three files are install aliases for the exact approved artwork. Build scripts copy them; they do not regenerate artwork.
