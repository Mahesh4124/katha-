# Katha — Living Reader

A mobile-first English and Sanskrit reading experience set inside animated Lotus Lake and Sakura Breeze scenes, with a flowing-light ribbon that highlights passages as you read.

## Features
- English and Sanskrit plain-text reading with daylight/night modes and two animated canvas worlds.
- Silent reading preview with play/pause, seek, sentence navigation, repeat, pace, text size and motion settings.
- Import plain `.txt` files or paste text; store books and reading progress **on this device** using IndexedDB. Preferences use localStorage.
- Reduced-motion mode, wrap-safe long text and input/storage hardening.

**Limits:** This app does not currently provide narration, neural text-to-speech, PDF import, image OCR, sign-in or cloud sync. Saving data on one device is not a backup.

## Local development

Requires Bun and Node-compatible tooling:

```sh
bun install --frozen-lockfile
bun run dev
bun run test
bun run build
```

The app uses React, TypeScript, TanStack Start, Vite and Tailwind CSS with Lovable's TanStack configuration.

## QA and security

`src/test/security-hardening.test.tsx` uses **inert strings only**, including script-like text and a fake executable filename, to test input handling. It does not execute malware.

See [KATHA_HANDOFF.md](KATHA_HANDOFF.md) for the original project scope, test records, known limitations and changes made in the November 2026 audit.

## Source provenance

Imported from Katha Living Reader in Lovable at source commit `86f26d8c236063096b07646cc230a8a85f915a7e`. The original binary `favicon.ico` could not be transferred through the source API; this GitHub version includes a lightweight SVG icon instead. This is a **one-time source import**, not evidence of ongoing GitHub–Lovable automatic synchronization.

## Privacy

Books are stored locally in your browser, not uploaded to a Katha account. Browser/device storage can be cleared or evicted. Avoid pasting secrets or sensitive documents into services you do not trust.

## Contributions

Bug reports and test improvements are welcome. Please include steps to reproduce, browser/device details, and whether the issue affects the reader, storage or scene rendering.
