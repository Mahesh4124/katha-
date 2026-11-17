# Katha release verification ledger

## Confirmed on 2026-11-17

- GitHub `main` at `48bd63f50171b690d3e4d9ab8395ffecb35fed57` passed dependency production audit, TypeScript, full ESLint, Prettier, unit tests and build: [CI run 43995205501](https://github.com/Mahesh4124/katha-/actions/runs/43995205501).
- A Chromium run against the **built Cloudflare Worker locally through Wrangler** passed at 360×800, 390×844, and 1280×800: [browser run 43996458758](https://github.com/Mahesh4124/katha-/actions/runs/43996458758).
- Tested flows: create/read/save/reload, passage retention, settings, scenes, playback controls, mocked malicious-looking text, invalid executable-looking file names, no script execution, and no external transmission of QA book text.
- Google Fonts resources are loaded externally and may reveal ordinary request metadata (e.g. IP address) to the font provider. This should be disclosed; it is not full offline operation.
- Initial `vite preview` run failed because Nitro built with the Cloudflare Worker preset but Vite's generic preview expected `dist/server/server.js`. Correct production-style QA uses `wrangler dev` with generated `.output/server/wrangler.json`.
- The first accessibility run exposed a keyboard-inaccessible reader scroll area. Fixed with a focusable, labelled reading region (`tabIndex=0`, `role=region`, `aria-label`). Follow-up [WCAG Chromium run 43997220208](https://github.com/Mahesh4124/katha-/actions/runs/43997220208) passed 9/9 axe-core checks with **zero detected violations** in the tested library, reader, and reader-settings states at all three viewports.
- Full `bun audit` reports three **moderate development-tool** advisories involving `@vitest/mocker` and `minimatch`; `bun audit --prod` passes. Track in [issue #6](https://github.com/Mahesh4124/katha-/issues/6). Compatible `bun audit fix` did not clear these advisories. No blanket major overrides were merged.

## Not yet confirmed

- Physical Android hardware performance, thermal/battery, real touch/keyboard/audio interruptions, long-term storage eviction and app-switch/lock-screen behavior. Record on [issue #5](https://github.com/Mahesh4124/katha-/issues/5).
- Real-device TalkBack reading order, contrast under actual screen conditions and native accessibility review.
- Browser tests cannot establish that all third-party network activity is absent in every environment. The current suite checks known interactive flows and rejects unexpected outbound requests; Google Fonts requests are explicitly allowed.
- Cloud voice/TTS remains unimplemented; existing reader playback is silent.

**Never mark the release fully verified solely because CI passes.** Publish only accurately measured device/browser claims and keep the readers' existing books intact during QA.
