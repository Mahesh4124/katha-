export type Token = { i: number; text: string; sentence: number; start: number; dur: number };
export type Piece = { w?: Token; s?: string };
export type Para = { pieces: Piece[]; deva: boolean };
export type Doc = { paras: Para[]; tokens: Token[]; sentenceStarts: number[]; total: number };

const END = /[.!?।॥]["”’)\]]*$/;
const SOFT = /[,;:—–]["”’)]*$/;
const DEVA = /[\u0900-\u097F]/;

/** Splits text into paragraphs/words and assigns a silent-demo timeline (seconds at rate 1). */
export function buildDoc(text: string): Doc {
  const paras: Para[] = [];
  const tokens: Token[] = [];
  const sentenceStarts: number[] = [];
  let t = 0;
  let newSentence = true;
  const blocks = text.replace(/\r/g, "").split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean);
  for (const b of blocks) {
    const pieces: Piece[] = [];
    const deva = DEVA.test(b);
    for (const p of b.split(/(\s+)/)) {
      if (!p) continue;
      if (/^\s+$/.test(p)) {
        pieces.push({ s: " " });
        continue;
      }
      if (newSentence) {
        sentenceStarts.push(tokens.length);
        newSentence = false;
      }
      const len = Array.from(p).length * (DEVA.test(p) ? 0.75 : 1);
      const pause = END.test(p) ? 0.42 : SOFT.test(p) ? 0.18 : 0;
      const dur = 0.13 + len * 0.05 + pause;
      const tok: Token = { i: tokens.length, text: p, sentence: sentenceStarts.length - 1, start: t, dur };
      tokens.push(tok);
      pieces.push({ w: tok });
      t += dur;
      if (END.test(p)) newSentence = true;
    }
    const last = tokens[tokens.length - 1];
    if (last) {
      last.dur += 0.3;
      t += 0.3;
    }
    newSentence = true;
    paras.push({ pieces, deva });
  }
  return { paras, tokens, sentenceStarts, total: t };
}

export function indexAt(tokens: Token[], t: number): number {
  if (!tokens.length) return -1;
  let lo = 0;
  let hi = tokens.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (tokens[mid].start <= t) lo = mid;
    else hi = mid - 1;
  }
  return Math.max(0, lo);
}

/** Free-running clock; interpolates every frame so the ribbon never waits for events. */
export class Clock {
  t = 0;
  playing = false;
  started = false;
  rate = 1;
  private last = 0;
  now() {
    if (this.playing) {
      const n = performance.now();
      this.t += ((n - this.last) / 1000) * this.rate;
      this.last = n;
    }
    return this.t;
  }
  play() {
    this.last = performance.now();
    this.playing = true;
    this.started = true;
  }
  pause() {
    this.now();
    this.playing = false;
  }
  seek(t: number) {
    this.t = Math.max(0, t);
    this.last = performance.now();
    this.started = true;
  }
}