import { defineConfig } from "@playwright/test";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test") || !["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname)) {
  throw new Error("Set TEST_DATABASE_URL to a local _test database; never run E2E against workshop data.");
}

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  timeout: 30000,
  use: { baseURL: "http://localhost:3100", headless: true },
  webServer: {
    command: "bun run start --port 3100",
    url: "http://localhost:3100/api/dreams",
    env: { DATABASE_URL: databaseUrl },
    reuseExistingServer: false,
  },
});
