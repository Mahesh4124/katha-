# Katha frontend: visual acceptance record (2026-11-17)

## Verified on the cinematic review branch
- User-facing CTA **Try different styles**, user-supplied covers, title-generated covers, swipeable shelf, parallel annotations and notes preserved from existing app.
- A clicked shelf book now transitions from its DOM position toward the viewer with a spring, swings open on its spine, and then reveals the usable reading page. The scene background smoothly crossfades between Lotus and Sakura.
- At 390px, the mobile layout now reveals the Worlds choices, shelf heading, and part of a physical-looking book within the first viewport. Image decode is awaited before taking screenshots; reader arrival is allowed to settle before visual capture.
- Browser motion tests at 390 and 1280, a reduced-motion bypass, pre-existing storage/privacy tests, accessibility tests, TypeScript, full ESLint, formatting and production audit are all required in CI.

## Actual screenshots
Review the screenshot artifact attached to the **Katha browser and privacy verification** GitHub Actions run on this PR. See `home-390.png`, `shelf-390.png`, `kinetic-flight-390.png`, `kinetic-reader-390.png`, and `kinetic-sakura-390.png`. Browser tests use local production builds, not the independently published Lovable website.

## Fidelity gap (not falsely marked complete)
- The image-generation concept screens are aspirational layout reference. A working page uses responsive typography, accessible selection controls and genuine book data, so **pixel-for-pixel parity is not yet demonstrated**.
- Lotus night and day image sources are approximately 928×1648; they are not native 4K. Sakura is a licensed real photograph but not the concept's fantasy environment with the intricate cherry tree, temple and waterfall.
- The reader uses a polished glass reading panel rather than a full physics-driven, editable two-page book fold. Parallel notes are an accessible drawer on narrow screens, not a permanently squeezed second column.
- No real speech or TTS is connected. No silent control may imply audio playback.
- The GitHub build has not been deployed to the old public Lovable URL.

## Acceptance for a future full-parity release
Source appropriately licensed higher-resolution environmental assets; capture side-by-side 390/1280 screenshots against the three concept screens; confirm frame pacing on physical Android hardware; verify long text, Sanskrit and annotation selection during touch and animation; retest reduced motion and accessibility. Do not sacrifice correct reading or local user data to produce a static picture.

See `ANIMATION_RESEARCH.md` and `ARTWORK_CREDITS.md` for engineering references and licenses.
