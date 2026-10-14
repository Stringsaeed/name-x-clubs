import 'server-only';
import { Clock, Context, Crypto, Effect, Layer, Option, Schema } from 'effect';
import { SqlClient, type SqlError } from 'effect/sql';
import { sha256Hex } from '../crypto';
import { decodeFirstRow } from '../db/rows';
import { type Nickname, Nicknames } from '../nicknames/Nicknames';

/** The session cookie lives 400 days (the browser maximum) and is renewed on each ranked start. */
export const sessionLifetimeMs = 400 * 24 * 60 * 60 * 1000;

const sessionTokenBytes = 32;

export type Player = Readonly<{ id: string; nickname: Nickname }>;

export type NewPlayer = Readonly<{ player: Player; sessionToken: string }>;

/** The database keeps only this digest, so a leaked table cannot be replayed as cookies. */
export function hashSessionToken(token: string) {
  return sha256Hex(token);
}

const PlayerRow = Schema.Struct({
  id: Schema.String,
  nicknameEn: Schema.String,
  nicknameAr: Schema.String,
});

const decodePlayer = decodeFirstRow(PlayerRow);

function toPlayer(row: typeof PlayerRow.Type): Player {
  return { id: row.id, nickname: { en: row.nicknameEn, ar: row.nicknameAr } };
}

export class PlayerStore extends Context.Service<
  PlayerStore,
  {
    findBySession(token: string): Effect.Effect<Option.Option<Player>, SqlError.SqlError>;
    createAnonymous(): Effect.Effect<NewPlayer, SqlError.SqlError>;
    renewSession(token: string): Effect.Effect<void, SqlError.SqlError>;
  }
>()('nxc/server/PlayerStore') {
  static readonly layer = Layer.effect(
    PlayerStore,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const crypto = yield* Crypto.Crypto;
      const nicknames = yield* Nicknames;

      const newSessionToken = Effect.map(
        Effect.orDie(crypto.randomBytes(sessionTokenBytes)),
        (bytes) => Buffer.from(bytes).toString('base64url'),
      );

      const findBySession = Effect.fn('PlayerStore.findBySession')(function* (token: string) {
        const now = new Date(yield* Clock.currentTimeMillis);
        const rows = yield* sql`
          SELECT p.id::text AS id, p.nickname_en, p.nickname_ar
          FROM credentials c
          JOIN players p ON p.id = c.player_id
          WHERE c.token_hash = ${hashSessionToken(token)}
            AND c.kind = 'session'
            AND c.revoked_at IS NULL
            AND c.expires_at > ${now}
            AND p.status = 'active'
        `;
        const row = yield* decodePlayer(rows);

        return Option.map(row, toPlayer);
      });

      const createAnonymous = Effect.fn('PlayerStore.createAnonymous')(function* () {
        const nowMs = yield* Clock.currentTimeMillis;
        const now = new Date(nowMs);
        const expiresAt = new Date(nowMs + sessionLifetimeMs);
        const id = yield* Effect.orDie(crypto.randomUUIDv7());
        const nickname = nicknames.forPlayer(id);
        const sessionToken = yield* newSessionToken;

        yield* sql.withTransaction(
          Effect.gen(function* () {
            yield* sql`
              INSERT INTO players (id, created_at, last_seen_at, nickname_en, nickname_ar)
              VALUES (${id}::uuid, ${now}, ${now}, ${nickname.en}, ${nickname.ar})
            `;
            yield* sql`
              INSERT INTO credentials (token_hash, player_id, kind, created_at, expires_at)
              VALUES (${hashSessionToken(sessionToken)}, ${id}::uuid, 'session', ${now}, ${expiresAt})
            `;
          }),
        );

        return { player: { id, nickname }, sessionToken };
      });

      const renewSession = Effect.fn('PlayerStore.renewSession')(function* (token: string) {
        const nowMs = yield* Clock.currentTimeMillis;
        const tokenHash = hashSessionToken(token);

        yield* sql`
          UPDATE credentials SET expires_at = ${new Date(nowMs + sessionLifetimeMs)}
          WHERE token_hash = ${tokenHash} AND kind = 'session' AND revoked_at IS NULL
        `;
        yield* sql`
          UPDATE players SET last_seen_at = ${new Date(nowMs)}
          WHERE id = (SELECT player_id FROM credentials WHERE token_hash = ${tokenHash})
        `;
      });

      return PlayerStore.of({ findBySession, createAnonymous, renewSession });
    }),
  );
}
