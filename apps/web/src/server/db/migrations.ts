/**
 * Runs the plain SQL files in `src/server/migrations/` with the Effect SQL migrator.
 *
 * This module imports packages only (no relative imports), so `scripts/db-migrate.ts` can load it
 * with Node's built-in type stripping. Request handlers never import it: `next build` and the
 * runtime never touch the migrations directory.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { Effect } from 'effect';
import { Migrator, SqlClient } from 'effect/sql';

const migrationsDirectory = new URL('../migrations/', import.meta.url);

const migrationFileName = /^(\d+)_([a-z0-9_]+)\.sql$/;

/** Statements end with `;` at the end of a line, so no statement may contain `;\n` inside. */
const statementEnd = /;\s*\n/;

export type MigrationFile = Readonly<{ id: number; name: string; statements: readonly string[] }>;

function withoutComments(sql: string) {
  return sql
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');
}

export function splitStatements(sql: string): string[] {
  return `${withoutComments(sql)}\n`
    .split(statementEnd)
    .map((statement) => statement.trim())
    .filter((statement) => statement !== '');
}

export function readMigrationFiles(directory: URL = migrationsDirectory): MigrationFile[] {
  const files: MigrationFile[] = [];

  for (const fileName of readdirSync(directory).sort()) {
    const match = migrationFileName.exec(fileName);

    if (!match) {
      continue;
    }

    const [, id = '', name = ''] = match;
    const sql = readFileSync(new URL(fileName, directory), 'utf8');
    files.push({ id: Number(id), name, statements: splitStatements(sql) });
  }

  return files;
}

function runStatements(statements: readonly string[]) {
  return Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    for (const statement of statements) {
      yield* sql.unsafe(statement);
    }
  });
}

function toResolvedMigration(file: MigrationFile): Migrator.ResolvedMigration {
  return [file.id, file.name, Effect.succeed(runStatements(file.statements))];
}

/** Reads the files when the migrator runs, not when this module is imported. */
const loader: Migrator.Loader = Effect.sync(() => readMigrationFiles().map(toResolvedMigration));

/**
 * Applies pending migrations in one transaction under a table lock, so running it again, or from
 * two builds at once, is safe. Returns the migrations it applied.
 */
export const runMigrations = Migrator.make({})({
  loader,
  table: 'nxc_migrations',
});
