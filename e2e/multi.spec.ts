import { expect, test } from "@playwright/test";

test("build a multi-file game and fix a module error", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto("/#/settings");
  await page.getByTestId("settings-ollama-url").fill("http://127.0.0.1:11435");
  await page.getByTestId("test-connection").click();
  await expect(page.getByTestId("connection-result")).toContainText("qwen2.5-coder:7b");
  await page.getByTestId("nav-projects").click();
  await page.getByTestId("new-project").click();
  await page.getByTestId("template-platformer").click();
  await page.screenshot({ path: "test-results/screenshots/phone-platformer-template.png" });
  await page.getByTestId("prompt").fill("A mossy platformer with coins and a pause menu. Title: Moss Run");
  await page.getByTestId("create-project").click();
  await expect(page.getByTestId("project-title")).toHaveText("Moss Run", { timeout: 40000 });
  await expect(page.getByTestId("approve-milestone")).toBeVisible({ timeout: 40000 });
  const count = Number.parseInt(await page.getByTestId("file-count").innerText(), 10);
  expect(count).toBeGreaterThanOrEqual(8);
  await page.getByTestId("tab-preview").click();
  const frame = page.frameLocator('[data-testid="preview-frame"]');
  await expect(frame.locator("#start")).toBeVisible();
  await page.screenshot({ path: "test-results/screenshots/phone-platformer.png" });

  await page.getByTestId("tab-code").click();
  await page.getByRole("tab", { name: "src/player.js" }).click();
  await page.locator('[data-testid="editor"] .cm-content').click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type('\nthrow new Error("player crashed");\n');
  await expect(page.getByTestId("file-sync")).toHaveText("injected");

  await page.getByTestId("tab-test").click();
  await page.getByTestId("smoke-run").click();
  await expect(page.getByTestId("smoke-result")).toContainText("player crashed", { timeout: 15000 });
  await page.getByTestId("fix-it").click();
  await expect(page.getByTestId("smoke-result")).toContainText("Smoke test passed", { timeout: 30000 });
});
