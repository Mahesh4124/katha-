import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Library } from "@/components/library/Library";
import { Reader } from "@/components/reader/Reader";
import { DEFAULT_PREFS, listBooks, loadPrefs, MAX_TEXT_CHARS, sanitizePrefs } from "@/lib/storage";

// INERT mock "threat" strings: plain data only, never executed.
const FAKE_PAYLOAD = [
  "<script>window.__pwned = 1</script>",
  '<img src=x onerror="window.__pwned=1">',
  "javascript:window.__pwned=1",
  "https://evil.example.invalid/login?steal=1",
  "प्राणः <svg onload=window.__pwned=1> ॥",
].join("\n\n");

beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  (window as unknown as Record<string, unknown>).__pwned = undefined;
  localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe("corrupt or tampered storage fails safely", () => {
  it("rejects unknown theme/mode and non-finite or out-of-range numbers", () => {
    const p = sanitizePrefs({
      theme: "<script>",
      mode: 5,
      fontScale: Infinity,
      intensity: "x",
      rate: 0,
      reduceMotion: "yes",
    });
    expect(p).toEqual({ ...DEFAULT_PREFS });
    expect(sanitizePrefs({ fontScale: 0.1, intensity: 7, rate: 1.5 })).toMatchObject({
      fontScale: 0.85,
      intensity: 1,
      rate: 1.5,
    });
  });
  it("invalid JSON in localStorage falls back to defaults", () => {
    localStorage.setItem("katha.prefs.v1", "{not json");
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
    localStorage.setItem("katha.prefs.v1", "null");
    expect(loadPrefs().theme).toBe("lotus");
  });
  it("malformed book records are skipped, valid ones kept", async () => {
    await new Promise<void>((res) => {
      const r = indexedDB.open("katha", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("books", { keyPath: "id" });
      r.onsuccess = () => {
        const t = r.result.transaction("books", "readwrite");
        t.objectStore("books").put({ id: "bad", title: 3 });
        t.objectStore("books").put({
          id: "ok",
          title: "T",
          text: "a b",
          createdAt: 1,
          progress: 0,
        });
        t.oncomplete = () => {
          r.result.close();
          res();
        };
      };
    });
    expect((await listBooks()).map((b) => b.id)).toEqual(["ok"]);
  });
});

describe("mock threat text is rendered as inert text", () => {
  it("reader shows script-looking text literally, creates no elements, links or network calls", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const openSpy = vi.fn();
    vi.stubGlobal("open", openSpy);
    const { container } = render(
      <Reader
        book={{ id: "t", title: "invoice<script>.txt", text: FAKE_PAYLOAD }}
        prefs={DEFAULT_PREFS}
        setPrefs={() => {}}
        onBack={() => {}}
        autoplay={false}
        onProgress={() => {}}
      />,
    );
    expect(container.querySelector("script, img, svg[onload], a[href^='javascript']")).toBeNull();
    expect(container.querySelector("[onerror],[onload]")).toBeNull();
    expect(container.textContent).toContain("<script>window.__pwned");
    expect(container.querySelector("a[href*='evil']")).toBeNull();
    expect((window as unknown as Record<string, unknown>).__pwned).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("oversize paste is refused with a message, not saved", async () => {
    const onSave = vi.fn(async () => {});
    render(
      <Library
        prefs={{ ...DEFAULT_PREFS, reduceMotion: true }}
        setPrefs={() => {}}
        books={[]}
        error={null}
        onDemo={() => {}}
        onOpen={() => {}}
        onDelete={() => {}}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByText("Add text"));
    fireEvent.change(screen.getByPlaceholderText(/Paste a passage/), {
      target: { value: "a".repeat(MAX_TEXT_CHARS + 1) },
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Save"));
    });
    expect(screen.getByRole("alert").textContent).toMatch(/too long/);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("suspicious non-text upload (fake .exe / .pdf) is rejected without reading", async () => {
    render(
      <Library
        prefs={{ ...DEFAULT_PREFS, reduceMotion: true }}
        setPrefs={() => {}}
        books={[]}
        error={null}
        onDemo={() => {}}
        onOpen={() => {}}
        onDelete={() => {}}
        onSave={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Add text"));
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    const exe = new File(["MZ fake inert bytes"], "free-gift.txt.exe", {
      type: "application/x-msdownload",
    });
    const textSpy = vi.fn(async () => "");
    Object.defineProperty(exe, "text", { value: textSpy });
    fireEvent.change(input, { target: { files: [exe] } });
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/Only plain .txt/));
    expect(textSpy).not.toHaveBeenCalled();
  });
});