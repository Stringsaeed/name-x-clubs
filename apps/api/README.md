# api

The ranked game's HTTP API: a [Hono](https://hono.dev) app that mounts the route table from `@nxc/server` at `/api/*` (rounds, leaderboards, health). On Vercel it is the `api` service of the same deployment as the website; the root `vercel.json` rewrites `/api/(.*)` to it, so browsers call it same-origin. See [docs/decisions/003-api-service.md](../../docs/decisions/003-api-service.md).

| File | Role |
| --- | --- |
| `src/app.ts` | The Hono app and its routes. Unknown paths answer `404 { "error": "NotFound" }`. |
| `src/index.ts` | Default-exports the app; the entry point of the Vercel bundle. |
| `src/server.ts` | Local Node server (`@hono/node-server`) on `127.0.0.1:$PORT`, default 4100. |
| `scripts/db-migrate.ts` | Applies the SQL migrations from `@nxc/server`. |
| `scripts/bundle.mjs` | Bundles `src/index.ts` and every dependency into `dist/index.js` with esbuild. |

## Run locally

```sh
cp apps/api/.env.example apps/api/.env.local   # then set DATABASE_URL, or `vercel env pull`
pnpm db:migrate
pnpm dev                                        # web on :5173 and api on :4100
```

`pnpm --filter api dev` starts only the API. The Next.js dev server rewrites `/api/*` to `http://127.0.0.1:4100`, forwarding the browser's `Origin`, so `ALLOWED_ORIGINS` must include `http://localhost:5173,http://127.0.0.1:5173`. Without a database every route answers 503 and `GET /api/health` returns `{"db":"unavailable"}`.

## Migrations per environment

| Environment | How it migrates |
| --- | --- |
| Local | `pnpm db:migrate` against `apps/api/.env.local` (`DATABASE_URL_UNPOOLED`, else `DATABASE_URL`). |
| Preview | The API's Vercel build (`pnpm build`, `--vercel`) migrates when `VERCEL_ENV=preview`. Preview must have its own database (a Neon branch), never production's. |
| Production | The same build step with `VERCEL_ENV=production`. |

Anywhere else, `--vercel` logs a skip and exits 0. Migrations are idempotent and run under a table lock, so concurrent builds are safe.

## Environment

| Variable | Used for |
| --- | --- |
| `DATABASE_URL` | Pooled Postgres URL for request handlers. |
| `DATABASE_URL_UNPOOLED` | Direct URL for migrations; falls back to `DATABASE_URL`. |
| `RATE_LIMIT_SECRET` | Keys the daily IP hash for rate limits. Required when `NODE_ENV=production`. |
| `ALLOWED_ORIGINS` | Extra comma-separated origins allowed to POST. |
| `CAPTCHA_ENABLED` | `true` holds completed rounds until `finish` passes the captcha. Off by default. |
| `PORT` | Local server port, default 4100. |
| `VERCEL_ENV` | Set by Vercel; decides whether the build migrates. |
