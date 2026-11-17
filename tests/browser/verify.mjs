import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.KATHA_TEST_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    const page = await context.newPage();
    const pageErrors = [];
    const outbound = [];
    const requestsWithPrivateText = [];
    const title = "Katha QA " + viewport.width;
    const marker = "katha-test-private-" + viewport.width;
    const passage = "The lotus opens quietly. Sanskrit follows: प्राणः शान्तिः ॥ " + marker +
      " A friendly reading passage with many words. ".repeat(60) +
      " <script>window.__kathaInjected=true</script> javascript:alert(1)";
    page.on("pageerror", (err) => pageErrors.push(err.message));
    page.on("request", (request) => {
      const url = request.url();
      if (!url.startsWith(base)) outbound.push(url);
      if ((url + " " + (request.postData() || "")).includes(marker)) requestsWithPrivateText.push(url);
    });

    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Toggle day or night" }).waitFor();
    await page.getByRole("button", { name: "Toggle day or night" }).click();
    assert.equal(await page.locator("[data-mode]").first().getAttribute("data-mode"), "light");
    await page.getByRole("button", { name: /Sakura Mountain/ }).click();
    await page.getByRole("button", { name: "Add text" }).click();

    const fakeExe = { name: "story.txt.exe", mimeType: "application/x-msdownload", buffer: Buffer.from("MZ mock—not executable") };
    await page.locator('input[type="file"]').setInputFiles(fakeExe);
    assert.match(await page.locator('[role="alert"]').last().innerText(), /Only plain/);
    await page.getByPlaceholder("Title").fill(title);
    await page.getByPlaceholder(/Paste a passage/).fill(passage);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText(title, { exact: true }).first().waitFor();
    await page.getByText(title, { exact: true }).first().click();
    await page.locator("article").waitFor();
    assert.match(await page.locator("article").innerText(), /katha-test-private/);
    assert.equal(await page.locator("article script, article img, article [onerror]").count(), 0);
    assert.equal(await page.evaluate(() => window.__kathaInjected === true), false);

    await page.getByRole("button", { name: "Reading settings" }).click();
    await page.getByRole("button", { name: "Larger text" }).click();
    await page.getByRole("button", { name: "1.25×" }).click();
    const layout = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth, viewport: innerWidth,
      readerBottom: document.querySelector("article")?.getBoundingClientRect().bottom,
      controlsTop: document.querySelector('input[aria-label="Seek"]')?.getBoundingClientRect().top,
    }));
    assert.ok(layout.width <= layout.viewport + 2, "horizontal overflow: " + JSON.stringify(layout));
    await page.getByRole("button", { name: "Reading settings" }).click();

    await page.getByRole("button", { name: "Play silent preview" }).click();
    await page.getByRole("button", { name: "Pause" }).waitFor();
    await page.getByRole("button", { name: "Pause" }).click();
    await page.getByRole("button", { name: "Previous sentence" }).click();
    await page.getByRole("button", { name: "Next sentence" }).click();
    const seek = page.locator('input[aria-label="Seek"]');
    await seek.focus();
    await seek.press("End");
    await seek.press("ArrowLeft");
    await page.waitForTimeout(250);
    await page.getByRole("button", { name: "Back to library" }).click();
    await page.getByText(title, { exact: true }).first().waitFor();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByText(title, { exact: true }).first().waitFor();
    await page.getByText(title, { exact: true }).first().click();
    assert.match(await page.locator("article").innerText(), /katha-test-private/);
    assert.equal(await page.locator("audio, video").count(), 0, "silent preview must not falsely imply audio");
    assert.deepEqual(requestsWithPrivateText, [], "private book text left the device");
    assert.deepEqual(pageErrors, [], "unexpected browser errors");
    // Google Fonts are disclosed third-party resources; other outbound requests require investigation.
    const unexpected = outbound.filter((url) => !/^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\//.test(url));
    assert.deepEqual(unexpected, [], "unexpected outbound requests");
    results.push({ viewport, passed: true, externalFontRequests: outbound.length, horizontalOverflow: false });
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify({ tests: results, result: "PASS" }, null, 2));
