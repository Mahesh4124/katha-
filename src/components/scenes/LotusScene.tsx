import { useRef } from "react";
import { offscreen, rng, usePointer, useSceneCanvas, type SceneProps } from "./useSceneCanvas";

const PAL = {
  dark: {
    sky: ["#04060d", "#0b1124", "#1a2140", "#2a2a46"],
    mountains: ["#262c4c", "#1c2240", "#141a30", "#0c1121"],
    mist: "170,175,225",
    water: ["#151c35", "#0a0e1d", "#04060c"],
    padA: "#2c4a3a",
    padB: "#0f2219",
    vein: "rgba(150,190,160,0.18)",
    base: "#f1edf6",
    pinkTip: "#d9789b",
    whiteTip: "#e3dcec",
    stamen: "#e9c46a",
    pod: "#b7c36a",
    stem: "#1d3528",
    reed: "#070b10",
    glint: "255,246,220",
  },
  light: {
    sky: ["#b9c9d3", "#d6dcd9", "#ece6d8", "#f4e7d2"],
    mountains: ["#bcc6ca", "#a2b1b2", "#859895", "#617a74"],
    mist: "248,243,232",
    water: ["#c4d1cf", "#97afad", "#6b8784"],
    padA: "#6f9a63",
    padB: "#2f5a3a",
    vein: "rgba(230,245,220,0.3)",
    base: "#fffbf6",
    pinkTip: "#ec88a9",
    whiteTip: "#f7edf1",
    stamen: "#f0b53a",
    pod: "#cad06a",
    stem: "#3f6b45",
    reed: "#25362d",
    glint: "255,252,240",
  },
};
type Pal = (typeof PAL)["dark"];

function petalPath(ctx: CanvasRenderingContext2D, L: number, W: number, bend: number) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(W * 0.95, -L * 0.18, W * 0.82, -L * 0.72, bend, -L);
  ctx.bezierCurveTo(-W * 0.82 + bend * 0.4, -L * 0.72, -W * 0.95, -L * 0.18, 0, 0);
  ctx.closePath();
}

function petal(
  ctx: CanvasRenderingContext2D,
  L: number,
  W: number,
  bend: number,
  c0: string,
  c1: string,
  shade: number,
) {
  petalPath(ctx, L, W, bend);
  const g = ctx.createLinearGradient(0, 0, bend, -L);
  g.addColorStop(0, c0);
  g.addColorStop(0.5, c0);
  g.addColorStop(1, c1);
  ctx.fillStyle = g;
  ctx.fill();
  if (shade > 0) {
    ctx.fillStyle = `rgba(30,12,40,${shade})`;
    ctx.fill();
  }
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = "rgba(140,60,95,0.22)";
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -L * 0.06);
  ctx.quadraticCurveTo(bend * 0.3, -L * 0.5, bend * 0.85, -L * 0.9);
  ctx.moveTo(-W * 0.25, -L * 0.12);
  ctx.quadraticCurveTo(-W * 0.35 + bend * 0.2, -L * 0.5, bend * 0.5 - W * 0.2, -L * 0.8);
  ctx.moveTo(W * 0.25, -L * 0.12);
  ctx.quadraticCurveTo(W * 0.35 + bend * 0.2, -L * 0.5, bend * 0.5 + W * 0.2, -L * 0.8);
  ctx.strokeStyle = "rgba(170,80,115,0.13)";
  ctx.stroke();
}

function lotus(
  ctx: CanvasRenderingContext2D,
  s: number,
  pal: Pal,
  t: number,
  I: number,
  pink: boolean,
  dew: boolean,
) {
  const c1 = pink ? pal.pinkTip : pal.whiteTip;
  const P = (a: number, L: number, W: number, shade: number) => {
    ctx.save();
    ctx.rotate(a + Math.sin(t * 1.3 + a * 5) * 0.014 * I);
    petal(ctx, L, W, Math.sin(a) * W * 0.4, pal.base, c1, shade);
    ctx.restore();
  };
  for (const a of [-1.78, 1.78]) P(a, s * 0.72, s * 0.3, 0.2);
  for (const a of [-1.25, -0.84, -0.42, 0, 0.42, 0.84, 1.25]) P(a, s, s * 0.3, 0.13);
  // receptacle and stamens
  ctx.save();
  ctx.translate(0, -s * 0.3);
  ctx.lineWidth = Math.max(0.6, s * 0.012);
  for (let i = 0; i < 28; i++) {
    const u = (i / 27) * 2 - 1;
    const tipX = u * s * 0.3 + Math.sin(t * 2 + i) * 0.6 * I;
    const tipY = -s * (0.16 + 0.07 * (1 - Math.abs(u)));
    ctx.strokeStyle = pal.stamen;
    ctx.beginPath();
    ctx.moveTo(u * s * 0.15, 0);
    ctx.quadraticCurveTo(u * s * 0.2, tipY * 0.5, tipX, tipY);
    ctx.stroke();
    ctx.fillStyle = pal.stamen;
    ctx.beginPath();
    ctx.ellipse(tipX, tipY, s * 0.012, s * 0.022, u * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = pal.pod;
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.02, s * 0.15, s * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(60,80,20,0.45)";
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.arc(
      Math.cos(i * 0.9) * s * 0.09,
      -s * 0.02 + Math.sin(i * 0.9) * s * 0.025,
      s * 0.01,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
  for (const a of [-1.02, -0.62, 0.62, 1.02]) P(a, s * 0.8, s * 0.34, 0);
  for (const a of [-0.2, 0.2]) P(a, s * 0.42, s * 0.42, 0);
  if (dew) {
    const drops: [number, number, number][] = [
      [-s * 0.42, -s * 0.5, 0],
      [s * 0.5, -s * 0.46, 2],
      [s * 0.18, -s * 0.36, 4],
    ];
    for (const [x, y, ph] of drops) {
      const tw = 0.55 + 0.45 * Math.sin(t * 1.7 + ph);
      const r = s * 0.028;
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
      g.addColorStop(0, `rgba(${pal.glint},${0.95 * tw})`);
      g.addColorStop(0.5, "rgba(255,255,255,0.25)");
      g.addColorStop(1, "rgba(255,255,255,0.05)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function bud(ctx: CanvasRenderingContext2D, s: number, pal: Pal) {
  for (const a of [-0.22, 0.22, 0]) {
    ctx.save();
    ctx.rotate(a);
    petal(ctx, s * 1.1, s * 0.3, -a * s * 0.25, pal.base, pal.pinkTip, a === 0 ? 0 : 0.1);
    ctx.restore();
  }
}

type Flower = {
  x: number;
  y: number;
  s: number;
  sh: number;
  ph: number;
  kind: "lotus" | "bud";
  pink: boolean;
  dew: boolean;
};
type Pad = { x: number; y: number; r: number; rot: number; ph: number };

export function LotusScene({ mode, intensity, reduce, mini, className }: SceneProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const ptr = usePointer();
  const st = useRef<{ bg?: HTMLCanvasElement; H: number; flowers: Flower[]; pads: Pad[] }>({
    H: 0,
    flowers: [],
    pads: [],
  });
  const pal = PAL[mode];
  const night = mode === "dark";

  useSceneCanvas(ref, {
    mini,
    reduce,
    key: `${mode}-${reduce}-${mini}`,
    prepare: (w, h, dpr) => {
      const H = h * (w > h ? 0.52 : 0.5);
      const { c, ctx } = offscreen(w, h, dpr);
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      pal.sky.forEach((col, i) => sky.addColorStop(i / (pal.sky.length - 1), col));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, H + 2);
      // moon or diffuse sun
      const mx = w * 0.7,
        my = H * 0.36,
        mr = Math.min(w, h) * (night ? 0.11 : 0.09);
      const halo = ctx.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 5);
      halo.addColorStop(0, night ? "rgba(255,240,210,0.28)" : "rgba(255,250,235,0.7)");
      halo.addColorStop(1, "rgba(255,240,210,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, H);
      const disc = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
      disc.addColorStop(0, night ? "#fffbea" : "rgba(255,253,245,0.95)");
      disc.addColorStop(1, night ? "#e6dcc0" : "rgba(255,246,228,0.6)");
      ctx.fillStyle = disc;
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();
      if (night) {
        ctx.fillStyle = "rgba(150,140,110,0.12)";
        for (const [dx, dy, r] of [
          [-0.3, -0.2, 0.28],
          [0.25, 0.1, 0.22],
          [-0.05, 0.38, 0.18],
          [0.35, -0.35, 0.12],
        ]) {
          ctx.beginPath();
          ctx.ellipse(mx + dx * mr, my + dy * mr, r * mr, r * mr * 0.8, 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // layered mountains with mist between
      const R = rng(7);
      pal.mountains.forEach((col, k) => {
        const base = H - (3 - k) * h * 0.012;
        const amp = h * (0.16 - k * 0.032);
        const seed = k * 2.3 + 1;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(0, H + 2);
        for (let x = 0; x <= w + 8; x += 6) {
          const u = x / w;
          const y =
            base -
            amp *
              (0.55 * Math.abs(Math.sin(u * (2.2 + k) + seed)) +
                0.3 * Math.sin(u * (6 + k * 2) + seed * 3) * 0.5 +
                0.25 * Math.abs(Math.sin(u * 13 + seed)) * 0.4) -
            amp * 0.2;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, H + 2);
        ctx.closePath();
        ctx.fill();
        if (k === 2) {
          // small shikhara temple on the far shore
          const tx = w * 0.16,
            ty = H - h * 0.006,
            ts = Math.max(10, w * 0.035);
          ctx.fillStyle = pal.mountains[3];
          ctx.beginPath();
          ctx.moveTo(tx - ts, ty);
          ctx.lineTo(tx - ts, ty - ts * 0.7);
          ctx.quadraticCurveTo(tx - ts * 0.75, ty - ts * 2.1, tx, ty - ts * 2.6);
          ctx.quadraticCurveTo(tx + ts * 0.75, ty - ts * 2.1, tx + ts, ty - ts * 0.7);
          ctx.lineTo(tx + ts, ty);
          ctx.closePath();
          ctx.fill();
          ctx.fillRect(tx - ts * 0.08, ty - ts * 3.05, ts * 0.16, ts * 0.5);
          ctx.fillRect(tx + ts * 0.9, ty - ts * 0.9, ts * 1.4, ts * 0.9);
          // trees along the shore
          for (let i = 0; i < 26; i++) {
            const x = R() * w,
              r = h * (0.01 + R() * 0.018);
            ctx.beginPath();
            ctx.ellipse(x, H - r * 0.5, r * 1.3, r, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        const mist = ctx.createLinearGradient(0, base - amp * 0.6, 0, H);
        mist.addColorStop(0, `rgba(${pal.mist},0)`);
        mist.addColorStop(1, `rgba(${pal.mist},${night ? 0.12 : 0.32})`);
        ctx.fillStyle = mist;
        ctx.fillRect(0, base - amp, w, H - base + amp);
      });
      // water
      const wg = ctx.createLinearGradient(0, H, 0, h);
      pal.water.forEach((col, i) => wg.addColorStop(i / (pal.water.length - 1), col));
      ctx.fillStyle = wg;
      ctx.fillRect(0, H, w, h - H);
      // mountain reflection (soft)
      ctx.save();
      ctx.globalAlpha = night ? 0.25 : 0.2;
      ctx.translate(0, H * 2);
      ctx.scale(1, -1);
      ctx.drawImage(c, 0, H - h * 0.15, w, h * 0.15, 0, H - h * 0.15, w, h * 0.15);
      ctx.restore();
      const glow = ctx.createLinearGradient(0, H, 0, H + h * 0.06);
      glow.addColorStop(0, `rgba(${pal.mist},${night ? 0.18 : 0.4})`);
      glow.addColorStop(1, `rgba(${pal.mist},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, H, w, h * 0.06);

      const S = Math.min(w * 0.2, h * 0.11, 150);
      const flowers: Flower[] = [
        {
          x: 0.58,
          y: H / h + 0.12,
          s: S * 0.42,
          sh: S * 0.5,
          ph: 2.1,
          kind: "lotus",
          pink: true,
          dew: false,
        },
        { x: 0.12, y: 0.73, s: S * 0.5, sh: S * 1.1, ph: 4, kind: "bud", pink: true, dew: false },
        {
          x: 0.8,
          y: 0.79,
          s: S * 0.75,
          sh: S * 0.75,
          ph: 1.2,
          kind: "lotus",
          pink: false,
          dew: true,
        },
        { x: 0.3, y: 0.88, s: S, sh: S * 0.95, ph: 0, kind: "lotus", pink: true, dew: true },
        { x: 0.94, y: 0.93, s: S * 0.6, sh: S * 1.3, ph: 3, kind: "bud", pink: false, dew: false },
      ];
      const P = rng(11);
      const pads: Pad[] = [];
      for (let i = 0; i < (mini ? 8 : 15); i++) {
        const y = H + (h - H) * (0.12 + 0.95 * P() * P() * 0 + P() * 0.9);
        const depth = (y - H) / (h - H);
        pads.push({ x: P() * w, y, r: w * (0.03 + 0.09 * depth), rot: P() * 6.28, ph: P() * 6 });
      }
      pads.sort((a, b) => a.y - b.y);
      st.current = { bg: c, H, flowers, pads };
    },
    draw: (ctx, w, h, t) => {
      const { bg, H, flowers, pads } = st.current;
      if (!bg) return;
      const I = intensity;
      const p = ptr.current;
      p.x += (p.tx - p.x) * 0.04;
      p.y += (p.ty - p.y) * 0.04;
      ctx.drawImage(bg, 0, 0, w, h);
      const gust =
        (Math.sin(t * 0.23) * 0.6 + Math.sin(t * 0.71 + 1) * 0.3 + Math.sin(t * 1.7) * 0.1) * I;

      // moon/sun path on water
      const mx = w * 0.7;
      for (let i = 0; i < 24; i++) {
        const u = i / 24;
        const y = H + 3 + Math.pow(u, 1.5) * (h - H) * 0.85;
        const ww = (6 + i * 3.2) * (0.6 + 0.4 * Math.sin(t * 1.1 * (0.4 + I) + i * 1.7));
        ctx.fillStyle = `rgba(${pal.glint},${(night ? 0.4 : 0.32) * (1 - u)})`;
        ctx.beginPath();
        ctx.ellipse(mx + Math.sin(t * 0.7 + i) * 3 * I, y, ww, 0.9 + u * 1.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // gentle current lines
      ctx.lineWidth = 1;
      for (let i = 0; i < 18; i++) {
        const y = H + 6 + ((i * 41.3) % (h - H - 6));
        const x = ((i * 97 + t * (6 + (i % 3)) * I) % (w + 200)) - 100;
        ctx.strokeStyle = `rgba(${pal.mist},${night ? 0.05 : 0.12})`;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 40, y - 1.5, x + 70 + (y - H) * 0.2, y);
        ctx.stroke();
      }
      // drifting mist on the horizon
      for (let i = 0; i < 2; i++) {
        const x = ((t * (4 + i * 3) * (0.3 + I) + i * w * 0.6) % (w * 1.6)) - w * 0.3 + p.x * 6;
        const g = ctx.createRadialGradient(x, H, 0, x, H, w * 0.5);
        g.addColorStop(0, `rgba(${pal.mist},${night ? 0.1 : 0.25})`);
        g.addColorStop(1, `rgba(${pal.mist},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x - w * 0.5, H - h * 0.08, w, h * 0.16);
      }

      const fx = p.x * 8;
      // pads
      for (const pd of pads) {
        const depth = (pd.y - H) / (h - H);
        const bob = Math.sin(t * 0.8 + pd.ph) * 1.2 * I;
        ctx.save();
        ctx.translate(pd.x + fx * depth, pd.y + bob);
        ctx.scale(1, 0.28 + depth * 0.12);
        ctx.rotate(pd.rot + Math.sin(t * 0.3 + pd.ph) * 0.03 * I);
        const g = ctx.createRadialGradient(-pd.r * 0.3, -pd.r * 0.3, pd.r * 0.1, 0, 0, pd.r);
        g.addColorStop(0, pal.padA);
        g.addColorStop(1, pal.padB);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, pd.r, 0.18, Math.PI * 2 - 0.18);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = pal.vein;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let k = 0; k < 9; k++) {
          const a = 0.5 + k * 0.66;
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * pd.r * 0.9, Math.sin(a) * pd.r * 0.9);
        }
        ctx.stroke();
        ctx.restore();
      }

      for (const f of flowers) {
        const x0 = f.x * w + fx * (f.y - H / h);
        const wy = f.y * h;
        const sway = (Math.sin(t * 0.6 + f.ph) * 0.05 + gust * 0.07) * (0.3 + I);
        const tipX = x0 + sway * f.sh;
        const tipY = wy - f.sh;
        // ripples around stem
        for (let k = 0; k < 2; k++) {
          const rr = (((t * 0.22 * (0.4 + I) + f.ph * 0.13 + k * 0.5) % 1) + 1) % 1;
          ctx.strokeStyle = `rgba(${pal.mist},${(1 - rr) * (night ? 0.22 : 0.4)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(
            x0,
            wy,
            f.s * 0.2 + rr * f.s * 1.2,
            (f.s * 0.2 + rr * f.s * 1.2) * 0.22,
            0,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
        }
        const drawOne = () => {
          ctx.strokeStyle = pal.stem;
          ctx.lineWidth = Math.max(1.5, f.s * 0.06);
          ctx.beginPath();
          ctx.moveTo(x0, wy);
          ctx.quadraticCurveTo(x0 - sway * f.sh * 0.3, wy - f.sh * 0.5, tipX, tipY);
          ctx.stroke();
          ctx.save();
          ctx.translate(tipX, tipY);
          ctx.rotate(sway * 0.9);
          if (f.kind === "lotus") lotus(ctx, f.s, pal, t, I, f.pink, f.dew);
          else bud(ctx, f.s, pal);
          ctx.restore();
        };
        // reflection
        if (!mini) {
          ctx.save();
          ctx.globalAlpha = night ? 0.14 : 0.18;
          ctx.translate(0, wy);
          ctx.scale(1, -0.5);
          ctx.translate(0, -wy);
          drawOne();
          ctx.restore();
        }
        drawOne();
      }

      // foreground reeds
      ctx.fillStyle = pal.reed;
      const reeds = mini ? 4 : 9;
      for (let i = 0; i < reeds; i++) {
        const left = i < reeds * 0.6;
        const bx = left ? i * w * 0.025 : w - (i - reeds * 0.6) * w * 0.03;
        const len = h * (0.18 + ((i * 37) % 10) / 60);
        const lean =
          (left ? 1 : -1) * len * 0.15 +
          (Math.sin(t * 0.9 + i) * 0.04 + gust * 0.05) * len * (0.3 + I);
        const bw = 2 + (i % 3);
        ctx.beginPath();
        ctx.moveTo(bx - bw, h + 2);
        ctx.quadraticCurveTo(bx, h - len * 0.6, bx + lean, h - len);
        ctx.quadraticCurveTo(bx + bw * 0.4, h - len * 0.55, bx + bw, h + 2);
        ctx.fill();
      }
    },
  });

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
