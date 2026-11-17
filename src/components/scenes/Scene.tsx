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
  const motion = reduce || mini ? "0px" : `${(6 + intensity * 14).toFixed(1)}px`;
  const css = { "--world-drift": motion } as CSSProperties;
  return (
    <div
      key={theme + mode}
      aria-hidden="true"
      data-scene={theme}
      data-scene-mode={mode}
      data-reduced={reduce ? "true" : "false"}
      className={`cinematic-world cinematic-world--${theme} cinematic-world--${mode} ${mini ? "cinematic-world--mini" : ""} ${className}`}
      style={css}
    >
      <img
        className="cinematic-world__photo"
        src={SCENE_ART[theme][mode]}
        alt=""
        loading={mini ? "lazy" : "eager"}
        decoding="async"
        draggable={false}
      />
      <div className="cinematic-world__light" />
      {!mini && <div className="cinematic-world__mist" />}
      <div className="cinematic-world__grade" />
    </div>
  );
}
