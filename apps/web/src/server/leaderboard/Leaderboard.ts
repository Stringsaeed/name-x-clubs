/** Public boards over rolling windows. The SQL and its index design are in `queries.ts`. */
import 'server-only';
import type { Locale } from '@nxc/game/i18n/config';
import { Clock, Context, Effect, Layer, Option, Schema } from 'effect';
import { SqlClient, type SqlError } from 'effect/sql';
import { decodeFirstRow, decodeRows } from '../db/rows';
import type { RankedMode } from '../rounds/modes';
import {
  type Period,
  standingQuery,
  topQuery,
  upsertBestQuery,
  type VerifiedRound,
} from './queries';

export { type Period, periods, type VerifiedRound } from './queries';

export type BoardEntry = Readonly<{
  rank: number;
  name: string;
  anonymous: boolean;
  elapsedMs: number;
  achievedAt: string;
}>;

export type Standing = Readonly<{
  rank: number | null;
  total: number;
  best: { elapsedMs: number; achievedAt: string } | null;
}>;

const BoardRow = Schema.Struct({
  rank: Schema.Number,
  name: Schema.String,
  anonymous: Schema.Boolean,
  elapsedMs: Schema.Number,
  achievedAt: Schema.Date,
});

const StandingRow = Schema.Struct({
  total: Schema.Number,
  rank: Schema.NullOr(Schema.Number),
  elapsedMs: Schema.NullOr(Schema.Number),
  achievedAt: Schema.NullOr(Schema.Date),
});

const decodeBoard = decodeRows(BoardRow);

const decodeStanding = decodeFirstRow(StandingRow);

const offTheBoard: Standing = { rank: null, total: 0, best: null };

function toStanding(row: typeof StandingRow.Type): Standing {
  if (row.rank === null || row.elapsedMs === null || row.achievedAt === null) {
    return { rank: null, total: row.total, best: null };
  }

  return {
    rank: row.rank,
    total: row.total,
    best: { elapsedMs: row.elapsedMs, achievedAt: row.achievedAt.toISOString() },
  };
}

export class Leaderboard extends Context.Service<
  Leaderboard,
  {
    top(
      mode: RankedMode,
      period: Period,
      lang: Locale,
    ): Effect.Effect<readonly BoardEntry[], SqlError.SqlError>;
    standing(
      playerId: string,
      mode: RankedMode,
      period: Period,
    ): Effect.Effect<Standing, SqlError.SqlError>;
    recordVerified(round: VerifiedRound): Effect.Effect<void, SqlError.SqlError>;
  }
>()('nxc/server/Leaderboard') {
  static readonly layer = Layer.effect(
    Leaderboard,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;

      const top = Effect.fn('Leaderboard.top')(function* (
        mode: RankedMode,
        period: Period,
        lang: Locale,
      ) {
        const nowMs = yield* Clock.currentTimeMillis;
        const rows = yield* topQuery(sql, { mode, period, nowMs }, lang);
        const entries = yield* decodeBoard(rows);

        return entries.map((entry) => ({ ...entry, achievedAt: entry.achievedAt.toISOString() }));
      });

      const standing = Effect.fn('Leaderboard.standing')(function* (
        playerId: string,
        mode: RankedMode,
        period: Period,
      ) {
        const nowMs = yield* Clock.currentTimeMillis;
        const rows = yield* standingQuery(sql, { mode, period, nowMs }, playerId);
        const row = yield* decodeStanding(rows);

        return Option.match(row, { onNone: () => offTheBoard, onSome: toStanding });
      });

      const recordVerified = Effect.fn('Leaderboard.recordVerified')(function* (
        round: VerifiedRound,
      ) {
        yield* upsertBestQuery(sql, round);
      });

      return Leaderboard.of({ top, standing, recordVerified });
    }),
  );
}
