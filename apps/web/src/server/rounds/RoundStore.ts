import 'server-only';
import type { ClubId } from '@nxc/game/content/catalog';
import { type Locale, locales } from '@nxc/game/i18n/config';
import { Context, Effect, Layer, Option, Schema } from 'effect';
import { SqlClient, type SqlError } from 'effect/sql';
import { decodeFirstRow, jsonParam } from '../db/rows';
import { type RankedMode, rankedModes } from './modes';
import type { PaceFlag } from './pace';

export const roundStatuses = [
  'playing',
  'complete',
  'verified',
  'flagged',
  'rejected',
  'abandoned',
] as const;

export type RoundStatus = (typeof roundStatuses)[number];

const RoundRow = Schema.Struct({
  id: Schema.String,
  playerId: Schema.String,
  mode: Schema.Literals(rankedModes),
  lang: Schema.Literals(locales),
  status: Schema.Literals(roundStatuses),
  startedAt: Schema.Date,
  finishedAt: Schema.NullOr(Schema.Date),
  found: Schema.Array(Schema.String),
  nextSeq: Schema.Number,
  elapsedMs: Schema.NullOr(Schema.Number),
  flags: Schema.Array(Schema.String),
});

export type RoundRecord = Readonly<{
  id: string;
  playerId: string;
  mode: RankedMode;
  /** The language the round started in. Owner-only responses name the player in it by default. */
  lang: Locale;
  status: RoundStatus;
  startedAt: Date;
  finishedAt: Date | null;
  found: readonly ClubId[];
  nextSeq: number;
  elapsedMs: number | null;
  flags: readonly PaceFlag[];
}>;

export type NewRound = Readonly<{
  id: string;
  playerId: string;
  mode: RankedMode;
  lang: Locale;
  catalogVersion: string;
  startedAt: Date;
}>;

export type StoredEntry = Readonly<{
  seq: number;
  receivedMs: number;
  clientMs: number;
  text: string;
  accepted: readonly ClubId[];
}>;

export type RoundProgress = Readonly<{
  found: readonly ClubId[];
  nextSeq: number;
  flags: readonly PaceFlag[];
}>;

export type RoundOutcome = Readonly<{
  status: RoundStatus;
  finishedAt: Date;
  elapsedMs: number | null;
  scoreKey: number | null;
  flags: readonly PaceFlag[];
}>;

const decodeRound = decodeFirstRow(RoundRow);

/** Stored ids and flags were written by this module, so the casts only restore their brands. */
function toRecord(row: typeof RoundRow.Type): RoundRecord {
  return { ...row, found: row.found as ClubId[], flags: row.flags as PaceFlag[] };
}

export class RoundStore extends Context.Service<
  RoundStore,
  {
    create(round: NewRound): Effect.Effect<void, SqlError.SqlError>;
    findPlaying(playerId: string): Effect.Effect<Option.Option<RoundRecord>, SqlError.SqlError>;
    abandonStartedBefore(playerId: string, before: Date): Effect.Effect<void, SqlError.SqlError>;
    find(
      roundId: string,
      playerId: string,
    ): Effect.Effect<Option.Option<RoundRecord>, SqlError.SqlError>;
    /** Like `find`, and locks the row until the surrounding transaction ends. */
    lock(
      roundId: string,
      playerId: string,
    ): Effect.Effect<Option.Option<RoundRecord>, SqlError.SqlError>;
    appendEntries(
      roundId: string,
      entries: readonly StoredEntry[],
    ): Effect.Effect<void, SqlError.SqlError>;
    saveProgress(roundId: string, progress: RoundProgress): Effect.Effect<void, SqlError.SqlError>;
    close(roundId: string, outcome: RoundOutcome): Effect.Effect<void, SqlError.SqlError>;
  }
>()('nxc/server/RoundStore') {
  static readonly layer = Layer.effect(
    RoundStore,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;

      const roundColumns = sql`
        id::text AS id, player_id::text AS player_id, mode, lang, status, started_at, finished_at,
        found, next_seq, elapsed_ms, flags
      `;

      const create = Effect.fn('RoundStore.create')(function* (round: NewRound) {
        yield* sql`
          INSERT INTO rounds (id, player_id, mode, lang, catalog_version, status, started_at)
          VALUES (
            ${round.id}::uuid, ${round.playerId}::uuid, ${round.mode}, ${round.lang},
            ${round.catalogVersion}, 'playing', ${round.startedAt}
          )
        `;
      });

      const findPlaying = Effect.fn('RoundStore.findPlaying')(function* (playerId: string) {
        const rows = yield* sql`
          SELECT ${roundColumns} FROM rounds
          WHERE player_id = ${playerId}::uuid AND status = 'playing'
        `;

        return Option.map(yield* decodeRound(rows), toRecord);
      });

      const abandonStartedBefore = Effect.fn('RoundStore.abandonStartedBefore')(function* (
        playerId: string,
        before: Date,
      ) {
        yield* sql`
          UPDATE rounds SET status = 'abandoned', finished_at = ${before}
          WHERE player_id = ${playerId}::uuid AND status = 'playing' AND started_at < ${before}
        `;
      });

      const find = Effect.fn('RoundStore.find')(function* (roundId: string, playerId: string) {
        const rows = yield* sql`
          SELECT ${roundColumns} FROM rounds
          WHERE id = ${roundId}::uuid AND player_id = ${playerId}::uuid
        `;

        return Option.map(yield* decodeRound(rows), toRecord);
      });

      const lock = Effect.fn('RoundStore.lock')(function* (roundId: string, playerId: string) {
        const rows = yield* sql`
          SELECT ${roundColumns} FROM rounds
          WHERE id = ${roundId}::uuid AND player_id = ${playerId}::uuid
          FOR UPDATE
        `;

        return Option.map(yield* decodeRound(rows), toRecord);
      });

      const appendEntry = (roundId: string, entry: StoredEntry) => sql`
        INSERT INTO round_entries (round_id, seq, received_ms, client_ms, text, accepted)
        VALUES (
          ${roundId}::uuid, ${entry.seq}, ${entry.receivedMs}, ${entry.clientMs}, ${entry.text},
          ${jsonParam(entry.accepted)}::jsonb
        )
      `;

      const appendEntries = Effect.fn('RoundStore.appendEntries')(function* (
        roundId: string,
        entries: readonly StoredEntry[],
      ) {
        for (const entry of entries) {
          yield* appendEntry(roundId, entry);
        }
      });

      const saveProgress = Effect.fn('RoundStore.saveProgress')(function* (
        roundId: string,
        progress: RoundProgress,
      ) {
        yield* sql`
          UPDATE rounds SET
            found = ${jsonParam(progress.found)}::jsonb,
            next_seq = ${progress.nextSeq},
            flags = ${jsonParam(progress.flags)}::jsonb
          WHERE id = ${roundId}::uuid
        `;
      });

      const close = Effect.fn('RoundStore.close')(function* (
        roundId: string,
        outcome: RoundOutcome,
      ) {
        yield* sql`
          UPDATE rounds SET
            status = ${outcome.status},
            finished_at = ${outcome.finishedAt},
            elapsed_ms = ${outcome.elapsedMs},
            score_key = ${outcome.scoreKey},
            flags = ${jsonParam(outcome.flags)}::jsonb
          WHERE id = ${roundId}::uuid
        `;
      });

      return RoundStore.of({
        create,
        findPlaying,
        abandonStartedBefore,
        find,
        lock,
        appendEntries,
        saveProgress,
        close,
      });
    }),
  );
}
