/**
 * Leaderboard SQL, as statement builders so tests can `EXPLAIN` exactly what the service runs.
 *
 * Day and week are rolling windows with no reset time, so a per-period "best" table cannot be
 * kept current: a player's best drops out of the window as time passes. Those boards read
 * verified `rounds` and take each player's best inside the window with `DISTINCT ON`. The partial
 * index `rounds_board_window_idx (mode, finished_at) INCLUDE (player_id, score_key, elapsed_ms)
 * WHERE status = 'verified'` makes that one index-only range scan over the window, so the cost is
 * the number of rounds in the window, not in history. All time never forgets, so `best_all_time`
 * keeps one row per player, upserted on verify, and `best_all_time_board_idx` serves the top 50
 * in order.
 *
 * Ties go to the earlier achievement. Equal scores achieved in the same millisecond share a rank
 * (`rank()`), and "my rank" is one more than the players strictly ahead, which agrees with it.
 */
import 'server-only';
import type { Locale } from '@nxc/game/i18n/config';
import type { RankedMode } from '@nxc/game/ranked/modes';
import type { SqlClient } from 'effect/sql';

export const periods = ['day', 'week', 'all'] as const;

export type Period = (typeof periods)[number];

export const windowMsByPeriod: Readonly<Record<Exclude<Period, 'all'>, number>> = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
};

export const boardSize = 50;

type Sql = SqlClient.SqlClient;

/** Each active player's best on a board: player_id, score_key, elapsed_ms, achieved_at. */
export function boardRows(sql: Sql, mode: RankedMode, period: Period, nowMs: number) {
  if (period === 'all') {
    return sql`
      SELECT b.player_id, b.score_key, b.elapsed_ms, b.achieved_at
      FROM best_all_time b
      JOIN players p ON p.id = b.player_id AND p.status = 'active'
      WHERE b.mode = ${mode}
    `;
  }

  const since = new Date(nowMs - windowMsByPeriod[period]);

  return sql`
    SELECT DISTINCT ON (r.player_id)
      r.player_id, r.score_key, r.elapsed_ms, r.finished_at AS achieved_at
    FROM rounds r
    JOIN players p ON p.id = r.player_id AND p.status = 'active'
    WHERE r.mode = ${mode} AND r.status = 'verified' AND r.finished_at > ${since}
    ORDER BY r.player_id, r.score_key, r.finished_at
  `;
}

export type BoardQuery = Readonly<{ mode: RankedMode; period: Period; nowMs: number }>;

export function topQuery(sql: Sql, { mode, period, nowMs }: BoardQuery, lang: Locale) {
  return sql`
    WITH board AS (${boardRows(sql, mode, period, nowMs)})
    SELECT
      (rank() OVER (ORDER BY board.score_key, board.achieved_at))::int4 AS rank,
      COALESCE(h.display, CASE WHEN ${lang}::text = 'ar' THEN p.nickname_ar ELSE p.nickname_en END)
        AS name,
      (h.id IS NULL) AS anonymous,
      board.elapsed_ms::int4 AS elapsed_ms,
      board.achieved_at
    FROM board
    JOIN players p ON p.id = board.player_id
    LEFT JOIN handles h ON h.id = p.handle_id
    ORDER BY board.score_key, board.achieved_at, board.player_id
    LIMIT ${boardSize}
  `;
}

/**
 * One row: the board's size, and the player's rank and best (both null when not on it).
 * `NOT MATERIALIZED` lets each use of `board` take its own index: the player's best comes from
 * `rounds_player_best_idx` (or the `best_all_time` key), and the all-time "players ahead" count is
 * a range on `best_all_time_board_idx`.
 */
export function standingQuery(sql: Sql, { mode, period, nowMs }: BoardQuery, playerId: string) {
  return sql`
    WITH board AS NOT MATERIALIZED (${boardRows(sql, mode, period, nowMs)}),
    mine AS (SELECT * FROM board WHERE player_id = ${playerId}::uuid)
    SELECT
      (SELECT count(*) FROM board)::int4 AS total,
      CASE WHEN mine.player_id IS NULL THEN NULL ELSE (
        SELECT count(*) + 1 FROM board
        WHERE (board.score_key, board.achieved_at) < (mine.score_key, mine.achieved_at)
      )::int4 END AS rank,
      mine.elapsed_ms::int4 AS elapsed_ms,
      mine.achieved_at
    FROM (SELECT 1) AS one
    LEFT JOIN mine ON true
  `;
}

export type VerifiedRound = Readonly<{
  mode: RankedMode;
  playerId: string;
  roundId: string;
  scoreKey: number;
  elapsedMs: number;
  achievedAt: Date;
}>;

/** Keeps the better of the stored and the new best. */
export function upsertBestQuery(sql: Sql, round: VerifiedRound) {
  return sql`
    INSERT INTO best_all_time (mode, player_id, round_id, score_key, elapsed_ms, achieved_at)
    VALUES (
      ${round.mode}, ${round.playerId}::uuid, ${round.roundId}::uuid,
      ${round.scoreKey}, ${round.elapsedMs}, ${round.achievedAt}
    )
    ON CONFLICT (mode, player_id) DO UPDATE SET
      round_id = excluded.round_id,
      score_key = excluded.score_key,
      elapsed_ms = excluded.elapsed_ms,
      achieved_at = excluded.achieved_at
    WHERE (excluded.score_key, excluded.achieved_at)
      < (best_all_time.score_key, best_all_time.achieved_at)
  `;
}
