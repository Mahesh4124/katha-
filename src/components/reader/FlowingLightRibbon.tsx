import { useEffect, useRef, type RefObject } from "react";
import { indexAt, type Clock, type Token } from "./text";

type Frag = { x: number; y: number; w: number; h: number; line: number };
type Line = { y: number; h: number; left: number; right: number };
type Seg = { li: number; a: number; b: number; dA: number; dB: number };

type Props = {
  boxRef: RefObject<HTMLDivElement | null>;
  litRef: RefObject<HTMLDivElement | null>;
  scrollerRef: RefObject<HTMLDivElement | null>;
  tokens: Token[];
  clock: Clock;
  intensity: number;
  reduceMotion: boolean;
  measureKey: string;
  mode: "dark" | "light";
};

// Colour ramp of the "heated rod": white-gold head -> gold -> amber wake.
const RAMPS = {
  dark: { HEAD: [255, 244, 214], GOLD: [250, 200, 110], AMBER: [204, 108, 42], peak: 0.9 },
  light: { HEAD: [255, 222, 140], GOLD: [246, 178, 80], AMBER: [226, 128, 58], peak: 0.95 },
};
let RAMP = RAMPS.dark;
function ramp(d: number, L: number, k = 1) {
  const { HEAD, GOLD, AMBER } = RAMP;
  const u = Math.min(1, Math.max(0, d / L));
  const c =
    u < 0.35
      ? HEAD.map((v, i) => v + (GOLD[i] - v) * (u / 0.35))
      : GOLD.map((v, i) => v + (AMBER[i] - v) * ((u - 0.35) / 0.65));
  const a = Math.pow(1 - u, 1.5) * RAMP.peak * k;
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;
}

export function FlowingLightRibbon(p: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const geo = useRef<{ frags: Frag[][]; lines: Line[] }>({ frags: [], lines: [] });
  const live = useRef(p);
  live.current = p;

  // Measure real DOM line fragments of every word.
  useEffect(() => {
    const box = p.boxRef.current;
    if (!box) return;
    const measure = () => {
      const br = box.getBoundingClientRect();
      const spans = box.querySelectorAll<HTMLElement>("[data-base] [data-w]");
      const frags: Frag[][] = [];
      const lines: Line[] = [];
      spans.forEach((sp) => {
        const list: Frag[] = [];
        for (const r of Array.from(sp.getClientRects())) {
          if (r.width < 0.5) continue;
          const f = { x: r.left - br.left, y: r.top - br.top, w: r.width, h: r.height, line: 0 };
          const last = lines[lines.length - 1];
          if (last && Math.abs(f.y + f.h / 2 - (last.y + last.h / 2)) < last.h * 0.5) {
            last.right = Math.max(last.right, f.x + f.w);
            last.left = Math.min(last.left, f.x);
          } else lines.push({ y: f.y, h: f.h, left: f.x, right: f.x + f.w });
          f.line = lines.length - 1;
          list.push(f);
        }
        frags[Number(sp.dataset.w)] = list;
      });
      geo.current = { frags, lines };
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [p.boxRef, p.measureKey]);

  // Ribbon RAF: independent of scenes, reads the clock every frame.
  useEffect(() => {
    let raf = 0;
    let lastPaint = -1;
    let lastProps: Props | null = null;
    let vis = 0;
    let target: number | null = null;
    let userUntil = 0;
    const sc = p.scrollerRef.current;
    const onUser = () => {
      userUntil = performance.now() + 2600;
      target = null;
    };
    sc?.addEventListener("wheel", onUser, { passive: true });
    sc?.addEventListener("touchstart", onUser, { passive: true });
    sc?.addEventListener("touchmove", onUser, { passive: true });

    const segEls = layerRef.current?.querySelectorAll<HTMLElement>("[data-seg]");
    const bloom = layerRef.current?.querySelector<HTMLElement>("[data-bloom]");
    const frame = (now: number) => {
      if (document.hidden) return;
      raf = requestAnimationFrame(frame);
      const { clock, tokens, intensity, reduceMotion, boxRef, litRef, mode } = live.current;
      RAMP = RAMPS[mode];
      const layer = layerRef.current;
      const box = boxRef.current;
      const lit = litRef.current;
      const { frags, lines } = geo.current;
      if (!layer || !box || !lit || !tokens.length || !frags.length) return;

      // reads first
      const t = clock.now();
      if (!clock.playing && t === lastPaint && lastProps === live.current && Math.abs(vis - (clock.started ? 1 : 0)) < 0.001 && target === null) return;
      lastPaint = t;
      lastProps = live.current;
      const brTop = box.getBoundingClientRect().top;
      const srTop = sc?.getBoundingClientRect().top ?? 0;

      vis += ((clock.started ? 1 : 0) - vis) * 0.1;
      const idx = indexAt(tokens, t);
      const tok = tokens[idx];
      const frac = Math.min(1, Math.max(0, (t - tok.start) / tok.dur));
      const fr = frags[idx];
      if (!fr || !fr.length) return;
      let f = fr[0];
      let ff = frac;
      if (fr.length > 1) {
        const total = fr.reduce((s, q) => s + q.w, 0);
        let acc = frac * total;
        for (const q of fr) {
          if (acc <= q.w) { f = q; ff = acc / q.w; break; }
          acc -= q.w;
          f = q; ff = 1;
        }
      }
      const next = frags[idx + 1]?.[0];
      const ended = idx === tokens.length - 1 && frac >= 1;
      let hx: number;
      if (reduceMotion) hx = f.x + f.w;
      else if (next && next.line === f.line && fr.length === 1) hx = f.x + (next.x - f.x) * ff;
      else hx = f.x + f.w * ff;

      const L = reduceMotion ? f.w + 6 : 130 + 120 * intensity;
      const segs: Seg[] = [];
      let li = f.line;
      let x = hx;
      let rem = L;
      let d0 = 0;
      while (rem > 0 && li >= 0 && segs.length < 4) {
        const ln = lines[li];
        const a = Math.max(ln.left, x - rem);
        if (x > a) segs.push({ li, a, b: x, dA: d0 + (x - a), dB: d0 });
        const used = Math.max(0, x - a);
        rem -= used;
        d0 += used;
        li--;
        if (li >= 0) x = lines[li].right;
        if (reduceMotion) break;
      }

      // writes
      const k = vis * (ended ? 0.6 : 1);
      const masks: string[] = [];
      const sizes: string[] = [];
      const poss: string[] = [];
      // Dark ink belongs only on the bright head, not the dim trailing wake.
      const core = L * 0.32;
      segEls?.forEach((el, i) => {
        const s = segs[i];
        if (!s) { el.style.opacity = "0"; return; }
        const ln = lines[s.li];
        const lead = i === 0 && !reduceMotion ? 18 : 0;
        const pad = ln.h * 0.1;
        const width = s.b - s.a + lead + 4;
        el.style.transform = `translate3d(${(s.a - 2).toFixed(1)}px,${(ln.y - pad).toFixed(1)}px,0)`;
        el.style.width = `${width.toFixed(1)}px`;
        el.style.height = `${(ln.h + pad * 2).toFixed(1)}px`;
        const headPct = (((s.b - s.a + 2) / width) * 100).toFixed(1);
        el.style.background = `linear-gradient(90deg, ${ramp(s.dA, L)} 0%, ${ramp(s.dB, L)} ${headPct}%, ${lead ? "rgba(255,240,200,0)" : ramp(s.dB, L)} 100%)`;
        el.style.opacity = k.toFixed(3);
        // dark-ink mask over the hot core only, with soft crossfade edge
        if (s.dB < core) {
          const a2 = Math.max(s.a, s.b - (core - s.dB));
          const w2 = s.b - a2 + lead;
          if (w2 > 1) {
            masks.push(`linear-gradient(90deg, transparent 0%, #000 ${s.a < a2 ? 30 : 0}%, #000 100%)`);
            sizes.push(`${w2.toFixed(1)}px ${(ln.h + 2).toFixed(1)}px`);
            poss.push(`${a2.toFixed(1)}px ${(ln.y - 1).toFixed(1)}px`);
          }
        }
      });
      const hl = lines[f.line];
      if (bloom) {
        bloom.style.transform = `translate3d(${(hx - 130).toFixed(1)}px,${(hl.y + hl.h / 2 - 65).toFixed(1)}px,0)`;
        bloom.style.opacity = (k * (0.55 + 0.45 * intensity) * (reduceMotion ? 0.4 : 1)).toFixed(3);
      }
      if (masks.length && k > 0.05) {
        const m = masks.join(",");
        lit.style.setProperty("-webkit-mask-image", m);
        lit.style.maskImage = m;
        lit.style.setProperty("-webkit-mask-size", sizes.join(","));
        lit.style.maskSize = sizes.join(",");
        lit.style.setProperty("-webkit-mask-position", poss.join(","));
        lit.style.maskPosition = poss.join(",");
        lit.style.setProperty("-webkit-mask-repeat", "no-repeat");
        lit.style.maskRepeat = "no-repeat";
        lit.style.opacity = k.toFixed(3);
      } else lit.style.opacity = "0";

      // edge-aware auto-scroll
      if (sc && clock.playing && now > userUntil) {
        const yv = brTop + hl.y - srTop;
        const H = sc.clientHeight;
        if (yv > H * 0.62 || yv < H * 0.1) target = sc.scrollTop + yv - H * 0.32;
      }
      if (sc && target !== null) {
        const cur = sc.scrollTop;
        const nv = cur + (target - cur) * (reduceMotion ? 1 : 0.06);
        sc.scrollTop = nv;
        if (Math.abs(target - nv) < 0.6 || Math.abs(sc.scrollTop - nv) > 2) target = null;
      }
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        lastPaint = -1;
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    onVisibility();
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      sc?.removeEventListener("wheel", onUser);
      sc?.removeEventListener("touchstart", onUser);
      sc?.removeEventListener("touchmove", onUser);
    };
  }, [p.scrollerRef]);

  return (
    <div ref={layerRef} aria-hidden className="pointer-events-none absolute inset-0">
      <div data-bloom className="ribbon-bloom" style={{ opacity: 0, mixBlendMode: p.mode === "dark" ? "screen" : "multiply" }} />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} data-seg className="ribbon-seg" style={{ opacity: 0 }} />
      ))}
    </div>
  );
}