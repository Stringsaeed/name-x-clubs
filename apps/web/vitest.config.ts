import { fileURLToPath } from 'node:url';
import { lingui } from '@lingui/vite-plugin';
import { defineConfig } from 'vitest/config';

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
    // Separate package runners must not clear each other's module caches after a lockfile change.
    fsModuleCachePath: 'node_modules/.vitest-cache',
    restoreMocks: true,
    coverage: { provider: 'v8', include: ['src/game/**/*.ts'] },
    projects: [
      {
        extends: true,
        test: {
          name: 'client',
          include: ['src/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
        },
      },
    ],
  },
});
