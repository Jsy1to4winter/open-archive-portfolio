import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  workers: 2,
  use: {
    baseURL: "http://127.0.0.1:5176",
    headless: true,
    launchOptions: {
      ...(process.env.CHROMIUM_PATH
        ? { executablePath: process.env.CHROMIUM_PATH }
        : {}),
      args: [
        "--no-sandbox",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
  webServer: {
    command: "npm run dev -- --port 5176 --strictPort",
    url: "http://127.0.0.1:5176",
    reuseExistingServer: false,
  },
});
