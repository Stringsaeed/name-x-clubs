import { randomUUID } from 'node:crypto';
import { assert, describe, it } from '@effect/vitest';
import { Effect, Layer } from 'effect';
import { SqlClient } from 'effect/sql';
import { TestClock } from 'effect/testing';
import type { RankedMode } from '../rounds/modes';
import { testDatabase, testEpochMs } from '../testing/testApp';
import { Leaderboard } from './Leaderboard';
import { type BoardQuery, standingQuery, topQuery } from './queries';

const TestLayer = Leaderboard.layer.pipe(Layer.provideMerge(testDatabase()));

const minute = 60 * 1000;

const hour = 60 * minute;

const day = 24 * hour;

type SeededRound = Readonly<{
  playerId: string;
  elapsedMs: number;
  finishedAtMs: number;
  mode?: RankedMode;
  status?: 'verified' | 'flagged';
}>;

const seedPlayer = Effect.fn('seedPlayer')(function* (name: string) {
  const sql = yield* SqlClient.SqlClient;
  const id = randomUUID();
  const now = new Date(testEpochMs);

  yield* sql`
    INSERT INTO players (id, created_at, last_seen_at, nickname_en, nickname_ar)
    VALUES (${id}::uuid, ${now}, ${now}, ${name}, ${`${name} (ar)`})
  `;

  return id;
});

/** Inserts a finished round the way the rounds API would, including the all-time upsert. */
const seedRound = Effect.fn('seedRound')(function* (round: SeededRound) {
  const sql = yield* SqlClient.SqlClient;
  const leaderboard = yield* Leaderboard;
  const id = randomUUID();
  const mode = round.mode ?? 't10';
  const status = round.status ?? 'verified';
  const finishedAt = new Date(round.finishedAtMs);
  const startedAt = new Date(round.finishedAtMs - round.elapsedMs);

  yield* sql`
    INSERT INTO rounds (id, player_id, mode, lang, catalog_version, status, started_at,
      finished_at, elapsed_ms, score_key)
    VALUES (${id}::uuid, ${round.playerId}::uuid, ${mode}, 'en', 'test', ${status}, ${startedAt},
      ${finishedAt}, ${round.elapsedMs}, ${round.elapsedMs})
  `;

  if (status === 'verified') {
    yield* leaderboard.recordVerified({
      mode,
      playerId: round.playerId,
      roundId: id,
      scoreKey: round.elapsedMs,
      elapsedMs: round.elapsedMs,
      achievedAt: finishedAt,
    });
  }
});

const namesOn = Effect.fn('namesOn')(function* (period: 'day' | 'week' | 'all') {
  const leaderboard = yield* Leaderboard;
  const entries = yield* leaderboard.top('t10', period, 'en');

  return entries.map((entry) => entry.name);
});

const atTestEpoch = TestClock.setTime(testEpochMs);

describe('Leaderboard ranking', () => {
  it.effect('orders by time, breaks ties by the earlier finish, and shares exact ties', () =>
    Effect.gen(function* () {
      yield* atTestEpoch;
      const early = yield* seedPlayer('Early');
      const tiedA = yield* seedPlayer('Tied A');
      const tiedB = yield* seedPlayer('Tied B');
      const slow = yield* seedPlayer('Slow');
      yield* seedRound({
        playerId: tiedA,
        elapsedMs: 30_000,
        finishedAtMs: testEpochMs - 10 * minute,
      });
      yield* seedRound({
        playerId: early,
        elapsedMs: 30_000,
        finishedAtMs: testEpochMs - 20 * minute,
      });
      yield* seedRound({
        playerId: tiedB,
        elapsedMs: 30_000,
        finishedAtMs: testEpochMs - 10 * minute,
      });
      yield* seedRound({
        playerId: slow,
        elapsedMs: 45_000,
        finishedAtMs: testEpochMs - 30 * minute,
      });

      const leaderboard = yield* Leaderboard;
      const board = yield* leaderboard.top('t10', 'day', 'en');
      const slowStanding = yield* leaderboard.standing(slow, 't10', 'day');
      const tiedStanding = yield* leaderboard.standing(tiedB, 't10', 'day');

      // Exact ties share a rank; their order between themselves is by player id.
      assert.deepStrictEqual(board.map((entry) => `${entry.rank} ${entry.name}`).sort(), [
        '1 Early',
        '2 Tied A',
        '2 Tied B',
        '4 Slow',
      ]);
      assert.strictEqual(board[3]?.name, 'Slow');
      assert.strictEqual(slowStanding.rank, 4);
      assert.strictEqual(slowStanding.total, 4);
      assert.strictEqual(tiedStanding.rank, 2);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('lists each player once, with their best round', () =>
    Effect.gen(function* () {
      yield* atTestEpoch;
      const player = yield* seedPlayer('Repeat');
      yield* seedRound({
        playerId: player,
        elapsedMs: 50_000,
        finishedAtMs: testEpochMs - 3 * hour,
      });
      yield* seedRound({
        playerId: player,
        elapsedMs: 20_000,
        finishedAtMs: testEpochMs - 2 * hour,
      });
      yield* seedRound({
        playerId: player,
        elapsedMs: 40_000,
        finishedAtMs: testEpochMs - 1 * hour,
      });

      const leaderboard = yield* Leaderboard;

      for (const period of ['day', 'week', 'all'] as const) {
        const board = yield* leaderboard.top('t10', period, 'en');

        assert.deepStrictEqual(
          board.map((entry) => entry.elapsedMs),
          [20_000],
          period,
        );
      }
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('keeps flagged rounds, other modes and hidden players off the board', () =>
    Effect.gen(function* () {
      yield* atTestEpoch;
      const sql = yield* SqlClient.SqlClient;
      const flagged = yield* seedPlayer('Flagged');
      const otherMode = yield* seedPlayer('Mode 50');
      const hidden = yield* seedPlayer('Hidden');
      const shown = yield* seedPlayer('Shown');
      const recently = testEpochMs - minute;
      yield* seedRound({
        playerId: flagged,
        elapsedMs: 9_000,
        finishedAtMs: recently,
        status: 'flagged',
      });
      yield* seedRound({
        playerId: otherMode,
        elapsedMs: 90_000,
        finishedAtMs: recently,
        mode: 't50',
      });
      yield* seedRound({ playerId: hidden, elapsedMs: 20_000, finishedAtMs: recently });
      yield* seedRound({ playerId: shown, elapsedMs: 30_000, finishedAtMs: recently });
      yield* sql`UPDATE players SET status = 'hidden' WHERE id = ${hidden}::uuid`;

      for (const period of ['day', 'week', 'all'] as const) {
        assert.deepStrictEqual(yield* namesOn(period), ['Shown'], period);
      }
    }).pipe(Effect.provide(TestLayer)),
  );
});

describe('Rolling windows', () => {
  it.effect('day keeps 23h59 and drops 24h01; week keeps it; time moving on drops it', () =>
    Effect.gen(function* () {
      yield* atTestEpoch;
      const inside = yield* seedPlayer('23h59 ago');
      const outside = yield* seedPlayer('24h01 ago');
      const lastWeek = yield* seedPlayer('8 days ago');
      yield* seedRound({
        playerId: inside,
        elapsedMs: 30_000,
        finishedAtMs: testEpochMs - day + minute,
      });
      yield* seedRound({
        playerId: outside,
        elapsedMs: 20_000,
        finishedAtMs: testEpochMs - day - minute,
      });
      yield* seedRound({
        playerId: lastWeek,
        elapsedMs: 10_000,
        finishedAtMs: testEpochMs - 8 * day,
      });

      assert.deepStrictEqual(yield* namesOn('day'), ['23h59 ago']);
      assert.deepStrictEqual(yield* namesOn('week'), ['24h01 ago', '23h59 ago']);
      assert.deepStrictEqual(yield* namesOn('all'), ['8 days ago', '24h01 ago', '23h59 ago']);

      yield* TestClock.adjust(2 * minute);

      assert.deepStrictEqual(yield* namesOn('day'), []);

      const leaderboard = yield* Leaderboard;
      const standing = yield* leaderboard.standing(inside, 't10', 'day');

      assert.deepStrictEqual(standing, { rank: null, total: 0, best: null });
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('all time keeps the better round when a slower one is verified later', () =>
    Effect.gen(function* () {
      yield* atTestEpoch;
      const player = yield* seedPlayer('Improver');
      yield* seedRound({
        playerId: player,
        elapsedMs: 25_000,
        finishedAtMs: testEpochMs - 30 * day,
      });
      yield* seedRound({ playerId: player, elapsedMs: 60_000, finishedAtMs: testEpochMs - minute });

      const leaderboard = yield* Leaderboard;
      const allTime = yield* leaderboard.standing(player, 't10', 'all');
      const today = yield* leaderboard.standing(player, 't10', 'day');

      assert.strictEqual(allTime.best?.elapsedMs, 25_000);
      assert.strictEqual(today.best?.elapsedMs, 60_000);
    }).pipe(Effect.provide(TestLayer)),
  );
});

/** Seeds 5,000 players and 20,000 rounds over 60 days, a quarter of them not verified. */
const seedHistory = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const epoch = new Date(testEpochMs);

  yield* sql`
    INSERT INTO players (id, created_at, last_seen_at, nickname_en, nickname_ar)
    SELECT md5('player' || n)::uuid, ${epoch}, ${epoch}, 'P' || n, 'P' || n
    FROM generate_series(0, 4999) AS n
  `;
  yield* sql`
    INSERT INTO rounds (id, player_id, mode, lang, catalog_version, status, started_at,
      finished_at, elapsed_ms, score_key)
    SELECT
      md5('round' || g)::uuid,
      md5('player' || (g % 5000))::uuid,
      (ARRAY['t10', 't50', 't100'])[1 + g % 3],
      'en', 'test',
      CASE WHEN g % 4 = 0 THEN 'abandoned' ELSE 'verified' END,
      ${epoch}::timestamptz - (g * interval '259 seconds') - interval '1 minute',
      ${epoch}::timestamptz - (g * interval '259 seconds'),
      20000 + (g * 7919) % 100000,
      20000 + (g * 7919) % 100000
    FROM generate_series(0, 19999) AS g
  `;
  yield* sql`
    INSERT INTO best_all_time (mode, player_id, round_id, score_key, elapsed_ms, achieved_at)
    SELECT DISTINCT ON (mode, player_id) mode, player_id, id, score_key, elapsed_ms, finished_at
    FROM rounds WHERE status = 'verified'
    ORDER BY mode, player_id, score_key, finished_at
  `;
  yield* sql`ANALYZE`;
});

const explain = Effect.fn('explain')(function* (statement: {
  compile(): readonly [string, readonly unknown[]];
}) {
  const sql = yield* SqlClient.SqlClient;
  const [text, params] = statement.compile();
  const rows = yield* sql.unsafe<Record<string, string>>(`EXPLAIN ${text}`, params);

  // The one column is "QUERY PLAN", which the camelCase transform renames.
  return rows.flatMap((row) => Object.values(row)).join('\n');
});

describe('Query plans', () => {
  it.effect('use the board indexes, not sequential scans of rounds', () =>
    Effect.gen(function* () {
      yield* atTestEpoch;
      yield* seedHistory;
      const sql = yield* SqlClient.SqlClient;
      const player = '00000000-0000-0000-0000-000000000000';
      const query = (period: BoardQuery['period']): BoardQuery => ({
        mode: 't10',
        period,
        nowMs: testEpochMs,
      });

      const plans = {
        topDay: yield* explain(topQuery(sql, query('day'), 'en')),
        topWeek: yield* explain(topQuery(sql, query('week'), 'en')),
        topAll: yield* explain(topQuery(sql, query('all'), 'en')),
        standingDay: yield* explain(standingQuery(sql, query('day'), player)),
        standingAll: yield* explain(standingQuery(sql, query('all'), player)),
      };

      // Failures print the plan, which is the useful part.
      for (const [name, plan] of Object.entries(plans)) {
        assert.notInclude(plan, 'Seq Scan on rounds', `${name}:\n${plan}`);
      }

      assert.include(plans.topDay, 'rounds_board_window_idx');
      assert.include(plans.topWeek, 'rounds_board_window_idx');
      assert.include(plans.standingDay, 'rounds_board_window_idx');
      assert.include(plans.topAll, 'Index Only Scan using best_all_time_board_idx');
      assert.include(plans.standingDay, 'rounds_player_best_idx');
      assert.include(plans.standingAll, 'best_all_time_board_idx');
    }).pipe(Effect.provide(TestLayer)),
  );
});
