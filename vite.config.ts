import { lingui } from '@lingui/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // `lingui` runs first (enforce: 'pre'): it transforms Lingui macros natively and compiles
  // `.po` catalogs on import, so neither Babel nor a `lingui compile` step is needed.
  plugins: [lingui({ macroTransform: true }), react()],
  build: { target: 'es2022', sourcemap: true },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    coverage: { provider: 'v8', include: ['src/game/**/*.ts'] },
  },
});
