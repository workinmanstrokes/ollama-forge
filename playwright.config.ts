import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 90000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "node mock/ollama-server.mjs",
      port: 11435,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npx vite --host 127.0.0.1 --port 5173 --strictPort",
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    {
      name: "phone",
      testMatch: /forge\.spec\.ts/,
      use: {
        viewport: { width: 412, height: 915 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "desktop",
      testMatch: /desktop\.spec\.ts/,
      use: { viewport: { width: 1280, height: 800 } },
    },
  ],
});
