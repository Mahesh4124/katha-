import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const origin = process.env.KATHA_TEST_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const result = [];
try {
  for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Open sample reading" }).waitFor();
    for (const state of ["library", "reader", "reader-settings"]) {
      if (state === "reader") {
        await page.getByRole("button", { name: "Open sample reading" }).click();
        await page.getByRole("button", { name: "Back to library" }).waitFor();
      }
      if (state === "reader-settings") {
        await page.getByRole("button", { name: "Reading settings" }).click();
      }
      const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const serious = scan.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
      result.push({ viewport, state, violationCount: scan.violations.length,
        serious: serious.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target) })) });
      assert.equal(serious.length, 0, "serious accessibility findings: " + JSON.stringify(serious));
    }
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify({ scanned: result.length, results: result }, null, 2));
