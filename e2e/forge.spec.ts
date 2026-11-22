import { expect, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";

const OLLAMA = "http://127.0.0.1:11435";

test("create a game, preview it, fix an injected error, and export", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto("/#/settings");
  await page.screenshot({ path: "test-results/screenshots/phone-settings.png" });
  await page.getByTestId("settings-ollama-url").fill(OLLAMA);
  await page.getByTestId("test-connection").click();
  await expect(page.getByTestId("connection-result")).toContainText("qwen2.5-coder:7b");
  await expect(page.getByRole("heading", { name: "Connect from the phone" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ollama in Termux" })).toBeVisible();

  await page.getByTestId("nav-projects").click();
  await page.screenshot({ path: "test-results/screenshots/phone-home.png" });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.getByTestId("new-project").click();
  await page.screenshot({ path: "test-results/screenshots/phone-new-project.png" });
  await page.getByTestId("template-arcade").click();
  await page.getByTestId("prompt").fill("A bright arcade game about catching falling stars. Title: Star Catch");
  await page.getByTestId("create-project").click();
  await expect(page.getByTestId("project-title")).toHaveText("Star Catch", { timeout: 30000 });
  await expect(page.getByTestId("generation-status")).toContainText("Saved");

  await page.getByTestId("tab-preview").click();
  const frame = page.frameLocator('[data-testid="preview-frame"]');
  await expect(frame.locator("canvas")).toBeVisible();
  await expect(frame.locator("#title")).toHaveText("Star Catch");
  await page.screenshot({ path: "test-results/screenshots/phone-preview.png" });

  await page.getByTestId("tab-code").click();
  const editor = page.locator('[data-testid="editor"] .cm-content');
  await editor.click({ position: { x: 24, y: 16 } });
  await page.keyboard.press("Control+Home");
  await page.keyboard.type('throw new Error("player crashed");\n');
  await expect(page.getByTestId("file-sync")).toHaveText("injected");

  await page.getByTestId("tab-test").click();
  await page.getByTestId("smoke-run").click();
  await expect(page.getByTestId("smoke-result")).toContainText("player crashed", { timeout: 15000 });
  await page.getByTestId("fix-it").click();
  await expect(page.getByTestId("smoke-result")).toContainText("Smoke test passed", { timeout: 30000 });

  await page.getByTestId("tab-history").click();
  await expect(page.getByTestId("version-list")).toContainText("Generated");
  await expect(page.getByTestId("version-list")).toContainText("Fix 1");

  await page.getByTestId("tab-code").click();
  await expect(page.locator('[data-testid="editor"]')).not.toContainText("player crashed");

  await page.getByTestId("env-prod").click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("export-zip").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/star-catch\.zip$/);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const packed = unzipSync(new Uint8Array(Buffer.concat(chunks)));
  const main = strFromU8(packed["main.js"]!);
  expect(main).toContain("Star Catch");
  expect(main).not.toContain("player crashed");
  expect(packed["index.html"]).toBeTruthy();
  expect(packed["styles.css"]).toBeTruthy();

  const pwaPromise = page.waitForEvent("download");
  await page.getByTestId("export-pwa").click();
  const pwa = await pwaPromise;
  const pwaStream = await pwa.createReadStream();
  const pwaChunks: Buffer[] = [];
  for await (const chunk of pwaStream!) pwaChunks.push(Buffer.from(chunk));
  const pwaFiles = unzipSync(new Uint8Array(Buffer.concat(pwaChunks)));
  expect(strFromU8(pwaFiles["manifest.webmanifest"]!)).toContain("Star Catch");
  expect(pwaFiles["sw.js"]).toBeTruthy();
  expect(pwaFiles["icons/icon-192.png"]!.byteLength).toBeGreaterThan(200);

  await page.getByRole("link", { name: "Projects" }).click();
  await page.getByTestId("nav-assets").click();
  await expect(page.getByTestId("asset-palette")).toBeVisible();
  await page.screenshot({ path: "test-results/screenshots/phone-assets.png" });
});
