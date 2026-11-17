import { useRef } from "react";
import { isLowSpec, offscreen, rng, usePointer, useSceneCanvas, type SceneProps } from "./useSceneCanvas";

const PAL = {
  light: {
    sky: ["#d3dfe8", "#ebe3e8", "#f7e6df"],
    hills: ["#d9cbd7", "#bba9c0", "#94839e"],
    haze: "250,236,236",
    blossom: "244,190,207",
    ground: ["#cdb9c4", "#9a8293"],
    bark: "#4a3234", barkHi: "#7b5a55",
    p0: "#fff1f4", p1: "#f2a3ba", center: "#cf4d6c",
  },
  dark: {
    sky: ["#090a19", "#1a1832", "#3a2b47"],
    hills: ["#2c2742", "#211c33", "#151222"],
    haze: "120,100,150",
    blossom: "196,140,176",
    ground: ["#1b1626", "#0b0912"],
    bark: "#140d12", barkHi: "#3b2a2e",
    p0: "#f6dbe6", p1: "#c97a9a", center: "#9a3a57",
  },
};
type Pal = (typeof PAL)["dark"];

function petalShape(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(r * 0.6, -r * 0.2, r * 0.62, -r * 0.85, r * 0.14, -r);
  ctx.lineTo(0, -r * 0.84);
  ctx.lineTo(-r * 0.14, -r);
  ctx.bezierCurveTo(-r * 0.62, -r * 0.85, -r * 0.6, -r * 0.2, 0, 0);
  ctx.closePath();
}

function blossom(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, pal: Pal, R: () => number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(1, 0.75 + R() * 0.25);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, pal.p1);
  g.addColorStop(0.45, pal.p0);
  g.addColorStop(1, pal.p0);
  for (let k = 0; k < 5; k++) {
    ctx.save();
    ctx.rotate((k * Math.PI * 2) / 5);
    petalShape(ctx, r);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(160,70,100,0.18)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
  }
  ctx.strokeStyle = pal.center;
  ctx.fillStyle = "#f0c860";
  ctx.lineWidth = 0.6;
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.44, Math.sin(a) * r * 0.44, Math.max(0.6, r * 0.05), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = pal.center;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function grow(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, len: number, wid: number, depth: number, pal: Pal, R: () => number, fr: number) {
  const ex = x + Math.cos(ang) * len;
  const ey = y + Math.sin(ang) * len;
  const bend = (R() - 0.5) * len * 0.4;
  const cx = (x + ex) / 2 + Math.cos(ang + Math.PI / 2) * bend;
  const cy = (y + ey) / 2 + Math.sin(ang + Math.PI / 2) * bend;
  ctx.lineCap = "round";
  ctx.strokeStyle = pal.bark;
  ctx.lineWidth = wid;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(cx, cy, ex, ey);
  ctx.stroke();
  if (wid > 3) {
    ctx.strokeStyle = pal.barkHi;
    ctx.lineWidth = wid * 0.22;
    ctx.beginPath();
    ctx.moveTo(x, y - wid * 0.25);
    ctx.quadraticCurveTo(cx, cy - wid * 0.25, ex, ey - wid * 0.2);
    ctx.stroke();
  }
  if (depth <= 2) {
    const n = 2 + Math.floor(R() * 4);
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2;
      const d = R() * len * 0.35;
      blossom(ctx, ex + Math.cos(a) * d, ey + Math.sin(a) * d, fr * (0.7 + R() * 0.5), R() * 6, pal, R);
    }
    if (depth === 2) {
      const u = 0.5;
      blossom(ctx, x + (ex - x) * u, y + (ey - y) * u + wid, fr * 0.8, R() * 6, pal, R);
    }
  }
  if (depth > 0) {
    const kids = R() < 0.35 ? 3 : 2;
    for (let i = 0; i < kids; i++) {
      const spread = (i - (kids - 1) / 2) * (0.5 + R() * 0.3) + (R() - 0.5) * 0.2;
      grow(ctx, ex, ey, ang + spread + 0.08, len * (0.66 + R() * 0.14), wid * 0.66, depth - 1, pal, R, fr);
    }
  }
}

type Petal = { x: number; y: number; z: number; rot: number; spin: number; tilt: number; ts: number; s: number; ph: number };

export function SakuraScene({ mode, intensity, reduce, mini, className }: SceneProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const ptr = usePointer();
  const pal = PAL[mode];
  const night = mode === "dark";
  const st = useRef<{ bg?: HTMLCanvasElement; br?: HTMLCanvasElement; petals: Petal[]; lastT: number; impulse: number }>({ petals: [], lastT: 0, impulse: 0 });

  useSceneCanvas(ref, {
    mini,
    reduce,
    key: `${mode}-${reduce}-${mini}`,
    prepare: (w, h, dpr) => {
      const R = rng(3);
      const { c, ctx } = offscreen(w, h, dpr);
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.75);
      pal.sky.forEach((col, i) => sky.addColorStop(i / (pal.sky.length - 1), col));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      // sun / crescent moon
      const mx = w * 0.26, my = h * 0.16, mr = Math.min(w, h) * 0.06;
      const halo = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 6);
      halo.addColorStop(0, night ? "rgba(240,220,240,0.22)" : "rgba(255,240,230,0.8)");
      halo.addColorStop(1, "rgba(255,240,240,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h * 0.6);
      ctx.fillStyle = night ? "#f4e9dd" : "rgba(255,250,244,0.9)";
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();
      if (night) {
        ctx.fillStyle = pal.sky[1];
        ctx.beginPath();
        ctx.arc(mx + mr * 0.42, my - mr * 0.18, mr * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
      // rolling hills with painted blossom trees
      const bases = [0.56, 0.64, 0.73];
      pal.hills.forEach((col, k) => {
        const base = h * bases[k];
        const amp = h * (0.05 + k * 0.012);
        const yAt = (x: number) => base - amp * (0.6 * Math.sin((x / w) * (2 + k) + k * 1.7) + 0.4 * Math.sin((x / w) * (5 + k) + k)) * 0.8;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w + 8; x += 8) ctx.lineTo(x, yAt(x));
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
        if (k === 0) {
          // distant pagoda
          const px = w * 0.74, py = yAt(w * 0.74), ps = Math.max(8, w * 0.028);
          ctx.fillStyle = pal.hills[1];
          for (let tier = 0; tier < 4; tier++) {
            const ty = py - tier * ps * 1.05;
            const tw = ps * (1.7 - tier * 0.25);
            ctx.fillRect(px - tw * 0.38, ty - ps * 0.7, tw * 0.76, ps * 0.7);
            ctx.beginPath();
            ctx.moveTo(px - tw, ty - ps * 0.62);
            ctx.quadraticCurveTo(px, ty - ps * 1.15, px + tw, ty - ps * 0.62);
            ctx.lineTo(px + tw * 0.7, ty - ps * 0.82);
            ctx.lineTo(px - tw * 0.7, ty - ps * 0.82);
            ctx.closePath();
            ctx.fill();
          }
          ctx.fillRect(px - 0.8, py - ps * 5.4, 1.6, ps * 1.4);
        }
        const trees = [9, 7, 5][k];
        for (let i = 0; i < trees; i++) {
          const tx = R() * w, ty = yAt(tx) + 2;
          const tr = h * (0.022 + k * 0.016) * (0.7 + R() * 0.6);
          ctx.strokeStyle = col;
          ctx.lineWidth = 1 + k;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx + (R() - 0.5) * 3, ty - tr * 1.2);
          ctx.stroke();
          for (let j = 0; j < 16; j++) {
            const a = R() * Math.PI * 2, d = R() * tr;
            ctx.fillStyle = `rgba(${pal.blossom},${0.18 + R() * (0.3 + k * 0.12)})`;
            ctx.beginPath();
            ctx.arc(tx + Math.cos(a) * d * 1.3, ty - tr * 1.4 + Math.sin(a) * d * 0.8, tr * (0.3 + R() * 0.35), 0, Math.PI * 2);
            ctx.fill();
          }
        }
        const haze = ctx.createLinearGradient(0, base - amp * 2, 0, base + h * 0.06);
        haze.addColorStop(0, `rgba(${pal.haze},0)`);
        haze.addColorStop(1, `rgba(${pal.haze},${night ? 0.16 : 0.42})`);
        ctx.fillStyle = haze;
        ctx.fillRect(0, base - amp * 2, w, amp * 2 + h * 0.06);
      });
      const gr = ctx.createLinearGradient(0, h * 0.8, 0, h);
      gr.addColorStop(0, pal.ground[0]);
      gr.addColorStop(1, pal.ground[1]);
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w + 8; x += 10) ctx.lineTo(x, h * 0.84 - Math.sin(x / w * 3 + 1) * h * 0.02);
      ctx.lineTo(w, h);
      ctx.fill();
      for (let i = 0; i < 70; i++) {
        ctx.fillStyle = `rgba(${pal.blossom},${0.3 + R() * 0.5})`;
        ctx.beginPath();
        ctx.ellipse(R() * w, h * 0.86 + R() * h * 0.14, 2 + R() * 2.5, 1 + R(), R() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // branches (cached)
      const b = offscreen(w, h, dpr);
      const BR = rng(21);
      const unit = Math.min(w, h * 0.7);
      grow(b.ctx, w + 12, h * 0.1, Math.PI - 0.28, unit * 0.3, unit * 0.04, mini ? 4 : 5, pal, BR, unit * 0.028);
      grow(b.ctx, -12, h * 0.02, 0.42, unit * 0.2, unit * 0.025, mini ? 3 : 4, pal, BR, unit * 0.024);
      const count = mini ? 14 : isLowSpec() ? 22 : 40;
      const P = rng(5);
      const petals: Petal[] = Array.from({ length: count }, () => ({
        x: P() * w, y: P() * h, z: 0.35 + P() * 0.65, rot: P() * 6.28, spin: (P() - 0.5) * 3,
        tilt: P() * 6.28, ts: 1 + P() * 2.5, s: 4 + P() * 4, ph: P() * 6.28,
      }));
      st.current = { bg: c, br: b.c, petals, lastT: 0, impulse: 0 };
    },
    draw: (ctx, w, h, t) => {
      const s = st.current;
      if (!s.bg || !s.br) return;
      const I = intensity;
      const p = ptr.current;
      const dt = s.lastT ? Math.min(0.05, Math.max(0, t - s.lastT)) : 0.016;
      s.lastT = t;
      // touch breeze
      s.impulse += p.dx * 0.5 + p.burst * 1.4;
      p.dx *= 0.5;
      p.burst = 0;
      s.impulse *= 0.975;
      p.x += (p.tx - p.x) * 0.04;
      const wind = 0.45 + 0.35 * Math.sin(t * 0.21) + 0.22 * Math.sin(t * 0.73 + 1) + s.impulse;

      ctx.drawImage(s.bg, -p.x * 4 - 4, 0, w + 8, h);
      // drifting haze
      const hx = ((t * 8 * (0.3 + I)) % (w * 1.6)) - w * 0.3;
      const hg = ctx.createRadialGradient(hx, h * 0.6, 0, hx, h * 0.6, w * 0.6);
      hg.addColorStop(0, `rgba(${pal.haze},${night ? 0.1 : 0.25})`);
      hg.addColorStop(1, `rgba(${pal.haze},0)`);
      ctx.fillStyle = hg;
      ctx.fillRect(0, h * 0.4, w, h * 0.4);

      const n = Math.round(s.petals.length * (0.35 + 0.65 * I));
      const drawPetals = (front: boolean) => {
        for (let i = 0; i < n; i++) {
          const q = s.petals[i];
          if (front !== q.z > 0.75) continue;
          if (front) {
            /* updated below */
          }
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(q.rot);
          ctx.scale(Math.cos(q.tilt) * 0.85 + 0.15 * Math.sign(Math.cos(q.tilt) || 1), 1);
          const r = q.s * q.z;
          petalShape(ctx, r * 1.6);
          ctx.globalAlpha = 0.5 + q.z * 0.5;
          ctx.fillStyle = Math.cos(q.tilt) > 0 ? pal.p0 : pal.p1;
          ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      };
      // update petals
      for (let i = 0; i < n; i++) {
        const q = s.petals[i];
        const vx = (wind * 55 + Math.sin(t * 1.1 + q.ph) * 14) * q.z * (0.3 + I);
        const vy = (16 + 22 * q.z + Math.cos(t * 0.9 + q.ph) * 6) * (0.35 + 0.65 * I);
        q.x += vx * dt;
        q.y += vy * dt;
        q.rot += q.spin * dt * (0.6 + Math.abs(wind) * 0.5);
        q.tilt += q.ts * dt * (0.5 + Math.abs(wind) * 0.4);
        if (q.x > w + 20) q.x = -20;
        if (q.x < -20) q.x = w + 20;
        if (q.y > h + 20) { q.y = -20; q.x = ((q.x * 7.31 + 97) % w + w) % w; }
      }
      drawPetals(false);
      // branch sway around anchor
      const sway = (Math.sin(t * 0.55) * 0.006 + wind * 0.004) * (0.3 + I);
      ctx.save();
      ctx.translate(w, h * 0.1);
      ctx.rotate(-sway);
      ctx.translate(-w, -h * 0.1);
      ctx.drawImage(s.br, p.x * 6, 0, w, h);
      ctx.restore();
      drawPetals(true);
    },
  });

  return <canvas ref={ref} aria-hidden className={className} style={{ width: "100%", height: "100%", display: "block" }} />;
}