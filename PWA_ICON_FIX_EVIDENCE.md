# PWA install icon correction

The install manifest previously referenced root `icon-192.png` / `icon-512.png` assets that were not the approved MercaTax IVU PR store icon.

This remediation aligns the install assets with the approved native/store branding:

- `icon-192.png` -> approved Android xxxhdpi launcher artwork.
- `icon-512.png` -> approved iOS/store 1024px AppIcon artwork (browser may downscale it for install UI).
- `apple-touch-icon.png` -> approved Android launcher artwork.
- `manifest.json` uses cache-busted official icon URLs and `purpose: any` to avoid unintended maskable cropping.

No TAX/domain logic is modified.
