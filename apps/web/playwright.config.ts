import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

// Set E2E_BASE_URL to run the suite against a deployment instead of a local `next start`.
const remoteBaseUrl = process.env.E2E_BASE_URL;
const localBaseUrl = 'http://127.0.0.1:4173';

const repoRoot = path.join(import.meta.dirname, '../..');
const localApiPort = 4101;

// The local API only gets a database through E2E_DATABASE_URL. The explicit values, blank ones
// included, win over the API's `.env.local` because `--env-file-if-exists` never overrides a
// variable that is already set, and that database must never receive test players. The rewrite in
// `next start` proxies browser POSTs with the API's own host, so the web origin is allowed here.
const localApiEnv = {
  PORT: String(localApiPort),
  DATABASE_URL: process.env.E2E_DATABASE_URL ?? '',
  DATABASE_URL_UNPOOLED: '',
  RATE_LIMIT_SECRET: 'e2e-only',
  ALLOWED_ORIGINS: localBaseUrl,
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
        webServer: [
          {
            command: 'pnpm --filter api exec node --import tsx src/server.ts',
            cwd: repoRoot,
            env: localApiEnv,
            // /api/health answers 503 without a database, so wait for the port instead.
            port: localApiPort,
            reuseExistingServer: !process.env.CI,
            timeout: 30000,
          },
          {
            command: 'pnpm exec next start -H 127.0.0.1 -p 4173',
            env: { API_ORIGIN: `http://127.0.0.1:${localApiPort}` },
            url: `${localBaseUrl}/en`,
            reuseExistingServer: !process.env.CI,
            timeout: 30000,
          },
        ],
      }),
});
