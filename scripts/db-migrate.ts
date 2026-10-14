/**
 * Applies pending SQL migrations from src/server/migrations to DATABASE_URL_UNPOOLED, or
 * DATABASE_URL when no direct URL is set. Safe to run repeatedly and concurrently: applied
 * migrations are skipped, and the migrator holds a table lock while it works.
 *
 *   pnpm db:migrate
 *   node --conditions=react-server scripts/db-migrate.ts --production-only
 *
 * `--production-only` does nothing unless VERCEL_ENV is "production", so a shared build script can
 * migrate production deploys without touching preview databases.
 *
 * Node runs this file with its built-in type stripping, which needs explicit `.ts` extensions.
 * `--conditions=react-server` resolves `server-only` to its empty build.
 */
import { Effect } from 'effect';
import { MigrationDatabase } from '../src/server/db/Database.ts';
import { runMigrations } from '../src/server/db/migrations.ts';

const productionOnly = process.argv.includes('--production-only');

function describeApplied(applied: ReadonlyArray<readonly [number, string]>) {
  if (applied.length === 0) {
    return 'Database schema is up to date.';
  }

  const names = applied.map(([id, name]) => `${id}_${name}`).join(', ');

  return `Applied ${applied.length} migration(s): ${names}`;
}

async function main() {
  if (productionOnly && process.env.VERCEL_ENV !== 'production') {
    console.log(`Skipping migrations (VERCEL_ENV=${process.env.VERCEL_ENV ?? 'unset'}).`);

    return;
  }

  const applied = await Effect.runPromise(runMigrations.pipe(Effect.provide(MigrationDatabase)));
  console.log(describeApplied(applied));
}

main().catch((error: unknown) => {
  console.error('Migration failed:', error);
  process.exitCode = 1;
});
