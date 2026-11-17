# Open-source motion research and Katha design target

The existing Katha mockups are the reference for the frontend's visual treatment. They are not a screenshot to paste over nonfunctional controls. We use real, accessible HTML for books, annotations and reading.

- [Motion for React](https://motion.dev/docs/react) — MIT. Used for the spring cover-flight and artwork crossfades. The web-native layout/render pipeline avoids constructing primitive 3D scenery on canvas.
- [Bookshelf Animation](https://github.com/adhyaay-karnwal/bookshelf-animation) by Adhyaay Karnwal — MIT. Reviewed its `book-open-motion.ts` and `BriefingOpenOverlay.tsx`, and adopted the idea of a staged focus and hinge opening sequence. No repo source file, demo image or model is copied.
- [OpenPageFlip](https://github.com/benhonda/openpageflip) — MIT. Reviewed touch, page fold, SSR, React19 and reduced motion. Not integrated yet because our selectable Sanskrit text, highlights and margin notes must remain accessible.
- [Codrops 3DCarousel](https://github.com/codrops/3DCarousel) — MIT. Reviewed perspective and cover presentation techniques; its demo images are not used.
- [Lenis](https://github.com/darkroomengineering/lenis) — MIT. Evaluated, but avoided overriding native reader scroll and text selection.

Acceptance: actual book flies forward from the selected shelf position, its cover opens, reader appears, scene changes crossfade, reduced-motion skips effects, no saved book/notes are altered by animations. Validate 390px and 1280px screenshots against the concept images separately; the imported source art is not native 4K, so pixel parity with every mockup is not yet proved.
