import assert from "node:assert/strict";
import { chromium } from "playwright";

const origin = process.env.KATHA_TEST_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }]) {
    // This simulates document visibility events. It does not substitute for Android app-switch testing.
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Try the ribbon" }).click();
    await page.getByRole("button", { name: "Pause" }).waitFor();
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.getByRole("button", { name: "Play silent preview" }).waitFor();
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(550);
    assert.equal(await page.getByRole("button", { name: "Play silent preview" }).count(), 1,
      "narration must not resume when visibility returns without an explicit play");
    assert.deepEqual(errors, [], "visibility event generated runtime exceptions");
    results.push({ viewport, scenario: "simulated visibility change preserves pause", passed: true });
    await context.close();

    // Storage must fail visibly instead of indicating successful persistence.
    const denied = await browser.newContext({ viewport });
    await denied.addInitScript(() => {
      Object.defineProperty(window, "indexedDB", { configurable: true, value: undefined });
    });
    const deniedPage = await denied.newPage();
    const deniedErrors = [];
    deniedPage.on("pageerror", (error) => deniedErrors.push(error.message));
    await deniedPage.goto(origin, { waitUntil: "domcontentloaded" });
    await deniedPage.getByRole("alert").filter({ hasText: "no on-device storage" }).waitFor();
    assert.deepEqual(deniedErrors, [], "missing IndexedDB caused uncaught page errors");
    results.push({ viewport, scenario: "denied storage reports error", passed: true });
    await denied.close();
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify({ result: "PASS", scenarios: results }, null, 2));
