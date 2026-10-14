import { lingui } from '@lingui/vite-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // `lingui` runs first (enforce: 'pre') and transforms Lingui macros natively.
  plugins: [lingui({ macroTransform: true })],
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    coverage: { provider: 'v8', include: ['src/game/**/*.ts'] },
  },
});
