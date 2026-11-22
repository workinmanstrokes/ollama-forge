import { expect, test } from "@playwright/test";

test("desktop studio keeps a preview beside the tools", async ({ page }) => {
  await page.goto("/#/settings");
  await page.getByTestId("settings-ollama-url").fill("http://127.0.0.1:11435");
  await page.getByTestId("test-connection").click();
  await expect(page.getByTestId("connection-result")).toContainText("qwen2.5-coder:7b");
  await page.goto("/#/new");
  await page.getByTestId("template-quiz").click();
  await page.getByTestId("prompt").fill("A short quiz about oceans. Title: Tide Quiz");
  await page.getByTestId("create-project").click();
  await expect(page.getByTestId("project-title")).toHaveText("Tide Quiz", { timeout: 30000 });
  await expect(page.locator(".studio-grid")).toBeVisible();
  await expect(page.frameLocator('[data-testid="preview-frame"]').locator("h1")).toHaveText("Tide Quiz");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "test-results/screenshots/desktop-studio.png" });
});
