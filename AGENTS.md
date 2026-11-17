<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Katha architecture
- Canvas scenes (src/components/scenes) and the reading ribbon (src/components/reader/FlowingLightRibbon) run separate RAF loops; scenes never read ribbon timing. Why: ambient art can throttle/pause independently of reading.
- Ribbon writes DOM styles directly per frame (no React state) from a free-running Clock; dark "lit" text is a duplicate layer revealed with CSS masks. Why: 60fps without re-renders.
- Books live in IndexedDB, preferences in localStorage (src/lib/storage.ts). Why: on-device only, no accounts.
- IndexedDB operations settle on transaction completion; progress reads and writes share one readwrite transaction. Why: preserve commit failures and prevent stale writes or deleted-book resurrection.
- Reader scrolling ends above measured controls; ribbon RAF pauses on hidden documents and restarts visibly, independently of scene loops. Why: legible phone settings and less background work.
- tsconfig has noUncheckedIndexedAccess off. Why: hot-path geometry arrays are index-heavy.
- Stored preferences pass through sanitizePrefs and books through isValidBook on read; text length capped by MAX_TEXT_CHARS. Why: tampered/corrupt device storage must never break rendering or timing.