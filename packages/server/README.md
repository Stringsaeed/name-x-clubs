# @nxc/server (ranked rounds and leaderboards)

Effect 4 services, the Postgres layer, the SQL migrations and the HTTP route table for ranked play. Framework-free: `makeRoutes` takes a standard `Request` and returns a `Response`, and `apps/api` mounts each route at its `/api/*` path. The package ships as TypeScript source (`exports: "./*": "./src/*.ts"`); nothing here may run at import time.

## Layout

| Path | Role |
| --- | --- |
| `src/runtime.ts` | `routes`: the route table over the one `ManagedRuntime`, created on the first request. A runtime that fails to build (no database) is dropped and rebuilt on the next request. |
| `src/layers.ts` | Wires every service over a database layer and a config layer. |
| `src/http/` | Request decoding (unknown properties are 400s), origin check, session cookie, and `toResponse`, the one place errors become HTTP statuses. `routes.ts` holds `makeRoutes`. |
| `src/rounds/` | `RoundStore` and the `programs.ts` behind the `Rounds` service. The replay and pace rules they use live in `@nxc/game/ranked/*`. |
| `src/leaderboard/` | Rolling day and week boards and the all-time board. `queries.ts` explains the index design. |
| `src/identity/`, `src/nicknames/` | Anonymous players, hashed session tokens, generated EN/AR nicknames. |
| `src/rateLimit/`, `src/captcha/` | Postgres fixed-window limits; a captcha stub that passes, used only when `CAPTCHA_ENABLED=true`. |
| `src/db/` | The `@effect/sql-pg` pool (`Database.ts`) and the migrator (`migrations.ts`), which reads `src/migrations/` from disk next to itself. |
| `src/migrations/` | Plain SQL, one statement per `;` at a line end, applied in file-number order. |
| `src/testing/` | The PGlite test app. |

## Environment

| Variable | Used for |
| --- | --- |
| `DATABASE_URL` | Request handlers. Neon's pooled (PgBouncer, transaction mode) URL. Prepared-statement caching is off for it. |
| `DATABASE_URL_UNPOOLED` | Migrations. Falls back to `DATABASE_URL`. |
| `RATE_LIMIT_SECRET` | Keys the daily IP hash in rate-limit keys. Required when `NODE_ENV=production`; the runtime refuses to build without it, so every route answers 503. |
| `ALLOWED_ORIGINS` | Optional comma-separated extra origins allowed to POST. |
| `CAPTCHA_ENABLED` | `true` holds completed rounds at `complete` until `finish`. Off by default. |

Nothing reads these at import time, so loading or bundling the API needs no database.

## Migrations

```sh
pnpm db:migrate
```

runs `apps/api/scripts/db-migrate.ts` (see `apps/api/README.md` for how each environment migrates). The migrator records applied files in `nxc_migrations` and holds a table lock while it works, so running it again, or from two deploys at once, is safe and fast. Add a migration as a new `000N_name.sql` file; never edit one that has been applied in production.

## Tests

`pnpm --filter @nxc/server test` runs Vitest in Node. No database is needed:

- `src/testing/testApp.ts` builds the real services on in-process PGlite with the real migrations, and Effect's `TestClock` as the only clock. HTTP tests call the route handlers with plain `Request`s.
- Service tests use `@effect/vitest` (`it.effect`), which also provides `TestClock`.
- `leaderboard.test.ts` seeds 20,000 rounds and checks with `EXPLAIN` that the board queries use their indexes.

## Driver notes

- `@effect/sql-pg` decodes `int8` and `count(*)` as `bigint`, PGlite as `number`. Cast numbers in SQL (`::int4`) before decoding rows.
- Rows come back camelCase in both drivers (`transformResultNames`).
- JSON arrays (`found`, `flags`) are written as `${JSON.stringify(value)}::jsonb`; the driver rejects empty JS array parameters.
