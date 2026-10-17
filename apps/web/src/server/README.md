# Server (ranked rounds and leaderboards)

Effect 4 programs behind thin Next.js Route Handlers in `src/app/api/`. Every module here imports `server-only`. A Biome rule keeps `effect` out of `src/game`, `src/components`, `src/screens` and `src/hooks`, and `pnpm check:client-bundle` fails the build check if Effect reaches `.next/static` or an API route opts into the Edge runtime.

## Layout

| Path | Role |
| --- | --- |
| `runtime.ts` | The one `ManagedRuntime`, created on the first request. A runtime that fails to build (no database) is dropped and rebuilt on the next request. |
| `layers.ts` | Wires every service over a database layer and a config layer. |
| `http/` | Request decoding (unknown properties are 400s), origin check, session cookie, and `toResponse`, the one place errors become HTTP statuses. |
| `rounds/` | Pure `replay.ts` (shared matcher, 3 clubs per entry) and `pace.ts`, plus `RoundStore` and the `programs.ts` behind the `Rounds` service. |
| `leaderboard/` | Rolling day and week boards and the all-time board. `queries.ts` explains the index design. |
| `identity/`, `nicknames/` | Anonymous players, hashed session tokens, generated EN/AR nicknames. |
| `rateLimit/`, `captcha/` | Postgres fixed-window limits; a captcha stub that passes, used only when `CAPTCHA_ENABLED=true`. |
| `migrations/` | Plain SQL, one statement per `;` at a line end, applied in file-number order. |

## Environment

| Variable | Used for |
| --- | --- |
| `DATABASE_URL` | Request handlers. Neon's pooled (PgBouncer, transaction mode) URL. Prepared-statement caching is off for it. |
| `DATABASE_URL_UNPOOLED` | Migrations. Falls back to `DATABASE_URL`. |
| `RATE_LIMIT_SECRET` | Keys the daily IP hash in rate-limit keys. Required in production (`NODE_ENV=production`, including local `next start`); the server refuses to start API requests without it. |
| `ALLOWED_ORIGINS` | Optional comma-separated extra origins allowed to POST. |
| `CAPTCHA_ENABLED` | `true` holds completed rounds at `complete` until `finish`. Off by default. |

`next build` never reads these: nothing touches the database at import time or during prerender.

## Migrations

```sh
DATABASE_URL_UNPOOLED=postgres://… pnpm db:migrate
```

The migrator records applied files in `nxc_migrations` and holds a table lock while it works, so running it again, or from two deploys at once, is safe and fast. `pnpm vercel-build` runs it with `--production-only` before `pnpm build`, which migrates only when `VERCEL_ENV=production`. Add a migration as a new `000N_name.sql` file; never edit one that has been applied in production.

## Tests

`pnpm test` runs a separate `server` Vitest project in Node (not jsdom) for `src/server/**/*.test.ts`. No database is needed:

- `testing/testApp.ts` builds the real services on in-process PGlite with the real migrations, and Effect's `TestClock` as the only clock. HTTP tests call the route handlers with plain `Request`s.
- Service tests use `@effect/vitest` (`it.effect`), which also provides `TestClock`.
- `leaderboard.test.ts` seeds 20,000 rounds and checks with `EXPLAIN` that the board queries use their indexes.

## Driver notes

- `@effect/sql-pg` decodes `int8` and `count(*)` as `bigint`, PGlite as `number`. Cast numbers in SQL (`::int4`) before decoding rows.
- Rows come back camelCase in both drivers (`transformResultNames`).
- JSON arrays (`found`, `flags`) are written as `${JSON.stringify(value)}::jsonb`; the driver rejects empty JS array parameters.
