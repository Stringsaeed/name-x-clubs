import { fileURLToPath } from 'node:url';
import { lingui } from '@lingui/vite-plugin';
import { defineConfig } from 'vitest/config';

const serverTests = 'src/server/**/*.test.ts';

export default defineConfig({
  // `lingui` runs first (enforce: 'pre') and transforms Lingui macros natively.
  plugins: [lingui({ macroTransform: true })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    restoreMocks: true,
    coverage: { provider: 'v8', include: ['src/game/**/*.ts'] },
    projects: [
      {
        extends: true,
        test: {
          name: 'client',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: [serverTests],
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
        },
      },
      {
        extends: true,
        // Server modules import `server-only`, which throws outside React Server bundles.
        resolve: {
          alias: {
            'server-only': fileURLToPath(new URL('./src/test/serverOnly.ts', import.meta.url)),
          },
        },
        test: {
          name: 'server',
          include: [serverTests],
          environment: 'node',
          // Each file boots PGlite (WebAssembly Postgres) and runs the real migrations.
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
