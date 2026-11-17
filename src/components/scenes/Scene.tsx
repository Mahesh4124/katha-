import type { ThemeId } from "@/lib/storage";
import { LotusScene } from "./LotusScene";
import { SakuraScene } from "./SakuraScene";
import type { SceneProps } from "./useSceneCanvas";

export const THEMES: Record<ThemeId, { name: string; line: string }> = {
  lotus: { name: "Lotus Lake", line: "Moonlit water, opening petals" },
  sakura: { name: "Sakura Breeze", line: "Hill haze, falling blossom" },
};

export function Scene({ theme, ...rest }: SceneProps & { theme: ThemeId }) {
  return (
    <div key={theme} className="fade-in h-full w-full">
      {theme === "lotus" ? <LotusScene {...rest} /> : <SakuraScene {...rest} />}
    </div>
  );
}
