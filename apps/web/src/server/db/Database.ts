/**
 * The production `SqlClient`: a small `@effect/sql-pg` pool on Neon's pooled endpoint.
 *
 * This module imports packages only, so `scripts/db-migrate.ts` can load it under Node's type
 * stripping. The pool opens lazily when the runtime first builds this layer, never at import time,
 * so `next build` needs no database.
 */
import 'server-only';
import { PgClient } from '@effect/sql-pg';
import { Config, Duration, Effect, Layer } from 'effect';
import { snakeToCamel } from 'effect/String';

export type DatabaseUrlName = 'DATABASE_URL' | 'DATABASE_URL_UNPOOLED';

/**
 * Neon's pooled URL goes through PgBouncer in transaction mode, which does not keep named prepared
 * statements between transactions, so statement caching is off. Transactions themselves are fine:
 * they hold one server connection until COMMIT.
 */
const pooledSettings = {
  prepare: false,
  maxConnections: 5,
  idleTimeout: Duration.seconds(30),
  connectTimeout: Duration.seconds(10),
  applicationName: 'name-x-clubs',
  // Rows come back camelCase; see `db/rows.ts`.
  transformResultNames: snakeToCamel,
} as const;

function urlConfig(names: readonly [DatabaseUrlName, ...DatabaseUrlName[]]) {
  const [first, ...rest] = names;

  return rest.reduce(
    (config, name) => Config.orElse(config, () => Config.Redacted(name)),
    Config.Redacted(first),
  );
}

/** A pool for the first of `names` that is set. Fails with a `ConfigError` when none is. */
export function databaseLayer(names: readonly [DatabaseUrlName, ...DatabaseUrlName[]]) {
  const pool = Effect.map(urlConfig(names), (url) => PgClient.layer({ url, ...pooledSettings }));

  return Layer.unwrap(pool);
}

/** Request handlers use the pooled URL. */
export const DatabaseLive = databaseLayer(['DATABASE_URL']);

/** Migrations want a direct connection, falling back to the pooled one. */
export const MigrationDatabase = databaseLayer(['DATABASE_URL_UNPOOLED', 'DATABASE_URL']);
