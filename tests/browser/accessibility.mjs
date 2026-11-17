import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const origin = process.env.KATHA_TEST_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const result = [];
const failures = [];
try {
  for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Open sample reading/ }).waitFor();
    for (const state of ["library", "add-book", "reader", "reader-settings", "reader-notes"]) {
      if (state === "add-book") await page.getByRole("button", { name: "Add text" }).click();
      if (state === "reader") {
        await page.getByRole("button", { name: /Open sample reading/ }).click();
        await page.getByRole("button", { name: "Back to library" }).waitFor();
      }
      if (state === "reader-notes") {
        await page.getByRole("button", { name: /Parallel notes/ }).click();
      }
      if (state === "reader-settings") {
        await page.getByRole("button", { name: "Reading settings" }).click();
      }
      const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const serious = scan.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
      result.push({ viewport, state, violationCount: scan.violations.length,
        serious: serious.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target) })) });
      if (serious.length) failures.push({ viewport, state, serious });
      if (state === "add-book") await page.getByRole("dialog", { name: "Add a book" }).getByRole("button", { name: "Close" }).click();
    }
    await context.close();
  }
} finally {
  await browser.close();
}
assert.deepEqual(failures, [], "serious accessibility findings across Katha states");
console.log(JSON.stringify({ scanned: result.length, results: result }, null, 2));
