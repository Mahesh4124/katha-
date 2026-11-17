# Katha — Living Reader

A mobile-first English and Sanskrit reader with atmospheric, artwork-backed worlds, an animated bookshelf and on-device annotation tools.

## What works today

- **Cinematic worlds:** Lotus Lake (day and moonlit night) and Sakura Mountain, with subtle parallax, lighting, and reduced-motion support. This frontend uses original/photographic scene assets, **not primitive canvas-generated landscapes**.
- **A swipeable shelf:** Book-cover cards glide forward, with keyboard/arrow/touch controls. Selecting a book opens the reader.
- **Book covers:** Katha creates a reusable **local title-and-scene cover design automatically**. You can upload your own JPEG, PNG or WebP cover and it is optimized on-device. The automatic cover is a designed template, **not an AI image-generation model**.
- **Reading workspace:** Silent animated ribbon, progress, sentence navigation, pace and daylight/night modes.
- **Parallel notes:** Comment on highlighted words, apply bold/italic/highlight, erase marks, sketch or draw with a finger/stylus, and make a simple flow diagram. Notes stay with the book on this device.
- **Private library:** Import plain `.txt` files or paste text; save reading position, cover, and annotations using IndexedDB. Preferences use localStorage.

**Limits:** No real narrated audio, AI-generated bespoke book art, PDF text import, image OCR, accounts, or cloud sync. The 4K Sakura photo is a portrait crop of a high-resolution original; the owner-supplied lotus paintings are lower-resolution than native 4K. See [ARTWORK_CREDITS.md](ARTWORK_CREDITS.md).

## Local development

Requires Bun:

```sh
bun install --frozen-lockfile
bun run dev
bun run test
bunx tsc --noEmit
bunx eslint src
bunx prettier --check src
bun audit --prod
bun run build
```

For production-style Chromium verification, see `.github/workflows/browser-verification.yml`; it runs a local Cloudflare Worker through Wrangler, then browser flow, storage, annotation and accessibility checks.

## Verification and privacy

See [VERIFICATION.md](VERIFICATION.md) for checks and **unverified physical-device constraints**. Test suites include harmless script-looking sample content; they never run malware.

Book text, user covers, and annotations remain on the reader's device. Katha may still fetch Google Fonts and reveal ordinary request metadata to that font provider. Never assume browser storage is a backup; it can be cleared or evicted.

## Source provenance

Initially imported from Katha Living Reader in Lovable, source commit `86f26d8c236063096b07646cc230a8a85f915a7e`. This repo is not automatically synchronized back to the original Lovable published site. `main` represents the GitHub version; the published Lovable URL may lag behind.

## Contributions

Reproduce issues with device, viewport, reduced-motion settings and steps. Do not upload anyone's private books or personal annotations to issue reports.
