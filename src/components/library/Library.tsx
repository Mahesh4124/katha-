import { useRef, useState } from "react";
import { Moon, Sun, Plus, Trash2, Upload, X, Sparkles } from "lucide-react";
import { Scene, THEMES } from "@/components/scenes/Scene";
import { MAX_TEXT_CHARS, type Book, type Prefs, type ThemeId } from "@/lib/storage";

type Props = {
  prefs: Prefs;
  setPrefs: (p: Prefs) => void;
  books: Book[];
  error: string | null;
  onDemo: () => void;
  onOpen: (b: Book) => void;
  onDelete: (id: string) => void;
  onSave: (title: string, text: string) => Promise<void>;
};

export function Library({
  prefs,
  setPrefs,
  books,
  error,
  onDemo,
  onOpen,
  onDelete,
  onSave,
}: Props) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="page-in relative min-h-screen">
      <div className="fixed inset-0">
        <Scene
          theme={prefs.theme}
          mode={prefs.mode}
          intensity={prefs.intensity}
          reduce={prefs.reduceMotion}
        />
        <div className="veil absolute inset-0" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[40rem] flex-col px-6 pb-16">
        <header className="flex items-center justify-between pt-6">
          <span className="kicker text-foreground">Katha</span>
          <button
            onClick={() => setPrefs({ ...prefs, mode: prefs.mode === "dark" ? "light" : "dark" })}
            aria-label="Toggle day or night"
            className="glass btn-quiet grid h-10 w-10 place-items-center rounded-full"
          >
            {prefs.mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </header>

        <section className="mt-[30vh] rise-in">
          <p className="kicker text-muted-foreground">A living reader</p>
          <h1 className="mt-3 font-display text-[2.7rem] font-medium leading-[1.02] sm:text-6xl">
            Read by the light <em className="font-normal">of a moving page.</em>
          </h1>
          <p className="mt-4 max-w-sm font-read text-[1.02rem] leading-relaxed text-muted-foreground">
            Words warm beneath a ribbon of light while a painted world breathes quietly around them.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              onClick={onDemo}
              className="btn-ember inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold"
            >
              <Sparkles className="h-4 w-4" /> Try the ribbon
            </button>
            <span className="text-xs text-muted-foreground">Silent demo · no real audio</span>
          </div>
        </section>

        <section className="mt-14 rise-in" style={{ animationDelay: "0.15s" }}>
          <h2 className="kicker text-muted-foreground">Worlds</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(Object.keys(THEMES) as ThemeId[]).map((id) => {
              const on = prefs.theme === id;
              return (
                <button
                  key={id}
                  onClick={() => setPrefs({ ...prefs, theme: id })}
                  aria-pressed={on}
                  className={`group overflow-hidden rounded-[1.25rem] text-left transition-transform active:scale-[0.98] ${on ? "ring-2 ring-primary" : "ring-1 ring-border"}`}
                >
                  <div className="h-36">
                    <Scene
                      theme={id}
                      mode={prefs.mode}
                      intensity={prefs.intensity}
                      reduce={prefs.reduceMotion}
                      mini
                    />
                  </div>
                  <div className="glass border-0 px-3 py-2.5">
                    <div className="font-display text-lg leading-tight">{THEMES[id].name}</div>
                    <div className="text-[0.7rem] text-muted-foreground">{THEMES[id].line}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-12 rise-in" style={{ animationDelay: "0.25s" }}>
          <div className="flex items-center justify-between">
            <h2 className="kicker text-muted-foreground">Your shelf</h2>
            <button
              onClick={() => setAdding(true)}
              className="glass btn-quiet inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" /> Add text
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {books.length === 0 && (
              <li className="py-6 font-read italic text-muted-foreground">
                The shelf is empty. Paste a passage or open a .txt file — it stays on this device.
              </li>
            )}
            {books.map((b) => {
              const words = b.text.split(/\s+/).filter(Boolean).length;
              const pct = Math.min(100, Math.round((b.progress / Math.max(1, words - 1)) * 100));
              return (
                <li key={b.id} className="flex items-center gap-3 py-4">
                  <button onClick={() => onOpen(b)} className="min-w-0 flex-1 text-left">
                    <div className="truncate font-display text-xl leading-tight">{b.title}</div>
                    <div className="mt-1.5 flex items-center gap-3 text-[0.7rem] text-muted-foreground">
                      <span>{words.toLocaleString()} words</span>
                      <span className="h-px flex-1 bg-border">
                        <span className="block h-px bg-primary" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="tabular-nums">{pct}%</span>
                    </div>
                  </button>
                  <button
                    aria-label={`Delete ${b.title}`}
                    onClick={() => onDelete(b.id)}
                    className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-12 rise-in text-sm" style={{ animationDelay: "0.35s" }}>
          <h2 className="kicker text-muted-foreground">What works today</h2>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-2 text-[0.82rem]">
            <dt>Paste text, open .txt</dt>
            <dd className="text-primary">Ready</dd>
            <dt>Saved on this device</dt>
            <dd className="text-primary">Ready</dd>
            <dt>PDF text import</dt>
            <dd className="text-muted-foreground">Coming later</dd>
            <dt>Sanskrit image OCR</dt>
            <dd className="text-muted-foreground">Not available</dd>
            <dt>Neural voice</dt>
            <dd className="text-muted-foreground">Not connected</dd>
          </dl>
        </section>
      </div>

      {adding && (
        <AddSheet
          onClose={() => setAdding(false)}
          onSave={async (t, x) => {
            await onSave(t, x);
            setAdding(false);
          }}
        />
      )}
    </div>
  );
}

function AddSheet({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (title: string, text: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (f: File | undefined) => {
    setErr(null);
    if (!f) return;
    if (/\.pdf$/i.test(f.name) || f.type === "application/pdf")
      return setErr("PDF import is coming later. Please use a .txt file or paste text.");
    if (!/\.txt$/i.test(f.name) && !f.type.startsWith("text/"))
      return setErr("Only plain .txt files are supported right now.");
    if (f.size > 3_000_000) return setErr("That file is over 3 MB. Try a shorter text.");
    try {
      const content = await f.text();
      if (!content.trim()) return setErr("That file appears to be empty.");
      setText(content);
      if (!title) setTitle(f.name.replace(/\.txt$/i, ""));
    } catch {
      setErr("Could not read that file.");
    }
  };

  const save = async () => {
    setErr(null);
    if (!text.trim()) return setErr("Add some text first.");
    if (text.length > MAX_TEXT_CHARS)
      return setErr("That text is too long (over 3 million characters). Try a shorter passage.");
    setBusy(true);
    try {
      await onSave(title.trim() || text.trim().split(/\s+/).slice(0, 5).join(" "), text);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save on this device.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="fade-in absolute inset-0 bg-background/60"
      />
      <div className="sheet-in ink-panel relative w-full max-w-[40rem] rounded-t-[1.75rem] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-2xl">Add to your shelf</h3>
          <button
            aria-label="Close"
            onClick={onClose}
            className="btn-quiet grid h-9 w-9 place-items-center rounded-full"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="mt-4 w-full border-b border-border bg-transparent py-2 font-display text-xl outline-none placeholder:text-muted-foreground"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste a passage, a chapter, a verse…"
          rows={8}
          className="mt-4 w-full resize-none rounded-xl border border-border bg-transparent p-3 font-read text-base leading-relaxed outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        <input
          ref={fileRef}
          type="file"
          accept=".txt,text/plain"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {err && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {err}
          </p>
        )}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="btn-quiet inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm"
          >
            <Upload className="h-4 w-4" /> Open .txt
          </button>
          <span className="text-[0.7rem] text-muted-foreground">PDF · coming later</span>
          <button
            disabled={busy}
            onClick={save}
            className="btn-ember ml-auto rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
