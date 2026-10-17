import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    restoreMocks: true,
    // Each file boots PGlite (WebAssembly Postgres) and runs the real migrations.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
