/**
 * Applies pending SQL migrations from `@nxc/server` (`packages/server/src/migrations`) to
 * DATABASE_URL_UNPOOLED, or DATABASE_URL when no direct URL is set. Safe to run repeatedly and
 * concurrently: applied migrations are skipped, and the migrator holds a table lock while it works.
 *
 *   pnpm db:migrate                                    (reads apps/api/.env.local when present)
 *   node --import tsx scripts/db-migrate.ts --vercel   (the API's Vercel build)
 *
 * `--vercel` migrates only when VERCEL_ENV is "production" or "preview" and otherwise skips, so
 * the build of this service migrates its own environment's database and nothing else. A preview
 * deployment therefore needs its own database (a Neon branch), never production's.
 */
import { MigrationDatabase } from '@nxc/server/db/Database';
import { runMigrations } from '@nxc/server/db/migrations';
import { Effect } from 'effect';

const migratedOnVercel = new Set(['production', 'preview']);

const vercelBuild = process.argv.includes('--vercel');

function describeApplied(applied: ReadonlyArray<readonly [number, string]>) {
  if (applied.length === 0) {
    return 'Database schema is up to date.';
  }

  const names = applied.map(([id, name]) => `${id}_${name}`).join(', ');

  return `Applied ${applied.length} migration(s): ${names}`;
}

async function main() {
  const vercelEnv = process.env.VERCEL_ENV;

  if (vercelBuild && (vercelEnv === undefined || !migratedOnVercel.has(vercelEnv))) {
    console.log(`Skipping migrations (VERCEL_ENV=${vercelEnv ?? 'unset'}).`);

    return;
  }

  const applied = await Effect.runPromise(runMigrations.pipe(Effect.provide(MigrationDatabase)));
  console.log(describeApplied(applied));
}

main().catch((error: unknown) => {
  console.error('Migration failed:', error);
  process.exitCode = 1;
});
