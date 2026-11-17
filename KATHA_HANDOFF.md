# Katha — Living Reader handoff

Final QA: 2026-10-28 UTC. Continue this existing project; do not replace it.

## Exact current scope
- Mobile-first English/Sanskrit plain-text reader with Lotus Lake and Sakura Breeze canvas worlds, Night/Day, warm continuous wrapped-line ribbon and masked near-black illuminated text.
- Silent timed playback: play/pause, seek, previous/next sentence, repeat, pace, text size, intensity and reduced motion. No real audio or narration.
- Paste text or import TXT; save/reopen/delete books and restore a word-index reading position on this device. Books use IndexedDB; preferences use localStorage. No accounts, Cloud, sync or remote book storage.
- PDF: coming later. Sanskrit image OCR: unavailable. Neural voice: not connected. These limitations remain explicit in the interface.

## Two-scene design contract
- Preserve existing `LotusScene`, `SakuraScene`, `Scene`, `useSceneCanvas`, `FlowingLightRibbon`, `Library`, `Reader` and design tokens. No regenerated art, generic dashboard/card redesign or book overwrite.
- Lotus: lake, moon/daylight, layered lotuses, water/ripples, reeds, hills and temple. Sakura: flowering branches, falling petals, hazy hills and pagoda. They must remain visibly distinct in both lighting modes.
- Scene RAF loops are independent of the ribbon/reading clock. Ribbon updates DOM styles directly; the duplicate lit-text layer is CSS-masked. Do not replace this with per-frame React state.

## Verified stabilization changes
- IndexedDB success now means transaction completion; abort/error rejects and connections close. Progress read/update is one readwrite transaction, preserving latest requested position (including backward seeks) and avoiding deleted-book resurrection.
- Empty documents return no active token; playback/sentence navigation/progress persistence are guarded. Punctuation-only text remains valid and tested, not unnecessarily rejected.
- Ribbon RAF cancels while hidden and restarts when visible, with cleanup. Reader pauses silently when hidden; playback does not automatically resume. Stable paused frames skip unnecessary geometry reads/style work, and segment elements are cached.
- Reading area ends above measured controls, including expanded settings. Controls use the existing ink-panel treatment: underlying reading text no longer clashes with settings. No global token or scene art changes.
- Lit-ink mask shortened to the bright head rather than the dim wake after screenshot contrast inspection.

## Tests actually run
| Check | Result / evidence |
| --- | --- |
| Existing Vitest routing test | PASS, 1/1 before changes and in final suite |
| Final `bunx vitest run` | PASS, 3 files / 6 tests; last run 05:44 UTC |
| New reader edge tests | PASS: empty input has no playback/navigation exception/phantom progress; `... !!! । ॥` has four valid tokens and sentence starts |
| New storage tests (fake-indexeddb) | PASS: abort after request success rejects; concurrent requested progress 12→3→7 finishes at 7; delete with progress updates does not resurrect book |
| Automatic build validation | PASS: latest observed `/tmp/observability/build-errors.log` entry at 05:44:17 UTC says `build OK`; no manual build was run, per workspace rules |
| Standalone TypeScript command | NOT independently run: workspace rules reserve typechecking to automatic validation; log provides no separately named TypeScript result. Do not claim a separate `tsc`/`tsgo` pass |
| Chromium interactive QA | PASS at **360×800** and **390×844**, fresh isolated browser contexts, localhost running app |
| Library → Try the ribbon → reader | PASS; ribbon transforms change during playback; two visible segments on different wrapped-line y coordinates confirmed at both sizes |
| Art and text screenshot inspection | PASS for preserved distinct Lotus/Sakura Night/Day artwork; pale unlit text and near-black lit head, settings readable without reading-text overlap; 120% font-size settings checked |
| Controls | PASS: pause freezes seek position; previous/next, seek, repeat at end and resumed silent play exercised at both sizes |
| Night/Day and scene selection | PASS: mode toggle preserves selected world; Lotus and Sakura canvas images inspected; animated canvas pixels change |
| Reduced motion | PASS: canvas pixels remain identical over 500ms while on; silent reading remains usable |
| Hidden-page lifecycle | PASS via simulated document visibility: no new RAF scheduled while hidden, loop schedules again when visible; playback remains paused until explicit Play. Not a real Android app-switch test |
| Paste → save → seek → back → reload → reopen | PASS at both sizes: exact passage retained, saved word index **13**, reopened seek **560/1000** after seeking to 600 (restores token start, not exact sub-word time) |
| TXT and punctuation input | PASS: actual file input imported TXT content, saved and reopened verbatim; punctuation-only book navigated/played without exceptions |
| Empty text | PASS: whitespace paste rejected in browser; empty-document safety separately covered by unit test |
| Runtime / layout / audio | No page exceptions in final scripted flows, no horizontal overflow at either size, no audio/video elements; explicit silent/no-audio labels retained |

Browser QA scripts/screenshots are temporary evidence under `/tmp/browser/katha/` (`baseline.py`, `risks.py`, `final_qa.py`, `contrast.py`, `final-*.png`), not durable source deliverables. Browser contexts contained only QA books and never touched the user's real browser books. An initial QA script had an ambiguous button selector; it was corrected and rerun successfully, not an app failure.

## Unresolved blockers / limits
- Actual low-end Android device test required: FPS, touch responsiveness, keyboard/viewport behavior, app switching and battery use are **not proven** by desktop Chromium phone-size tests. No 60fps claim.
- Real neural TTS needs a separately authorized backend/provider and timing integration; none is connected. Do not imply narration works.
- OCR/PDF need separate implementation and accuracy testing. No fake extraction or placeholder-success behavior.
- Standalone TypeScript status is unverified as described above.
- Page closure/storage denial/device eviction can still prevent saving: IndexedDB is device-only, not a backup or synchronization service. Browser UI flow and transaction regressions do not prove crash-proof persistence.

## How to continue
1. Read root `AGENTS.md` and this handoff before editing. Preserve on-device architecture and approved two-scene artwork.
2. Run `bunx vitest run`, inspect automatic build/typecheck signals, then repeat the real user flows at both phone sizes; never claim a test from source inspection alone.
3. Test on a physical Android phone next: wrap transitions/contrast, controls and larger text, long-text scroll, hidden/visible transitions, paste/TXT/save/reopen and restored position. Record device/browser and observed performance.
4. Add TTS, OCR or PDF only on an explicit new request; keep silent preview truthfully labeled until real audio exists. Never reset IndexedDB or replace existing books to seed demonstrations.

This file belongs in the repository and uses Lovable-managed versioning; no manual Git commit/push was executed.
## Security/debug audit — 2026-11-17 UTC
- Fixes: `sanitizePrefs` (unknown theme/mode, non-finite or out-of-range numbers, bad rate → safe values; invalid JSON → defaults); `listBooks` skips malformed records without deleting them; pasted text capped at 3,000,000 chars like TXT; reader wraps very long unbroken words/URLs (`overflow-wrap:anywhere`) — previously clipped off-screen at 360/390 widths.
- Tests: `bunx vitest run` PASS 4 files / 12 tests, incl. `src/test/security-hardening.test.tsx` (inert mock threat text: script/img/svg/javascript:/fake phishing URL rendered literally, no elements/links created, no fetch/window.open; oversize paste refused; fake `.txt.exe` rejected without reading).
- Chromium 360×800 and 390×844: corrupted prefs + mock threat book saved/opened/played — no page errors, no external requests, no dialogs, no script execution, no horizontal overflow.
- Audit: no `dangerouslySetInnerHTML`/`innerHTML`/`eval` in app code (only unused shadcn chart.tsx, static config); no secrets or .env in source; no network calls from app code.
- ESLint: 148 Prettier formatting errors + 8 warnings, no logic errors; not mass-reformatted to avoid churn.
- Open: dependency advisories (zod 3, transitive js-yaml/seroval/source-map-js via TanStack/Tailwind build tooling) not upgraded — zod 3→4 is breaking and the app passes no user input to them; standalone TypeScript run not separately executed (automatic build reports OK); physical Android untested.