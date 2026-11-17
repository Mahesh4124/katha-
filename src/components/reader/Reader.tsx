import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Pause, Play, Repeat, SkipBack, SkipForward, SlidersHorizontal, Minus, Plus } from "lucide-react";
import { Scene, THEMES } from "@/components/scenes/Scene";
import type { Prefs, ThemeId } from "@/lib/storage";
import { FlowingLightRibbon } from "./FlowingLightRibbon";
import { buildDoc, Clock, indexAt, type Doc } from "./text";

export type ReaderBook = { id?: string; title: string; text: string; progress?: number; demo?: boolean };

function Paras({ doc, base }: { doc: Doc; base: boolean }) {
  return (
    <>
      {doc.paras.map((p, i) => (
        <p key={i} lang={p.deva ? "sa" : undefined} className={p.deva ? "mb-7 font-deva text-[1.08em]" : "mb-7"}>
          {p.pieces.map((pc, j) =>
            pc.w ? (
              <span key={j} data-w={pc.w.i} className={base ? "cursor-pointer" : undefined}>
                {pc.w.text}
              </span>
            ) : (
              pc.s
            ),
          )}
        </p>
      ))}
    </>
  );
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function Reader({
  book, prefs, setPrefs, onBack, autoplay, onProgress,
}: {
  book: ReaderBook;
  prefs: Prefs;
  setPrefs: (p: Prefs) => void;
  onBack: () => void;
  autoplay: boolean;
  onProgress: (id: string, idx: number) => void;
}) {
  const doc = useMemo(() => buildDoc(book.text), [book.text]);
  const clock = useMemo(() => new Clock(), []);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const litRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [panel, setPanel] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const repeatRef = useRef(repeat);
  repeatRef.current = repeat;

  useEffect(() => { clock.rate = prefs.rate; }, [clock, prefs.rate]);

  const play = useCallback(() => {
    if (!doc.tokens.length) return;
    if (clock.t >= doc.total - 0.01) clock.seek(0);
    clock.play();
    setPlaying(true);
  }, [clock, doc.total]);
  const pause = useCallback(() => { clock.pause(); setPlaying(false); }, [clock]);

  const saveProgress = useCallback(() => {
    if (book.id && doc.tokens.length) onProgress(book.id, indexAt(doc.tokens, clock.now()));
  }, [book.id, clock, doc.tokens, onProgress]);

  // Keep text above the actual controls, including expanded settings and larger fonts.
  useEffect(() => {
    const controls = controlsRef.current;
    const scroller = scrollerRef.current;
    if (!controls || !scroller) return;
    const resize = () => { scroller.style.bottom = `${controls.getBoundingClientRect().height}px`; };
    const observer = new ResizeObserver(resize);
    observer.observe(controls);
    resize();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const start = book.progress ? doc.tokens[book.progress]?.start ?? 0 : 0;
    clock.t = start;
    if (book.progress) clock.started = true;
    const id = autoplay ? window.setTimeout(play, 700) : 0;
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // UI tick (slow) — the ribbon has its own per-frame loop.
  useEffect(() => {
    let lastSave = 0;
    const id = window.setInterval(() => {
      const now = clock.now();
      setT(now);
      if (clock.playing && now >= doc.total) {
        if (repeatRef.current) clock.seek(0);
        else { clock.pause(); setPlaying(false); }
      }
      if (book.id && doc.tokens.length && clock.playing && performance.now() - lastSave > 3000) {
        lastSave = performance.now();
        onProgress(book.id, indexAt(doc.tokens, now));
      }
    }, 120);
    const onVis = () => { if (document.hidden) { clock.pause(); setPlaying(false); saveProgress(); } };
    window.addEventListener("pagehide", onVis);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onVis);
      clock.pause();
      saveProgress();
    };
  }, [clock, doc, book.id, onProgress, saveProgress]);

  const idx = indexAt(doc.tokens, t);
  const sentence = doc.tokens[idx]?.sentence ?? 0;
  const goSentence = (d: number) => {
    const target = Math.max(0, Math.min(doc.sentenceStarts.length - 1, sentence + d));
    const token = doc.tokens[doc.sentenceStarts[target]];
    if (!token) return;
    clock.seek(token.start);
    setT(clock.t);
  };
  const onTextClick = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-w]");
    if (!el) return;
    const tok = doc.tokens[Number(el.dataset.w)];
    if (!tok) return;
    const first = doc.tokens[doc.sentenceStarts[tok.sentence]];
    if (!first) return;
    clock.seek(first.start);
    play();
  };

  const set = (patch: Partial<Prefs>) => setPrefs({ ...prefs, ...patch });

  return (
    <div className="page-in fixed inset-0 overflow-hidden">
      <div className="absolute inset-0">
        <Scene theme={prefs.theme} mode={prefs.mode} intensity={prefs.intensity} reduce={prefs.reduceMotion} />
      </div>

      <header className="absolute inset-x-0 top-0 z-20 flex items-center gap-3 px-4 pt-4">
        <button onClick={onBack} aria-label="Back to library" className="glass btn-quiet grid h-10 w-10 place-items-center rounded-full">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="glass min-w-0 flex-1 rounded-full px-4 py-2">
          <div className="kicker text-[0.58rem] text-muted-foreground">Katha</div>
          <div className="truncate font-display text-base leading-tight">{book.title}</div>
        </div>
      </header>

      <div ref={scrollerRef} className="absolute inset-0 z-10 overflow-y-auto overscroll-contain px-3 pb-8 pt-24">
        <article className="ink-panel mx-auto max-w-[40rem] rounded-[1.75rem] [overflow-wrap:anywhere] px-6 py-8 sm:px-10 sm:py-12" style={{ ["--fs" as string]: prefs.fontScale }}>
          {book.demo && (
            <p className="kicker mb-6 text-primary">Silent demo · no real audio · tap any sentence</p>
          )}
          <div ref={boxRef} className="reader-text relative">
            <div data-base onClick={onTextClick} className="relative z-[1]"><Paras doc={doc} base /></div>
            <FlowingLightRibbon
              boxRef={boxRef}
              litRef={litRef}
              scrollerRef={scrollerRef}
              tokens={doc.tokens}
              clock={clock}
              intensity={prefs.intensity}
              reduceMotion={prefs.reduceMotion}
              mode={prefs.mode}
              measureKey={`${prefs.fontScale}-${book.text.length}`}
            />
            <div ref={litRef} aria-hidden className="lit-layer pointer-events-none absolute inset-0 z-[2]" style={{ opacity: 0 }}>
              <Paras doc={doc} base={false} />
            </div>
          </div>
        </article>
      </div>

      <div ref={controlsRef} className="absolute inset-x-0 bottom-0 z-20 max-h-[calc(100dvh-5rem)] overflow-y-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="ink-panel mx-auto max-w-[40rem] rounded-[1.5rem] p-3">
          {panel && (
            <div className="rise-in mb-3 space-y-4 border-b border-border px-1 pb-4 text-sm">
              <Row label="World">
                {(Object.keys(THEMES) as ThemeId[]).map((id) => (
                  <Chip key={id} on={prefs.theme === id} onClick={() => set({ theme: id })}>{THEMES[id].name}</Chip>
                ))}
              </Row>
              <Row label="Light">
                <Chip on={prefs.mode === "dark"} onClick={() => set({ mode: "dark" })}>Night</Chip>
                <Chip on={prefs.mode === "light"} onClick={() => set({ mode: "light" })}>Day</Chip>
              </Row>
              <Row label="Text">
                <button aria-label="Smaller text" className="btn-quiet grid h-8 w-8 place-items-center rounded-full" onClick={() => set({ fontScale: Math.max(0.85, +(prefs.fontScale - 0.1).toFixed(2)) })}><Minus className="h-3.5 w-3.5" /></button>
                <span className="w-12 text-center tabular-nums">{Math.round(prefs.fontScale * 100)}%</span>
                <button aria-label="Larger text" className="btn-quiet grid h-8 w-8 place-items-center rounded-full" onClick={() => set({ fontScale: Math.min(1.6, +(prefs.fontScale + 0.1).toFixed(2)) })}><Plus className="h-3.5 w-3.5" /></button>
              </Row>
              <Row label="Pace">
                {[0.75, 1, 1.25, 1.5].map((r) => (
                  <Chip key={r} on={prefs.rate === r} onClick={() => set({ rate: r })}>{r}×</Chip>
                ))}
              </Row>
              <Row label="Motion">
                <input type="range" min={0} max={1} step={0.05} value={prefs.intensity} onChange={(e) => set({ intensity: +e.target.value })} className="flex-1" aria-label="Motion intensity" />
              </Row>
              <Row label="Calm">
                <Chip on={prefs.reduceMotion} onClick={() => set({ reduceMotion: !prefs.reduceMotion })}>{prefs.reduceMotion ? "Reduced motion on" : "Reduce motion"}</Chip>
              </Row>
              <p className="text-xs text-muted-foreground">Neural voice: not connected. Playback is a silent timed preview.</p>
            </div>
          )}
          <div className="flex items-center gap-2 px-1">
            <span className="w-9 text-[0.7rem] tabular-nums text-muted-foreground">{fmt(t)}</span>
            <input
              type="range" min={0} max={1000} value={Math.min(1000, (t / doc.total) * 1000) || 0}
              onChange={(e) => { clock.seek((+e.target.value / 1000) * doc.total); setT(clock.t); }}
              className="h-1 flex-1" aria-label="Seek"
            />
            <span className="w-9 text-right text-[0.7rem] tabular-nums text-muted-foreground">{fmt(doc.total / prefs.rate)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <button aria-label="Reading settings" onClick={() => setPanel(!panel)} className={`grid h-10 w-10 place-items-center rounded-full ${panel ? "chip-on" : "btn-quiet"}`}>
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              <button aria-label="Previous sentence" onClick={() => goSentence(-1)} className="btn-quiet grid h-10 w-10 place-items-center rounded-full"><SkipBack className="h-4 w-4" /></button>
              <button aria-label={playing ? "Pause" : "Play silent preview"} onClick={playing ? pause : play} className="btn-ember grid h-14 w-14 place-items-center rounded-full">
                {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
              </button>
              <button aria-label="Next sentence" onClick={() => goSentence(1)} className="btn-quiet grid h-10 w-10 place-items-center rounded-full"><SkipForward className="h-4 w-4" /></button>
            </div>
            <button aria-label="Repeat" aria-pressed={repeat} onClick={() => setRepeat(!repeat)} className={`grid h-10 w-10 place-items-center rounded-full ${repeat ? "chip-on" : "btn-quiet"}`}>
              <Repeat className="h-4 w-4" />
            </button>
          </div>
          <p className="kicker mt-2 text-center text-[0.55rem] text-muted-foreground">Silent preview · no audio</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="kicker w-14 shrink-0 text-[0.58rem] text-muted-foreground">{label}</span>
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={on} className={`rounded-full px-3 py-1.5 text-xs font-medium ${on ? "chip-on" : "btn-quiet"}`}>
      {children}
    </button>
  );
}