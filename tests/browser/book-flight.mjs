import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.KATHA_TEST_URL || "http://127.0.0.1:4173";
await mkdir("test-results/cinematic", { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 1280]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Try different styles" }).waitFor();
    await page.getByRole("button", { name: "Try different styles" }).click();
    assert.equal(await page.locator("[data-world]").first().getAttribute("data-world"), "sakura");
    await page.waitForTimeout(1250);
    assert.equal(await page.locator(".cinematic-world__photo-frame").first().count(), 1);
    await page.screenshot({ path: "test-results/cinematic/kinetic-sakura-" + width + ".png" });
    await page.getByRole("button", { name: "Add text" }).first().click();
    await page.getByPlaceholder("Title").fill("The River Between Us");
    await page.getByPlaceholder(/Paste a passage/).fill(
      "The lake shone under moonlight. The lotus opened gently, and the mountain answered. प्राणः शान्तिः ॥"
    );
    await page.getByRole("button", { name: "Save", exact: true }).click();
    const book = page.getByRole("button", { name: "Open The River Between Us" });
    await book.waitFor();
    await book.click();
    const flight = page.locator("[data-book-flight='opening']");
    await flight.waitFor({ state: "visible", timeout: 1800 });
    assert.ok(await page.locator(".katha-book-flight__cover").count());
    await page.waitForTimeout(270);
    await page.screenshot({ path: "test-results/cinematic/kinetic-flight-" + width + ".png" });
    await page.getByRole("region", { name: "Reading passage" }).waitFor({ timeout: 6500 });
    assert.equal(await flight.count(), 0, "opening animation must clean up");
    await page.getByRole("toolbar", { name: "Reading annotations" }).waitFor();
    await page.waitForTimeout(900);
    await page.screenshot({ path: "test-results/cinematic/kinetic-reader-" + width + ".png" });
    assert.deepEqual(pageErrors, [], "new transitions must not produce exceptions");
    console.log(width + "px opening transition and scene crossfade: PASS");
    await context.close();

    const reduced = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: "reduce" });
    const rp = await reduced.newPage();
    await rp.goto(base, { waitUntil: "domcontentloaded" });
    await rp.getByRole("button", { name: "Add text" }).first().click();
    await rp.getByPlaceholder("Title").fill("Calm Book");
    await rp.getByPlaceholder(/Paste a passage/).fill("This book respects reduced motion.");
    await rp.getByRole("button", { name: "Save", exact: true }).click();
    await rp.getByRole("button", { name: "Open Calm Book" }).click();
    await rp.getByRole("region", { name: "Reading passage" }).waitFor();
    assert.equal(await rp.locator("[data-book-flight]").count(), 0,
      "reduced-motion users must skip the cover flight");
    console.log(width + "px reduced-motion bypass: PASS");
    await reduced.close();
  }
} finally {
  await browser.close();
}
