const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

async function main() {
  const htmlPath = path.join(__dirname, "index.html");
  const pageUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;
  const executablePath = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].find((candidate) => fs.existsSync(candidate));

  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 });
  await page.goto(pageUrl, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "新規メモ" }).click();
  await page.locator("#titleInput").fill("削除検証メモ");
  await page.locator("#bodyInput").fill("保存してから削除できることを確認するメモ。");
  await page.locator("#tagsInput").fill("検証, 削除");
  await page.getByRole("button", { name: "保存" }).click();
  await page.locator("#toast.show").waitFor({ timeout: 3000 });

  const activeTitle = await page.locator(".note-item.active strong").textContent();
  assert.strictEqual(activeTitle, "削除検証メモ");

  await fs.promises.mkdir(path.join(__dirname, "mockups"), { recursive: true });
  await page.screenshot({ path: path.join(__dirname, "mockups", "session-os-delete-pwa.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(__dirname, "mockups", "session-os-delete-pwa-mobile.png"), fullPage: true });

  page.once("dialog", async (dialog) => {
    assert(dialog.message().includes("削除検証メモ"));
    await dialog.accept();
  });
  await page.getByRole("button", { name: "削除" }).click();
  await page.locator("#toast.show").waitFor({ timeout: 3000 });
  const titlesAfterDelete = await page.locator(".note-item strong").allTextContents();
  assert(!titlesAfterDelete.includes("削除検証メモ"));

  const manifest = JSON.parse(await fs.promises.readFile(path.join(__dirname, "manifest.json"), "utf8"));
  assert.strictEqual(manifest.display, "standalone");
  assert(manifest.icons.some((icon) => icon.sizes === "192x192"));
  assert(manifest.icons.some((icon) => icon.sizes === "512x512"));

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
