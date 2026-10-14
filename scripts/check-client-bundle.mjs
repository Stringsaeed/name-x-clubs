/**
 * Fails when server-only code leaks into the browser: Effect in `.next/static`, or an API route
 * that opts into the Edge runtime. Run after `pnpm build`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const staticDirectory = '.next/static';

const apiDirectory = 'src/app/api';

/** Effect's module paths (`effect/...`, `@effect/...`) survive in bundled chunks and maps. */
const effectMarker = 'effect/';

const edgeRuntime = /export\s+const\s+runtime\s*=\s*['"]edge['"]/;

function filesUnder(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);

    if (statSync(path).isDirectory()) {
      return filesUnder(path);
    }

    return [path];
  });
}

function clientLeaks() {
  if (!existsSync(staticDirectory)) {
    throw new Error(`${staticDirectory} is missing. Run pnpm build first.`);
  }

  return filesUnder(staticDirectory).filter((path) =>
    readFileSync(path, 'utf8').includes(effectMarker),
  );
}

function edgeRoutes() {
  return filesUnder(apiDirectory).filter((path) => edgeRuntime.test(readFileSync(path, 'utf8')));
}

const leaks = clientLeaks();
const edges = edgeRoutes();

for (const path of leaks) {
  console.error(`Effect found in client bundle: ${path}`);
}

for (const path of edges) {
  console.error(`API route uses the Edge runtime: ${path}`);
}

if (leaks.length > 0 || edges.length > 0) {
  process.exit(1);
}

console.log('Client bundle has no Effect code, and no API route uses the Edge runtime.');
