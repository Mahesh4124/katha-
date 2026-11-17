export type ThemeId = "lotus" | "sakura";
export type Mode = "dark" | "light";
export type Annotation = {
  id: string;
  kind: "bold" | "italic" | "highlight" | "comment" | "drawing" | "diagram";
  start?: number;
  end?: number;
  quote?: string;
  text?: string;
  image?: string;
};
export type Book = {
  id: string;
  title: string;
  text: string;
  createdAt: number;
  progress: number;
  coverImage?: string;
  annotations?: Annotation[];
};
export type Prefs = {
  theme: ThemeId;
  mode: Mode;
  fontScale: number;
  intensity: number;
  reduceMotion: boolean;
  rate: number;
};

export const DEFAULT_PREFS: Prefs = {
  theme: "lotus",
  mode: "dark",
  fontScale: 1,
  intensity: 0.7,
  reduceMotion: false,
  rate: 1,
};

const PREFS_KEY = "katha.prefs.v1";

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      return { ...DEFAULT_PREFS, reduceMotion: reduce };
    }
    return sanitizePrefs(JSON.parse(raw));
  } catch {
    return DEFAULT_PREFS;
  }
}

const RATES = [0.75, 1, 1.25, 1.5];
const num = (v: unknown, min: number, max: number, d: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;

/** Accepts only known values so tampered/corrupt localStorage can never break rendering or timing. */
export function sanitizePrefs(raw: unknown): Prefs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    theme: r.theme === "sakura" || r.theme === "lotus" ? r.theme : DEFAULT_PREFS.theme,
    mode: r.mode === "light" || r.mode === "dark" ? r.mode : DEFAULT_PREFS.mode,
    fontScale: num(r.fontScale, 0.85, 1.6, DEFAULT_PREFS.fontScale),
    intensity: num(r.intensity, 0, 1, DEFAULT_PREFS.intensity),
    reduceMotion: typeof r.reduceMotion === "boolean" ? r.reduceMotion : DEFAULT_PREFS.reduceMotion,
    rate: RATES.includes(r.rate as number) ? (r.rate as number) : DEFAULT_PREFS.rate,
  };
}

/** Maximum stored text length (characters), shared by paste and TXT import. */
export const MAX_TEXT_CHARS = 3_000_000;

export function isValidBook(b: unknown): b is Book {
  const x = b as Book;
  return (
    !!x &&
    typeof x.id === "string" &&
    typeof x.title === "string" &&
    typeof x.text === "string" &&
    typeof x.createdAt === "number" &&
    typeof x.progress === "number"
  );
}

export function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* storage full or blocked: preferences just won't persist */
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined")
      return reject(new Error("This browser has no on-device storage (IndexedDB)."));
    const req = indexedDB.open("katha", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("books", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error("Could not open on-device library storage."));
  });
}

async function tx<T>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction("books", mode);
    const req = fn(t.objectStore("books"));
    t.oncomplete = () => {
      db.close();
      resolve(req.result);
    };
    t.onabort = t.onerror = () => {
      db.close();
      reject(new Error(t.error?.message || req.error?.message || "Storage transaction failed."));
    };
  });
}

export async function listBooks(): Promise<Book[]> {
  const all = await tx<Book[]>("readonly", (s) => s.getAll() as IDBRequest<Book[]>);
  // Skip malformed records instead of crashing the shelf; they are left untouched in storage.
  return all.filter(isValidBook).sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveBook(b: Book) {
  await tx("readwrite", (s) => s.put(b));
}

export async function deleteBook(id: string) {
  await tx("readwrite", (s) => s.delete(id));
}

export async function updateProgress(id: string, progress: number) {
  await tx<Book | undefined>("readwrite", (s) => {
    const req = s.get(id) as IDBRequest<Book | undefined>;
    req.onsuccess = () => {
      const book = req.result;
      if (book) s.put({ ...book, progress });
    };
    return req;
  });
}

/** Keep custom covers and reader notes in the same transaction-safe book record. */
export async function updateBookCover(id: string, coverImage?: string) {
  if (coverImage && (!/^data:image\\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(coverImage) || coverImage.length > 2_500_000))
    throw new Error("Only optimized JPEG, PNG or WebP covers can be saved.");
  await tx<Book | undefined>("readwrite", (store) => {
    const req = store.get(id) as IDBRequest<Book | undefined>;
    req.onsuccess = () => {
      if (req.result) store.put({ ...req.result, coverImage });
    };
    return req;
  });
}

export async function updateBookAnnotations(id: string, annotations: Annotation[]) {
  if (annotations.length > 200) throw new Error("This book has reached its 200 annotation limit.");
  await tx<Book | undefined>("readwrite", (store) => {
    const req = store.get(id) as IDBRequest<Book | undefined>;
    req.onsuccess = () => {
      if (req.result) store.put({ ...req.result, annotations });
    };
    return req;
  });
}
