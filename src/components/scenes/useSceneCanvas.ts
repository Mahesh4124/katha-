import { useEffect, useRef, type RefObject } from "react";

export type SceneProps = {
  mode: "dark" | "light";
  intensity: number;
  reduce: boolean;
  mini?: boolean | undefined;
  className?: string | undefined;
};

type Opts = {
  mini?: boolean | undefined;
  reduce: boolean;
  key: string;
  prepare: (w: number, h: number, dpr: number) => void;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;
};

export const isLowSpec = () =>
  typeof navigator !== "undefined" &&
  ((navigator.hardwareConcurrency || 8) <= 4 ||
    ((navigator as unknown as { deviceMemory?: number }).deviceMemory || 8) <= 4);

/** Canvas loop with capped DPR, frame budget, and pause on hidden page. */
export function useSceneCanvas(ref: RefObject<HTMLCanvasElement | null>, o: Opts) {
  const live = useRef(o);
  live.current = o;
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const low = isLowSpec();
    const dpr = Math.min(window.devicePixelRatio || 1, o.mini || low ? 1 : 1.5);
    const frameMs = o.mini ? 1000 / 24 : low ? 1000 / 30 : 1000 / 55;
    let w = 1,
      h = 1,
      raf = 0,
      last = 0;
    const t0 = performance.now() - 8000;
    const paint = (now: number, force = false) => {
      if (!force && now - last < frameMs) return;
      last = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      live.current.draw(ctx, w, h, live.current.reduce ? 14 : (now - t0) / 1000);
    };
    const resize = () => {
      const r = c.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      live.current.prepare(w, h, dpr);
      paint(performance.now(), true);
    };
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!live.current.reduce) paint(now);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(loop);
    };
    const onVis = () => (document.hidden ? cancelAnimationFrame(raf) : start());
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    resize();
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.key]);
}

export function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function offscreen(w: number, h: number, dpr: number) {
  const c = document.createElement("canvas");
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  const ctx = c.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { c, ctx };
}

/** Pointer-driven parallax shared by scenes (smoothed -1..1). */
export function usePointer() {
  const p = useRef({ x: 0, y: 0, tx: 0, ty: 0, dx: 0, burst: 0, lastX: -1 });
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const s = p.current;
      s.tx = (e.clientX / window.innerWidth) * 2 - 1;
      s.ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (s.lastX >= 0) s.dx += (e.clientX - s.lastX) * 0.006;
      s.dx = Math.max(-3, Math.min(3, s.dx));
      s.lastX = e.clientX;
    };
    const down = (e: PointerEvent) => {
      p.current.burst = 1;
      p.current.lastX = e.clientX;
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
    };
  }, []);
  return p;
}
