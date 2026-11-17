import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Minus,
  Plus,
} from "lucide-react";
import { Scene, THEMES } from "@/components/scenes/Scene";
import { updateBookAnnotations, type Annotation, type Prefs, type ThemeId } from "@/lib/storage";
import {
  AnnotationToolbar,
  ParallelNotes,
  DrawingPad,
  DiagramPad,
  type TextAnchor,
} from "./AnnotationTools";
import { FlowingLightRibbon } from "./FlowingLightRibbon";
import { buildDoc, Clock, indexAt, type Doc } from "./text";

export type ReaderBook = {
  id?: string;
  title: string;
  text: string;
  progress?: number;
  demo?: boolean;
  annotations?: Annotation[];
};

type WordMarks = Map<number, { bold: boolean; italic: boolean; highlight: boolean }>;
function Paras({ doc, base, marks }: { doc: Doc; base: boolean; marks: WordMarks }) {
  return (
    <>
      {doc.paras.map((p, i) => (
        <p
          key={i}
          lang={p.deva ? "sa" : undefined}
          className={p.deva ? "mb-7 font-deva text-[1.08em]" : "mb-7"}
        >
          {p.pieces.map((pc, j) =>
            pc.w ? (
              <span
                key={j}
                data-w={pc.w.i}
                className={[
                  "reader-word",
                  base ? "cursor-pointer" : "",
                  marks.get(pc.w.i)?.bold ? "reader-word--bold" : "",
                  marks.get(pc.w.i)?.italic ? "reader-word--italic" : "",
                  marks.get(pc.w.i)?.highlight ? "reader-word--highlight" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
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
  book,
  prefs,
  setPrefs,
  onBack,
  autoplay,
  onProgress,
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
  const [annotations, setAnnotations] = useState<Annotation[]>(() => book.annotations || []);
  const [notesOpen, setNotesOpen] = useState(false);
  const [commentSignal, setCommentSignal] = useState(0);
  const [anchor, setAnchor] = useState<TextAnchor | null>(null);
  const [drawingMode, setDrawingMode] = useState<"draw" | "sketch" | null>(null);
  const [diagramOpen, setDiagramOpen] = useState(false);
  const [annotationError, setAnnotationError] = useState<string | null>(null);
  const marks = useMemo<WordMarks>(() => {
    const result: WordMarks = new Map();
    for (const note of annotations) {
      if (note.kind !== "bold" && note.kind !== "italic" && note.kind !== "highlight") continue;
      if (!Number.isInteger(note.start) || !Number.isInteger(note.end)) continue;
      const first = Math.max(0, note.start as number);
      const last = Math.min(doc.tokens.length - 1, first + 499, note.end as number);
      for (let i = first; i <= last; i++) {
        const current = result.get(i) || { bold: false, italic: false, highlight: false };
        current[note.kind] = true;
        result.set(i, current);
      }
    }
    return result;
  }, [annotations, doc.tokens.length]);

  useEffect(() => {
    clock.rate = prefs.rate;
  }, [clock, prefs.rate]);

  const play = useCallback(() => {
    if (!doc.tokens.length) return;
    if (clock.t >= doc.total - 0.01) clock.seek(0);
    clock.play();
    setPlaying(true);
  }, [clock, doc.total, doc.tokens.length]);
  const pause = useCallback(() => {
    clock.pause();
    setPlaying(false);
  }, [clock]);

  const saveProgress = useCallback(() => {
    if (book.id && doc.tokens.length) onProgress(book.id, indexAt(doc.tokens, clock.now()));
  }, [book.id, clock, doc.tokens, onProgress]);

  // Keep text above the actual controls, including expanded settings and larger fonts.
  useEffect(() => {
    const controls = controlsRef.current;
    const scroller = scrollerRef.current;
    if (!controls || !scroller) return;
    const resize = () => {
      scroller.style.bottom = `${controls.getBoundingClientRect().height}px`;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(controls);
    resize();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const start = book.progress ? (doc.tokens[book.progress]?.start ?? 0) : 0;
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
        else {
          clock.pause();
          setPlaying(false);
        }
      }
      if (book.id && doc.tokens.length && clock.playing && performance.now() - lastSave > 3000) {
        lastSave = performance.now();
        onProgress(book.id, indexAt(doc.tokens, now));
      }
    }, 120);
    const onVis = () => {
      if (document.hidden) {
        clock.pause();
        setPlaying(false);
        saveProgress();
      }
    };
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
  const captureSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) return;
    const wordIndex = (node: Node | null) => {
      const element = node instanceof HTMLElement ? node : node?.parentElement;
      const word = element?.closest<HTMLElement>("[data-w]");
      return word ? Number(word.dataset.w) : NaN;
    };
    const a = wordIndex(selection.anchorNode);
    const b = wordIndex(selection.focusNode);
    if (!Number.isInteger(a) || !Number.isInteger(b)) return;
    const first = Math.min(a, b);
    const last = Math.min(doc.tokens.length - 1, first + 499, Math.max(a, b));
    setAnchor({
      start: first,
      end: last,
      quote: doc.tokens
        .slice(first, last + 1)
        .map((w) => w.text)
        .join(" ")
        .slice(0, 350),
    });
  };
  const currentAnchor = (): TextAnchor => {
    const current = doc.tokens[Math.max(0, indexAt(doc.tokens, clock.now()))];
    return anchor || { start: current?.i || 0, end: current?.i || 0, quote: current?.text || "" };
  };
  const persist = async (next: Annotation[]) => {
    if (next.length > 200) throw new Error("This book has reached its annotation limit.");
    const previous = annotations;
    setAnnotations(next);
    setAnnotationError(null);
    try {
      if (book.id) await updateBookAnnotations(book.id, next);
    } catch (error) {
      setAnnotations(previous);
      setAnnotationError(error instanceof Error ? error.message : "Could not save annotations.");
      throw error;
    }
  };
  const addAnnotation = async (kind: Annotation["kind"], text?: string, image?: string) => {
    if (kind === "drawing" && image && image.length > 600_000)
      throw new Error("This drawing is too large to save.");
    const at = currentAnchor();
    const note: Annotation = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      kind,
      start: at.start,
      end: at.end,
      quote: at.quote,
      ...(text ? { text } : {}),
      ...(image ? { image } : {}),
    };
    await persist([...annotations, note]);
  };
  const mark = (kind: "bold" | "italic" | "highlight") => void addAnnotation(kind).catch(() => {});
  const eraseMarks = () => {
    const at = currentAnchor();
    void persist(
      annotations.filter((n) => {
        if (n.kind !== "bold" && n.kind !== "italic" && n.kind !== "highlight") return true;
        if (n.start === undefined || n.end === undefined) return true;
        return n.end < at.start || n.start > at.end;
      }),
    ).catch(() => {});
  };
  const jumpTo = (tokenIndex: number) => {
    const target = boxRef.current?.querySelector<HTMLElement>(
      '[data-base] [data-w="' + tokenIndex + '"]',
    );
    target?.scrollIntoView({ behavior: prefs.reduceMotion ? "auto" : "smooth", block: "center" });
    const word = doc.tokens[tokenIndex];
    if (word) {
      clock.seek(word.start);
      setT(clock.t);
    }
    setNotesOpen(false);
  };
  const onTextClick = (e: React.MouseEvent) => {
    if (window.getSelection()?.toString().trim()) {
      captureSelection();
      return;
    }
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
    <div className="page-in katha-reader-screen fixed inset-0 overflow-hidden">
      <div className="absolute inset-0">
        <Scene
          theme={prefs.theme}
          mode={prefs.mode}
          intensity={prefs.intensity}
          reduce={prefs.reduceMotion}
        />
      </div>

      <div className="katha-reader-shade pointer-events-none absolute inset-0" />
      <header className="katha-reader-header absolute inset-x-0 top-0 z-20 flex items-center gap-3 px-4 pt-4">
        <button
          onClick={onBack}
          aria-label="Back to library"
          className="glass btn-quiet grid h-10 w-10 place-items-center rounded-full"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="glass min-w-0 flex-1 rounded-full px-4 py-2">
          <div className="kicker text-[0.58rem] text-muted-foreground">Katha</div>
          <div className="truncate font-display text-base leading-tight">{book.title}</div>
        </div>
        <button
          className="katha-reader-notes-button"
          onClick={() => setNotesOpen(!notesOpen)}
          
          aria-expanded={notesOpen}
        >
          Parallel notes · {annotations.length}
        </button>
      </header>

      <div
        ref={scrollerRef}
        tabIndex={0}
        role="region"
        aria-label="Reading passage"
        className="katha-reader-scroll absolute inset-0 z-10 overflow-y-auto overscroll-contain px-3 pb-8 pt-24"
      >
        <article
          className="ink-panel katha-reading-page mx-auto max-w-[46rem] rounded-[1.75rem] [overflow-wrap:anywhere] px-6 py-8 sm:px-10 sm:py-12"
          style={{ ["--fs" as string]: prefs.fontScale }}
        >
          {book.demo && (
            <p className="kicker mb-6 text-primary">
              Silent demo · no real audio · tap any sentence
            </p>
          )}
          <div className="katha-reading-page-heading">
            <span>YOUR LIVING BOOK</span>
            <h1>{book.title}</h1>
            <div className="katha-page-ornament" aria-hidden="true">
              ✦
            </div>
          </div>
          <div ref={boxRef} className="reader-text relative">
            <div
              data-base
              onClick={onTextClick}
              onMouseUp={captureSelection}
              onTouchEnd={captureSelection}
              className="relative z-[1]"
            >
              <Paras doc={doc} base marks={marks} />
            </div>
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
            <div
              ref={litRef}
              aria-hidden
              className="lit-layer pointer-events-none absolute inset-0 z-[2]"
              style={{ opacity: 0 }}
            >
              <Paras doc={doc} base={false} marks={marks} />
            </div>
          </div>
        </article>
        <p className="katha-reading-help">
          Select a passage to mark it, then use the tools below. Notes and sketches are saved
          alongside your book.
        </p>
      </div>

      <ParallelNotes
        notes={annotations}
        visible={notesOpen}
        onClose={() => setNotesOpen(false)}
        commentSignal={commentSignal}
        anchor={anchor}
        onJump={jumpTo}
        onAdd={addAnnotation}
        onRemove={async (id) => {
          try {
            await persist(annotations.filter((note) => note.id !== id));
          } catch {
            /* the error banner explains why it failed */
          }
        }}
      />
      <div
        ref={controlsRef}
        className="absolute inset-x-0 bottom-0 z-20 max-h-[calc(100dvh-5rem)] overflow-y-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <AnnotationToolbar
          selection={anchor}
          onStyle={mark}
          onErase={eraseMarks}
          onComment={() => {
            setNotesOpen(true);
            setCommentSignal((n) => n + 1);
          }}
          onSketch={(mode) => setDrawingMode(mode)}
          onDiagram={() => setDiagramOpen(true)}
          onNotes={() => setNotesOpen((s) => !s)}
        />
        {annotationError && (
          <p role="alert" className="katha-annotation-error">
            {annotationError}
          </p>
        )}
        <div className="ink-panel katha-player-panel mx-auto max-w-[46rem] rounded-[1.5rem] p-3">
          {panel && (
            <div className="rise-in mb-3 space-y-4 border-b border-border px-1 pb-4 text-sm">
              <Row label="World">
                {(Object.keys(THEMES) as ThemeId[]).map((id) => (
                  <Chip key={id} on={prefs.theme === id} onClick={() => set({ theme: id })}>
                    {THEMES[id].name}
                  </Chip>
                ))}
              </Row>
              <Row label="Light">
                <Chip on={prefs.mode === "dark"} onClick={() => set({ mode: "dark" })}>
                  Night
                </Chip>
                <Chip on={prefs.mode === "light"} onClick={() => set({ mode: "light" })}>
                  Day
                </Chip>
              </Row>
              <Row label="Text">
                <button
                  aria-label="Smaller text"
                  className="btn-quiet grid h-8 w-8 place-items-center rounded-full"
                  onClick={() =>
                    set({ fontScale: Math.max(0.85, +(prefs.fontScale - 0.1).toFixed(2)) })
                  }
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-12 text-center tabular-nums">
                  {Math.round(prefs.fontScale * 100)}%
                </span>
                <button
                  aria-label="Larger text"
                  className="btn-quiet grid h-8 w-8 place-items-center rounded-full"
                  onClick={() =>
                    set({ fontScale: Math.min(1.6, +(prefs.fontScale + 0.1).toFixed(2)) })
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </Row>
              <Row label="Pace">
                {[0.75, 1, 1.25, 1.5].map((r) => (
                  <Chip key={r} on={prefs.rate === r} onClick={() => set({ rate: r })}>
                    {r}×
                  </Chip>
                ))}
              </Row>
              <Row label="Motion">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={prefs.intensity}
                  onChange={(e) => set({ intensity: +e.target.value })}
                  className="flex-1"
                  aria-label="Motion intensity"
                />
              </Row>
              <Row label="Calm">
                <Chip
                  on={prefs.reduceMotion}
                  onClick={() => set({ reduceMotion: !prefs.reduceMotion })}
                >
                  {prefs.reduceMotion ? "Reduced motion on" : "Reduce motion"}
                </Chip>
              </Row>
              <p className="text-xs text-muted-foreground">
                Neural voice: not connected. Playback is a silent timed preview.
              </p>
            </div>
          )}
          <div className="flex items-center gap-2 px-1">
            <span className="w-9 text-[0.7rem] tabular-nums text-muted-foreground">{fmt(t)}</span>
            <input
              type="range"
              min={0}
              max={1000}
              value={Math.min(1000, (t / doc.total) * 1000) || 0}
              onChange={(e) => {
                clock.seek((+e.target.value / 1000) * doc.total);
                setT(clock.t);
              }}
              className="h-1 flex-1"
              aria-label="Seek"
            />
            <span className="w-9 text-right text-[0.7rem] tabular-nums text-muted-foreground">
              {fmt(doc.total / prefs.rate)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <button
              aria-label="Reading settings"
              onClick={() => setPanel(!panel)}
              className={`grid h-10 w-10 place-items-center rounded-full ${panel ? "chip-on" : "btn-quiet"}`}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              <button
                aria-label="Previous sentence"
                onClick={() => goSentence(-1)}
                className="btn-quiet grid h-10 w-10 place-items-center rounded-full"
              >
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                aria-label={playing ? "Pause" : "Play silent preview"}
                onClick={playing ? pause : play}
                className="btn-ember grid h-14 w-14 place-items-center rounded-full"
              >
                {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
              </button>
              <button
                aria-label="Next sentence"
                onClick={() => goSentence(1)}
                className="btn-quiet grid h-10 w-10 place-items-center rounded-full"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </div>
            <button
              aria-label="Repeat"
              aria-pressed={repeat}
              onClick={() => setRepeat(!repeat)}
              className={`grid h-10 w-10 place-items-center rounded-full ${repeat ? "chip-on" : "btn-quiet"}`}
            >
              <Repeat className="h-4 w-4" />
            </button>
          </div>
          <p className="kicker mt-2 text-center text-[0.55rem] text-muted-foreground">
            Silent preview · no audio
          </p>
        </div>
      </div>
      {drawingMode && (
        <DrawingPad
          mode={drawingMode}
          onClose={() => setDrawingMode(null)}
          onSave={async (image) => {
            await addAnnotation("drawing", undefined, image);
            setDrawingMode(null);
          }}
        />
      )}
      {diagramOpen && (
        <DiagramPad
          onClose={() => setDiagramOpen(false)}
          onSave={async (flow) => {
            await addAnnotation("diagram", flow);
            setDiagramOpen(false);
          }}
        />
      )}
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

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full px-3 py-1.5 text-xs font-medium ${on ? "chip-on" : "btn-quiet"}`}
    >
      {children}
    </button>
  );
}
