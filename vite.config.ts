import { lingui } from '@lingui/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // `lingui` runs first (enforce: 'pre') and transforms Lingui macros natively.
  plugins: [lingui({ macroTransform: true }), react()],
  build: { target: 'es2022', sourcemap: true },
});
