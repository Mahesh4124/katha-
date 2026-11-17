import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.KATHA_TEST_URL || "http://127.0.0.1:4173";
await mkdir("test-results/cinematic", { recursive: true });
const browser = await chromium.launch({ headless: true });
const widths = [390, 1280];
try {
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    const forbidden = [];
    const uploads = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("katha-private-test-marker")) uploads.push(url);
      if (!url.startsWith(base) && !/^https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com)\//.test(url)) forbidden.push(url);
    });
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Try different styles" }).waitFor();
    const scene = page.locator("[data-scene]");
    assert.equal(await scene.first().getAttribute("data-scene"), "lotus");
    assert.equal(await page.locator(".cinematic-world img").first().count(), 1);
    assert.ok(await page.locator(".cinematic-world img").first().evaluate((img) => img.complete && img.naturalWidth >= 900),
      "cinematic scene should display a local high-res image");
    await page.screenshot({ path: "test-results/cinematic/home-" + width + ".png" });
    await page.getByRole("button", { name: "Try different styles" }).click();
    assert.equal(await page.locator("[data-world]").first().getAttribute("data-world"), "sakura");
    await page.screenshot({ path: "test-results/cinematic/sakura-" + width + ".png" });
    await page.getByRole("button", { name: "Lotus Lake" }).click();
    await page.getByRole("button", { name: "Add text" }).first().click();
    await page.getByPlaceholder("Title").fill("The River Between Us");
    await page.getByPlaceholder(/Paste a passage/).fill(
      "Across the lotus lake, the morning unfolded like a promise. " +
      "The breeze touched the blossoms gently, and there was peace. " +
      "Sanskrit: प्राणः शान्तिः ॥ katha-private-test-marker",
    );
    await page.getByRole("button", { name: "Save", exact: true }).click();
    const book = page.getByRole("button", { name: "Open The River Between Us" });
    await book.waitFor();
    await page.screenshot({ path: "test-results/cinematic/shelf-" + width + ".png" });
    assert.ok(await page.locator(".katha-book-card--active").count(), "selected book cover should be rendered");
    await book.click();
    await page.getByRole("region", { name: "Reading passage" }).waitFor();
    assert.ok(await page.getByRole("toolbar", { name: "Reading annotations" }).isVisible(),
      "annotation tools must be present");

    const selection = await page.evaluate(() => {
      const words = [...document.querySelectorAll("[data-base] [data-w]")];
      if (words.length < 3 || !words[0].firstChild || !words[2].firstChild) return false;
      const range = document.createRange();
      range.setStart(words[0].firstChild, 0);
      range.setEnd(words[2].firstChild, words[2].firstChild.textContent.length);
      const sel = window.getSelection(); if (!sel) return false;
      sel.removeAllRanges(); sel.addRange(range);
      words[0].closest("[data-base]")?.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      return true;
    });
    assert.equal(selection, true);
    await page.getByRole("button", { name: "Bold", exact: true }).click();
    await page.locator(".reader-word--bold").first().waitFor();
    await page.getByRole("button", { name: "Comment", exact: true }).click();
    await page.getByLabel("New comment").fill("This phrase deserves a note.");
    await page.getByRole("button", { name: "Save comment" }).click();
    await page.getByText("This phrase deserves a note.").waitFor();
    await page.screenshot({ path: "test-results/cinematic/notes-" + width + ".png" });
    await page.getByRole("button", { name: "Close parallel notes" }).click();
    await page.getByRole("button", { name: "Back to library" }).click();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Open The River Between Us" }).click();
    await page.getByRole("button", { name: "Open parallel notes" }).click();
    await page.getByText("This phrase deserves a note.").waitFor();
    assert.ok(await page.locator(".reader-word--bold").count() >= 1,
      "rich text marks must survive reload");
    assert.deepEqual(errors, [], "page runtime exceptions");
    assert.deepEqual(forbidden, [], "unexpected external requests");
    assert.deepEqual(uploads, [], "private book content must stay local");
    console.log(width + "px cinematic library and reader: PASS");
    await context.close();
  }
} finally {
  await browser.close();
}
