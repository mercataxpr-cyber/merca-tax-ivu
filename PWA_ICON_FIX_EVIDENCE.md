# MercaTax IVU PR — PWA Official Icon Rootfix R1

The effective PWA manifest is the root `manifest.json` referenced by the runtime HTML.

Root cause of the generic browser install identity was conflicting PWA metadata and asset resolution: the runtime HTML exposed a legacy inline favicon and a different Apple touch path while manifest/install assets were handled independently. The mobile build could also overwrite PWA output aliases from native launcher assets.

Rootfix R1 makes PWA identity deterministic:

- `manifest.json` declares only root `icon-192.png` and `icon-512.png`, both PNG with `purpose: any`.
- Runtime HTML metadata resolves manifest, favicon and Apple touch identity to the same root PWA source set.
- Notifications use the same root PWA icon instead of the legacy `assets/icon-192.png` path.
- Web and mobile builds copy the root PWA identity assets directly and no longer create competing runtime icon aliases.
- The 192px PWA seed is the approved AppIcons Android launcher artwork already installed in the native project. The 512px and 180px assets are technical size derivatives only; no alternate artwork, text, color or composition is introduced.
- Native Android/iOS launcher resources remain native packaging resources and are not rewritten by this PWA-only fix.

No TAX/domain logic is changed by this rootfix.
