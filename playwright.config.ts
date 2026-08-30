import { defineConfig, devices } from '@playwright/test';

const testPort = process.env.PLAYWRIGHT_PORT ?? '4173';
const testBaseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${testPort}`;

export default defineConfig({
  testDir: './e2e',
  // Chromium is deterministic and reliable in the macOS sandbox with one worker.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: testBaseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${testPort} --strictPort`,
    url: testBaseURL,
    reuseExistingServer: !process.env.CI,
  },
});
