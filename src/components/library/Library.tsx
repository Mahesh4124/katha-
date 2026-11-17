import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Moon,
  Plus,
  Search,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Scene, SCENE_ART, THEMES } from "@/components/scenes/Scene";
import { MAX_TEXT_CHARS, type Book, type Prefs, type ThemeId } from "@/lib/storage";

type Props = {
  prefs: Prefs;
  setPrefs: (p: Prefs) => void;
  books: Book[];
  error: string | null;
  onDemo: () => void;
  onOpen: (b: Book) => void;
  onDelete: (id: string) => void;
  onSave: (title: string, text: string, coverImage?: string) => Promise<void>;
  onCover?: (id: string, coverImage?: string) => Promise<void>;
};

/** Never upload source images. Resize a local JPEG/PNG/WebP before storing it. */
async function prepareCover(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8_000_000)
    throw new Error("Choose a JPEG, PNG or WebP cover under 8 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 660;
    canvas.height = 940;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser cannot prepare this cover.");
    const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    const result = canvas.toDataURL("image/jpeg", 0.8);
    if (result.length > 2_500_000) throw new Error("The optimized cover is too large.");
    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function CoverArt({ book }: { book: Book }) {
  const variants: Array<"lotus" | "sakura"> = ["lotus", "sakura", "lotus", "sakura"];
  const number = Array.from(book.title).reduce((n, c) => n + (c.codePointAt(0) || 0), 0);
  const theme = variants[number % variants.length];
  const background =
    book.coverImage &&
    /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(book.coverImage)
      ? book.coverImage
      : SCENE_ART[theme].light;
  return (
    <>
      <span
        className="katha-cover-photo"
        style={{ backgroundImage: 'url("' + background + '")' }}
      />
      <span className="katha-cover-tint" />
      <span className="katha-cover-ornament" aria-hidden="true">
        ✦
      </span>
      <span className="katha-cover-title">
        <small>KATHA EDITION</small>
        <strong>{book.title}</strong>
        <small>A living reader</small>
      </span>
      <span className="katha-cover-pages" />
    </>
  );
}

export function Library({
  prefs,
  setPrefs,
  books,
  error,
  onDemo,
  onOpen,
  onDelete,
  onSave,
  onCover,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [coverFor, setCoverFor] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(0);
  const touchX = useRef<number | null>(null);
  const shelfRef = useRef<HTMLElement>(null);
  const stylesRef = useRef<HTMLElement>(null);
  const matches = useMemo(
    () => books.filter((b) => b.title.toLowerCase().includes(search.trim().toLowerCase())),
    [books, search],
  );
  useEffect(
    () => setSelected((i) => Math.min(i, Math.max(0, matches.length - 1))),
    [matches.length],
  );
  const activeBook = matches[selected] || null;
  const coverBook = books.find((b) => b.id === coverFor) || null;
  const turn = (delta: number) => {
    if (matches.length > 1) setSelected((i) => (i + delta + matches.length) % matches.length);
  };
  const changeStyles = () =>
    setPrefs({
      ...prefs,
      theme: prefs.theme === "lotus" ? "sakura" : "lotus",
    });
  const scrollTo = (element: HTMLElement | null) =>
    element?.scrollIntoView({ behavior: prefs.reduceMotion ? "instant" : "smooth" });

  return (
    <div className="katha-home relative min-h-screen" data-world={prefs.theme}>
      <div className="fixed inset-0 pointer-events-none">
        <Scene
          theme={prefs.theme}
          mode={prefs.mode}
          intensity={prefs.intensity}
          reduce={prefs.reduceMotion}
        />
      </div>
      <div className="katha-home-shade pointer-events-none fixed inset-0" />
      <main className="katha-home-content relative z-10 mx-auto flex min-h-screen max-w-[1180px] flex-col">
        <header className="katha-main-header">
          <div className="katha-brand" aria-label="Katha, a living reader">
            <span className="katha-lotus-mark" aria-hidden="true">
              ✧
            </span>
            <div>
              <span className="katha-brand-title">Katha</span>
              <span className="katha-brand-line">A living reader</span>
            </div>
          </div>
          <div className="katha-header-actions">
            {searching && (
              <input
                autoFocus
                className="katha-search"
                aria-label="Search your books"
                placeholder="Search your books"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            )}
            <button
              className="katha-round"
              aria-label={searching ? "Close search" : "Search books"}
              onClick={() => {
                setSearching(!searching);
                setSearch("");
              }}
            >
              {searching ? <X size={19} /> : <Search size={19} />}
            </button>
            <button
              className="katha-round"
              aria-label="Toggle day or night"
              onClick={() => setPrefs({ ...prefs, mode: prefs.mode === "dark" ? "light" : "dark" })}
            >
              {prefs.mode === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          </div>
        </header>

        <section className="katha-hero rise-in">
          <span className="katha-overline">A READING SANCTUARY</span>
          <h1>
            Read by the light
            <br />
            of <em>a moving page.</em>
          </h1>
          <p>A book becomes a world. Let its pages unfold around you in light, quiet and motion.</p>
          <div className="katha-hero-buttons">
            <button className="katha-primary-action" onClick={changeStyles}>
              <Sparkles size={17} /> Try different styles <ArrowRight size={18} />
            </button>
            <button
              className="katha-outline-action"
              onClick={() => (activeBook ? setCoverFor(activeBook.id) : setAdding(true))}
            >
              <ImagePlus size={18} /> Add book cover
            </button>
          </div>
        </section>

        <section
          className="katha-world-section rise-in"
          ref={stylesRef}
          aria-label="Reading worlds"
        >
          <div className="katha-section-head">
            <div>
              <span className="katha-overline">CHOOSE YOUR ATMOSPHERE</span>
              <h2>Worlds</h2>
            </div>
            <span className="katha-hint">Two places. Countless stories.</span>
          </div>
          <div className="katha-world-grid">
            {(Object.keys(THEMES) as ThemeId[]).map((id) => (
              <button
                key={id}
                type="button"
                aria-label={THEMES[id].name}
                aria-pressed={prefs.theme === id}
                className={"katha-world-card " + (prefs.theme === id ? "is-current" : "")}
                onClick={() => setPrefs({ ...prefs, theme: id })}
              >
                <span
                  className="katha-world-thumb"
                  style={{ backgroundImage: 'url("' + SCENE_ART[id].light + '")' }}
                />
                <span className="katha-world-meta">
                  <span className="katha-world-icon">{id === "lotus" ? "✿" : "❀"}</span>
                  <span>
                    <strong>{THEMES[id].name}</strong>
                    <small>{THEMES[id].line}</small>
                  </span>
                </span>
                <span className="katha-world-check">
                  {prefs.theme === id ? <Check size={17} /> : <ArrowRight size={17} />}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section ref={shelfRef} className="katha-shelf-section rise-in" aria-label="Your books">
          <div className="katha-section-head">
            <div>
              <span className="katha-overline">PICK UP A STORY</span>
              <h2>Your shelf</h2>
            </div>
            <button className="katha-small-action" onClick={() => setAdding(true)}>
              <Plus size={16} /> Add text
            </button>
          </div>
          {error && (
            <p role="alert" className="katha-form-error">
              {error}
            </p>
          )}
          {search.trim() && !matches.length && (
            <p className="katha-shelf-caption">No books match that search.</p>
          )}
          <div
            className="katha-cover-stage"
            role="region"
            aria-label="Swipe book shelf"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") turn(-1);
              if (e.key === "ArrowRight") turn(1);
            }}
            onTouchStart={(e) => {
              touchX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              const start = touchX.current;
              touchX.current = null;
              if (start !== null) {
                const dx = e.changedTouches[0].clientX - start;
                if (Math.abs(dx) > 42) turn(dx < 0 ? 1 : -1);
              }
            }}
          >
            {!matches.length && !search.trim() ? (
              <button
                className="katha-book-card katha-book-card--sample"
                onClick={onDemo}
                
              >
                <span
                  className="katha-cover-photo"
                  style={{ backgroundImage: 'url("' + SCENE_ART[prefs.theme].light + '")' }}
                />
                <span className="katha-cover-tint" />
                <span className="katha-cover-ornament" aria-hidden="true">
                  ✦
                </span>
                <span className="katha-cover-title">
                  <small>WELCOME TO KATHA</small>
                  <strong>A first light</strong>
                  <small>Open sample reading</small>
                </span>
                <span className="katha-cover-pages" />
              </button>
            ) : (
              matches.map((book, index) => {
                let offset = index - selected;
                if (offset > matches.length / 2) offset -= matches.length;
                if (offset < -matches.length / 2) offset += matches.length;
                const visible = Math.abs(offset) < 3;
                return (
                  <button
                    key={book.id}
                    className={"katha-book-card " + (offset === 0 ? "katha-book-card--active" : "")}
                    style={
                      {
                        transform:
                          "translate(calc(-50% + " +
                          offset * 151 +
                          "px), -50%) rotateY(" +
                          -offset * 13 +
                          "deg) scale(" +
                          Math.max(0.62, 1 - Math.abs(offset) * 0.22) +
                          ")",
                        zIndex: 10 - Math.abs(offset),
                        visibility: visible ? "visible" : "hidden",
                        opacity: visible ? 1 : 0,
                      } as CSSProperties
                    }
                    tabIndex={visible ? 0 : -1}
                    aria-label={(offset === 0 ? "Open " : "Select ") + book.title}
                    onClick={() => (offset === 0 ? onOpen(book) : setSelected(index))}
                  >
                    <CoverArt book={book} />
                  </button>
                );
              })
            )}
          </div>
          <div className="katha-shelf-controls">
            <button
              aria-label="Previous book"
              className="katha-carousel-arrow"
              disabled={matches.length < 2}
              onClick={() => turn(-1)}
            >
              <ChevronLeft size={20} />
            </button>
            <div className="katha-shelf-progress">
              {activeBook ? (
                <>
                  <strong>{activeBook.title}</strong>
                  <span>
                    {selected + 1} / {matches.length} · Swipe to browse · Tap to open
                  </span>
                </>
              ) : (
                <>
                  <strong>Your next chapter begins here</strong>
                  <span>Add a passage or open the sample above.</span>
                </>
              )}
            </div>
            <button
              aria-label="Next book"
              className="katha-carousel-arrow"
              disabled={matches.length < 2}
              onClick={() => turn(1)}
            >
              <ChevronRight size={20} />
            </button>
          </div>
          {activeBook && (
            <div className="katha-selected-actions">
              <button onClick={() => onOpen(activeBook)}>
                <BookOpen size={16} /> Continue reading
              </button>
              <button onClick={() => setCoverFor(activeBook.id)}>
                <ImagePlus size={16} /> Change cover
              </button>
              <button
                aria-label={"Remove " + activeBook.title}
                onClick={() => onDelete(activeBook.id)}
              >
                <Trash2 size={16} /> Remove
              </button>
            </div>
          )}
        </section>

        <section className="katha-discover glass rise-in" aria-label="What you can do">
          <h2>What works today</h2>
          <div className="katha-feature-grid">
            <button onClick={() => (activeBook ? onOpen(activeBook) : onDemo())}>
              <BookOpen size={21} />
              <strong>Continue reading</strong>
              <span>Return to your story</span>
              <ArrowRight size={15} />
            </button>
            <button onClick={() => scrollTo(stylesRef.current)}>
              <Sparkles size={21} />
              <strong>Discover new worlds</strong>
              <span>Find your atmosphere</span>
              <ArrowRight size={15} />
            </button>
            <button onClick={() => setAdding(true)}>
              <ImagePlus size={21} />
              <strong>Create a cover</strong>
              <span>Designed locally by Katha</span>
              <ArrowRight size={15} />
            </button>
          </div>
          <p className="katha-disclosure">
            Silent reading preview · books and notes stay on this device · real narration is not
            connected yet
          </p>
        </section>
        <nav className="katha-bottom-nav" aria-label="Katha navigation">
          <button
            onClick={() =>
              window.scrollTo({ top: 0, behavior: prefs.reduceMotion ? "instant" : "smooth" })
            }
          >
            ⌂ <span>Home</span>
          </button>
          <button onClick={() => scrollTo(shelfRef.current)}>
            <BookOpen size={21} /> <span>Library</span>
          </button>
          <button onClick={() => scrollTo(stylesRef.current)}>
            <Sparkles size={21} /> <span>Worlds</span>
          </button>
          <button onClick={() => setAdding(true)}>
            <Plus size={21} /> <span>New</span>
          </button>
        </nav>
      </main>

      {adding && (
        <AddSheet
          onClose={() => setAdding(false)}
          onSave={async (title, text, cover) => {
            await onSave(title, text, cover);
            setAdding(false);
          }}
        />
      )}
      {coverBook && (
        <CoverSheet
          book={coverBook}
          onClose={() => setCoverFor(null)}
          onSave={async (image) => {
            if (!onCover) throw new Error("Cover editing is unavailable.");
            await onCover(coverBook.id, image);
            setCoverFor(null);
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
  onSave: (title: string, text: string, cover?: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [cover, setCover] = useState<string | undefined>();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const textRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const onTextFile = async (file?: File) => {
    setErr(null);
    if (!file) return;
    if (/\.pdf$/i.test(file.name) || file.type === "application/pdf")
      return setErr("PDF import is coming later. Please use a .txt file or paste text.");
    if (!/\.txt$/i.test(file.name) && !file.type.startsWith("text/"))
      return setErr("Only plain .txt files are supported right now.");
    if (file.size > 3_000_000) return setErr("That file is over 3 MB. Try a shorter text.");
    try {
      const content = await file.text();
      if (!content.trim()) return setErr("That file appears to be empty.");
      setText(content);
      if (!title) setTitle(file.name.replace(/\.txt$/i, ""));
    } catch {
      setErr("Could not read that file.");
    }
  };
  const onCoverFile = async (file?: File) => {
    if (!file) return;
    try {
      setErr(null);
      setCover(await prepareCover(file));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not open this cover.");
    }
  };
  const save = async () => {
    setErr(null);
    if (!text.trim()) return setErr("Add some text first.");
    if (text.length > MAX_TEXT_CHARS)
      return setErr("That text is too long (over 3 million characters). Try a shorter passage.");
    setBusy(true);
    try {
      await onSave(title.trim() || text.trim().split(/\s+/).slice(0, 5).join(" "), text, cover);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save on this device.");
      setBusy(false);
    }
  };
  return (
    <div className="katha-modal-backdrop">
      <button className="katha-modal-scrim" onClick={onClose} aria-label="Close" />
      <section role="dialog" aria-modal="true" aria-label="Add a book" className="katha-modal">
        <div className="katha-modal-head">
          <div>
            <span>YOUR PERSONAL LIBRARY</span>
            <h2>Add a book</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="katha-round">
            <X size={19} />
          </button>
        </div>
        <p>Katha automatically designs a cover from your title. Or add your own image.</p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          aria-label="Book title"
          className="katha-field katha-field--title"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste a passage, a chapter, a verse…"
          rows={6}
          className="katha-field katha-text-area"
        />
        <input
          type="file"
          accept=".txt,text/plain"
          ref={textRef}
          className="hidden"
          onChange={(e) => void onTextFile(e.target.files?.[0])}
        />
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          ref={coverRef}
          className="hidden"
          onChange={(e) => void onCoverFile(e.target.files?.[0])}
        />
        {cover && <img className="katha-cover-preview" src={cover} alt="Your selected cover" />}
        <div className="katha-modal-actions">
          <button className="katha-ghost-button" onClick={() => textRef.current?.click()}>
            <Upload size={16} /> Open .txt
          </button>
          <button className="katha-ghost-button" onClick={() => coverRef.current?.click()}>
            <ImagePlus size={16} /> {cover ? "Change cover" : "Upload cover"}
          </button>
        </div>
        <p className="katha-modal-note">TXT only · 3 MB limit · covers stay on this device</p>
        {err && (
          <p role="alert" className="katha-form-error">
            {err}
          </p>
        )}
        <button
          disabled={busy}
          className="katha-primary-action katha-save-button"
          onClick={() => void save()}
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </section>
    </div>
  );
}

function CoverSheet({
  book,
  onClose,
  onSave,
}: {
  book: Book;
  onClose: () => void;
  onSave: (image?: string) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState(book.coverImage);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await onSave(image);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save cover.");
      setBusy(false);
    }
  };
  return (
    <div className="katha-modal-backdrop">
      <button className="katha-modal-scrim" onClick={onClose} aria-label="Close" />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Change book cover"
        className="katha-modal"
      >
        <div className="katha-modal-head">
          <div>
            <span>COVER STUDIO</span>
            <h2>{book.title}</h2>
          </div>
          <button className="katha-round" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <p>Auto-designed covers use Katha's world art. Upload a personal image to make it yours.</p>
        <div className="katha-cover-sample">
          <CoverArt book={{ ...book, coverImage: image }} />
        </div>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          ref={fileRef}
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              setImage(await prepareCover(f));
              setErr(null);
            } catch (ex) {
              setErr(ex instanceof Error ? ex.message : "Invalid cover.");
            }
          }}
        />
        <div className="katha-modal-actions">
          <button className="katha-ghost-button" onClick={() => fileRef.current?.click()}>
            <ImagePlus size={17} /> Choose image
          </button>
          <button className="katha-ghost-button" onClick={() => setImage(undefined)}>
            <ArrowLeft size={16} /> Auto-design
          </button>
        </div>
        {err && (
          <p role="alert" className="katha-form-error">
            {err}
          </p>
        )}
        <button
          disabled={busy}
          className="katha-primary-action katha-save-button"
          onClick={() => void save()}
        >
          {busy ? "Saving…" : "Save cover"}
        </button>
      </section>
    </div>
  );
}
