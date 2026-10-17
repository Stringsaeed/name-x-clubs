import 'server-only';
import { createHmac } from 'node:crypto';
import { Clock, Context, Effect, Layer, Schema } from 'effect';
import { SqlClient, type SqlError } from 'effect/sql';
import { ServerConfig } from '../config';
import { decodeRows } from '../db/rows';
import { RateLimited } from '../errors';

export type RateLimitRule = Readonly<{ limit: number; windowMs: number }>;

export const rateLimitRules = {
  /** New anonymous players per client address. */
  createPlayer: { limit: 10, windowMs: 60 * 60 * 1000 },
  startRound: { limit: 30, windowMs: 60 * 60 * 1000 },
  answers: { limit: 120, windowMs: 60 * 1000 },
} as const satisfies Record<string, RateLimitRule>;

const CountRow = Schema.Struct({ count: Schema.Number });

const decodeCount = decodeRows(CountRow);

export function windowStartOf(nowMs: number, windowMs: number) {
  return nowMs - (nowMs % windowMs);
}

/** A daily, secret-keyed digest of the client address. The address itself is never stored. */
export function clientKeyFor(address: string, nowMs: number, secret: string) {
  const day = new Date(nowMs).toISOString().slice(0, 10);

  return createHmac('sha256', secret).update(`${day}:${address}`).digest('base64url');
}

/** A fixed-window counter in Postgres, shared by every function instance. */
export class RateLimit extends Context.Service<
  RateLimit,
  {
    consume(key: string, rule: RateLimitRule): Effect.Effect<void, RateLimited | SqlError.SqlError>;
    clientKey(address: string): Effect.Effect<string>;
  }
>()('nxc/server/RateLimit') {
  static readonly layer = Layer.effect(
    RateLimit,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const config = yield* ServerConfig;

      const consume = Effect.fn('RateLimit.consume')(function* (key: string, rule: RateLimitRule) {
        const nowMs = yield* Clock.currentTimeMillis;
        const windowStart = windowStartOf(nowMs, rule.windowMs);
        const rows = yield* sql`
          INSERT INTO rate_limits (key, window_start, count)
          VALUES (${key}, ${new Date(windowStart)}, 1)
          ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
          RETURNING count
        `;
        const [counter] = yield* decodeCount(rows);

        if (counter && counter.count > rule.limit) {
          const retryAfterMs = windowStart + rule.windowMs - nowMs;

          return yield* new RateLimited({ retryAfterSeconds: Math.ceil(retryAfterMs / 1000) });
        }
      });

      const clientKey = (address: string) =>
        Effect.map(Clock.currentTimeMillis, (nowMs) =>
          clientKeyFor(address, nowMs, config.rateLimitSecret),
        );

      return RateLimit.of({ consume, clientKey });
    }),
  );
}
