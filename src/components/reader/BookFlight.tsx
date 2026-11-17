import { useCallback, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CoverArt } from "@/components/library/Library";
import type { Book } from "@/lib/storage";

export type BookRect = { x: number; y: number; width: number; height: number };

/** A full-frame, non-interactive book transition. Never alters the stored book. */
export function BookFlight({
  book,
  origin,
  onComplete,
}: {
  book: Book;
  origin: BookRect;
  onComplete: () => void;
}) {
  const reduced = useReducedMotion();
  const done = useRef(false);
  const complete = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (reduced) complete();
  }, [complete, reduced]);

  // Fails safely if the animation is interrupted by a tab switch or OS pause.
  useEffect(() => {
    const timeout = window.setTimeout(complete, 2300);
    return () => window.clearTimeout(timeout);
  }, [complete]);

  const width = typeof window === "undefined" ? 390 : window.innerWidth;
  const height = typeof window === "undefined" ? 844 : window.innerHeight;
  const sourceX = origin.x + origin.width / 2;
  const sourceY = origin.y + origin.height / 2;
  const targetScale = Math.min(
    1.9,
    Math.max(1.28, Math.min((width * 0.69) / origin.width, (height * 0.63) / origin.height)),
  );

  return (
    <div className="katha-book-flight" aria-hidden="true" data-book-flight="opening">
      <motion.div
        className="katha-book-flight__veil"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.86 }}
        transition={{ duration: 0.5 }}
      />
      <div className="katha-book-flight__space">
        <motion.div
          className="katha-book-flight__volume"
          style={{ left: origin.x, top: origin.y, width: origin.width, height: origin.height }}
          initial={{ x: 0, y: 0, scale: 1, rotateY: -12, rotateZ: -1 }}
          animate={{
            x: width / 2 - sourceX,
            y: height * 0.46 - sourceY,
            scale: targetScale,
            rotateY: 0,
            rotateZ: 0,
          }}
          transition={{ type: "spring", stiffness: 125, damping: 23, mass: 0.87 }}
        >
          <div className="katha-book-flight__page-stack">
            <div className="katha-book-flight__page-ink">
              <span>✧</span>
              <small>KATHA</small>
              <strong>{book.title}</strong>
              <span className="katha-book-flight__ornament">﹏﹏ ✦ ﹏﹏</span>
            </div>
          </div>
          <motion.div
            className="katha-book-flight__cover"
            initial={{ rotateY: 0 }}
            animate={{ rotateY: -154 }}
            transition={{ delay: 0.22, duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={complete}
          >
            <CoverArt book={book} />
            <span className="katha-book-flight__cover-back" />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
