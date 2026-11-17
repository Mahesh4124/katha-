import { AnimatePresence, motion } from "motion/react";
import type { CSSProperties } from "react";
import type { ThemeId } from "@/lib/storage";
import type { SceneProps } from "./useSceneCanvas";

/** Artwork-backed scenes: real local images, not primitive canvas paintings. */
export const SCENE_ART = {
  lotus: {
    dark: "/worlds/lotus-night.webp",
    light: "/worlds/lotus-day.webp",
  },
  sakura: {
    dark: "/worlds/sakura.webp",
    light: "/worlds/sakura.webp",
  },
} as const;

export const THEMES: Record<ThemeId, { name: string; line: string }> = {
  lotus: { name: "Lotus Lake", line: "Moonlight, still water, opening petals" },
  sakura: { name: "Sakura Mountain", line: "Blossoms beneath an ancient mountain" },
};

export function Scene({
  theme,
  mode,
  intensity,
  reduce,
  mini = false,
  className = "",
}: SceneProps & { theme: ThemeId }) {
  const drift = reduce || mini ? "0px" : `${(6 + intensity * 14).toFixed(1)}px`;
  const css = { "--world-drift": drift } as CSSProperties;
  return (
    <div
      aria-hidden="true"
      data-scene={theme}
      data-scene-mode={mode}
      data-reduced={reduce ? "true" : "false"}
      className={`cinematic-world cinematic-world--${theme} cinematic-world--${mode} ${mini ? "cinematic-world--mini" : ""} ${className}`}
      style={css}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={theme + mode}
          className="cinematic-world__photo-frame"
          initial={mini || reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={mini || reduce ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: mini || reduce ? 0 : 1.05, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <img
            className="cinematic-world__photo"
            src={SCENE_ART[theme][mode]}
            alt=""
            loading={mini ? "lazy" : "eager"}
            decoding="async"
            fetchPriority={mini ? "auto" : "high"}
            draggable={false}
          />
        </motion.div>
      </AnimatePresence>
      <div className="cinematic-world__light" />
      {!mini && <div className="cinematic-world__mist" />}
      <div className="cinematic-world__grade" />
    </div>
  );
}
