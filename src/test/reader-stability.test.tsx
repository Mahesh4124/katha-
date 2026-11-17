import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Reader } from "@/components/reader/Reader";
import { buildDoc, indexAt } from "@/components/reader/text";
import { DEFAULT_PREFS } from "@/lib/storage";

vi.mock("@/components/scenes/Scene", () => ({ Scene: () => null, THEMES: {} }));
vi.mock("@/components/reader/FlowingLightRibbon", () => ({ FlowingLightRibbon: () => null }));

describe("Reader edge cases", () => {
  it("handles an empty document without playback, sentence exceptions or phantom progress", () => {
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    const progress = vi.fn();
    const doc = buildDoc(" \n\n ");
    expect(doc.tokens).toHaveLength(0);
    expect(doc.sentenceStarts).toHaveLength(0);
    expect(indexAt(doc.tokens, 10)).toBe(-1);
    const reader = render(<Reader book={{ id: "empty", title: "Empty", text: " " }} prefs={DEFAULT_PREFS} setPrefs={() => {}} onBack={() => {}} autoplay={false} onProgress={progress} />);
    fireEvent.click(screen.getByRole("button", { name: "Next sentence" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous sentence" }));
    fireEvent.click(screen.getByRole("button", { name: "Play silent preview" }));
    expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
    act(() => reader.unmount());
    expect(progress).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("gives punctuation-only imports valid tokens and sentence starts", () => {
    const doc = buildDoc("... !!! । ॥");
    expect(doc.tokens.map(t => t.text)).toEqual(["...", "!!!", "।", "॥"]);
    expect(doc.sentenceStarts).toEqual([0, 1, 2, 3]);
    expect(indexAt(doc.tokens, doc.total)).toBe(3);
    expect(doc.total).toBeGreaterThan(0);
  });
});