import { defineConfig, devices } from "@playwright/test";

const PORT = 8777;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  reporter: process.env['CI'] ? [["github"], ["list"]] : [["list"]],
  use: {
    testIdAttribute: "data-test",
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // Furtka dla środowisk z przeglądarką poza katalogiem Playwrighta.
    ...(process.env['CHROMIUM_PATH']
      ? { launchOptions: { executablePath: process.env['CHROMIUM_PATH'] } }
      : {}),
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `node tests/server.mjs`,
    url: `http://localhost:${PORT}/index.html`,
    reuseExistingServer: !process.env['CI'],
    env: { PORT: String(PORT), APP_DIR: process.env['APP_DIR'] ?? "dist-test" },
  },
});
