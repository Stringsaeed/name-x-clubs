import { PgliteClient } from '@effect/sql-pglite';
import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { SqlClient } from 'effect/sql';
import { readMigrationFiles, runMigrations, splitStatements } from './migrations';

describe('SQL migrations', () => {
  it('splits a file into statements, dropping comment lines', () => {
    const statements = splitStatements(`-- header
CREATE TABLE a (id int);

-- note; with a semicolon
CREATE INDEX a_idx
  ON a (id);
`);

    assert.deepStrictEqual(statements, [
      'CREATE TABLE a (id int)',
      'CREATE INDEX a_idx\n  ON a (id)',
    ]);
  });

  it('finds the numbered files in order', () => {
    const files = readMigrationFiles();

    assert.strictEqual(files[0]?.id, 1);
    assert.strictEqual(files[0]?.name, 'initial');
  });

  it.effect('applies once and is a no-op when run again', () =>
    Effect.gen(function* () {
      const first = yield* runMigrations;
      const second = yield* runMigrations;
      const sql = yield* SqlClient.SqlClient;
      const tables = yield* sql<{ tableName: string }>`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' ORDER BY table_name
      `;

      assert.deepStrictEqual(first, [[1, 'initial']]);
      assert.deepStrictEqual(second, []);
      assert.includeMembers(
        tables.map((table) => Object.values(table)[0]),
        [
          'best_all_time',
          'credentials',
          'handles',
          'players',
          'rate_limits',
          'round_entries',
          'rounds',
        ],
      );
    }).pipe(Effect.provide(PgliteClient.layer())),
  );
});
