import { defineConfig, devices } from '@playwright/test';

// Set E2E_BASE_URL to run the suite against a deployment instead of a local `next start`.
const remoteBaseUrl = process.env.E2E_BASE_URL;
const localBaseUrl = 'http://127.0.0.1:4173';

// The local server only gets a database through E2E_DATABASE_URL. Blank values stop Next.js from
// filling them in from `.env.local`, whose database must never receive test players.
const localServerEnv = {
  DATABASE_URL: process.env.E2E_DATABASE_URL ?? '',
  DATABASE_URL_UNPOOLED: '',
  RATE_LIMIT_SECRET: 'e2e-only',
};

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  ...(process.env.CI ? { workers: 4 } : {}),
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: remoteBaseUrl ?? localBaseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } },
  ],
  ...(remoteBaseUrl
    ? {}
    : {
        webServer: {
          command: 'pnpm exec next start -H 127.0.0.1 -p 4173',
          env: localServerEnv,
          url: `${localBaseUrl}/en`,
          reuseExistingServer: !process.env.CI,
          timeout: 30000,
        },
      }),
});
