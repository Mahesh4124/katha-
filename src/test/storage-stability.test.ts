import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteBook, listBooks, saveBook, updateProgress, type Book } from "@/lib/storage";

const book: Book = { id: "qa", title: "QA", text: "First sentence. Second sentence.", createdAt: 1, progress: 0 };
beforeEach(() => { vi.stubGlobal("indexedDB", new IDBFactory()); });

describe("Durable device-only progress", () => {
  it("reports an abort after request success rather than a false saved result", async () => {
    const put = IDBObjectStore.prototype.put;
    const spy = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function(this: IDBObjectStore, ...args: Parameters<typeof put>) {
      const request = put.apply(this, args);
      request.addEventListener("success", () => this.transaction.abort());
      return request;
    });
    try { await expect(saveBook(book)).rejects.toThrow("Storage transaction failed."); }
    finally { spy.mockRestore(); }
    expect(await listBooks()).toEqual([]);
  });

  it("preserves the latest requested progress, including a deliberate backward seek", async () => {
    await saveBook(book);
    await Promise.all([updateProgress("qa", 12), updateProgress("qa", 3), updateProgress("qa", 7)]);
    expect((await listBooks())[0]).toEqual({ ...book, progress: 7 });
  });

  it("does not resurrect a book deleted during progress saving", async () => {
    await saveBook(book);
    await Promise.all([updateProgress("qa", 2), deleteBook("qa"), updateProgress("qa", 4)]);
    expect(await listBooks()).toEqual([]);
  });
});