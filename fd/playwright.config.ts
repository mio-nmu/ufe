import { readFileSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";

/**
 * The API base URL is resolved the same way `next dev` resolves it:
 * process.env first, then fd/.env.local, then the default. This keeps the
 * webServer readiness probe in sync with what the app itself will call.
 */
function resolveApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const match = /^NEXT_PUBLIC_API_URL\s*=\s*(\S+)/.exec(line.trim());
      if (match) return match[1] as string;
    }
  } catch {
    // no .env.local — fall through to the default
  }
  return "http://localhost:4000";
}

const apiBase = resolveApiBase();

/** Frontend base URL — override with FRONTEND_BASE_URL when dev runs on
 *  another port; the backend accepts any localhost origin via CORS. */
const frontendBase = process.env.FRONTEND_BASE_URL ?? "http://localhost:3000";

/**
 * E2E runs against real servers. Playwright starts (or reuses):
 *   - the backend (bd/, needs bd/.env pointing at MongoDB + `npm run db:seed`)
 *   - the frontend dev server (fd/, :3000 by default)
 */
export default defineConfig({
  testDir: "tests/e2e",
  // Generous budget: tests run against real dev servers, where the first
  // visit to a route can pay a cold next dev compile inside the test.
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: frontendBase,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      cwd: "../bd",
      // The suite is login-heavy (register + login per journey); a long-lived
      // dev server's 15-min auth limiter would flake it. When Playwright
      // starts the backend itself, give it a generous auth budget.
      command: "AUTH_RATE_LIMIT_MAX=1000 npm run dev",
      url: `${apiBase}/health`,
      reuseExistingServer: true,
      timeout: 90_000,
    },
    {
      command: "npm run dev",
      url: frontendBase,
      reuseExistingServer: true,
      timeout: 90_000,
    },
  ],
});
