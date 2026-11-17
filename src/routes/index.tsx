import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Library } from "@/components/library/Library";
import { Reader, type ReaderBook } from "@/components/reader/Reader";
import { DEMO_TEXT, DEMO_TITLE } from "@/lib/demo";
import { DEFAULT_PREFS, deleteBook, listBooks, loadPrefs, saveBook, savePrefs, updateProgress, type Book, type Prefs } from "@/lib/storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Katha — Living Reader" },
      { name: "description", content: "A living reader: text flows beneath a ribbon of warm light inside hand-painted lotus and sakura worlds." },
      { property: "og:title", content: "Katha — Living Reader" },
      { property: "og:description", content: "Read inside moving paintings, guided by a continuous ribbon of light." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

function App() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<{ book: ReaderBook; autoplay: boolean } | null>(null);

  const refresh = useCallback(async () => {
    try {
      setBooks(await listBooks());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read your shelf.");
    }
  }, []);

  useEffect(() => {
    setPrefs(loadPrefs());
    setReady(true);
    void refresh();
  }, [refresh]);
  useEffect(() => { if (ready) savePrefs(prefs); }, [prefs, ready]);

  const onProgress = useCallback((id: string, idx: number) => {
    updateProgress(id, idx).catch(() => setError("Could not save reading progress."));
  }, []);

  return (
    <div data-mode={prefs.mode} className="min-h-screen bg-background text-foreground">
      {open ? (
        <Reader
          key={open.book.id ?? "demo"}
          book={open.book}
          autoplay={open.autoplay}
          prefs={prefs}
          setPrefs={setPrefs}
          onProgress={onProgress}
          onBack={() => { setOpen(null); void refresh(); }}
        />
      ) : (
        <Library
          prefs={prefs}
          setPrefs={setPrefs}
          books={books}
          error={error}
          onDemo={() => setOpen({ book: { title: DEMO_TITLE, text: DEMO_TEXT, demo: true }, autoplay: true })}
          onOpen={(b) => setOpen({ book: b, autoplay: false })}
          onDelete={async (id) => {
            try { await deleteBook(id); await refresh(); } catch { setError("Could not delete that text."); }
          }}
          onSave={async (title, text) => {
            await saveBook({ id: `${Date.now().toString(36)}-${Math.floor(performance.now())}`, title, text, createdAt: Date.now(), progress: 0 });
            await refresh();
          }}
        />
      )}
    </div>
  );
}