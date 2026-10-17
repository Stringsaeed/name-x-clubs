/**
 * Bundles the API into one ESM file, `dist/index.js`, whose default export is the Hono app.
 * Vercel serves that file as is: its Hono builder neither bundles nor resolves the extensionless
 * TypeScript imports inside `@nxc/server` and `@nxc/game`. Everything is inlined (workspace
 * packages, their JSON content, effect, hono, the Postgres driver); only Node builtins stay
 * external.
 */
import { build } from 'esbuild';

// The standard shim for CommonJS inside an ESM bundle: without it a dependency's `require` of a
// Node builtin throws at runtime. Today's bundle has none, so this guards future dependencies.
const requireShim =
  "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);";

const result = await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  banner: { js: requireShim },
  logLevel: 'info',
  metafile: true,
});

const bytes = Object.values(result.metafile.outputs).reduce((sum, output) => sum + output.bytes, 0);
console.log(`Bundled dist/index.js (${(bytes / 1024).toFixed(1)} KiB).`);
