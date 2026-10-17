# 003: The backend is its own service

Status: accepted. Extends [002](002-nextjs.md); the ranked backend design in [docs/design/leaderboard-and-identity.md](../design/leaderboard-and-identity.md) is unchanged except for hosting shape.

## Context

A mobile app will play the same ranked game. The backend lived inside the Next.js app as Route Handlers, so a mobile client could only reach it through the website's deployment, and the website could not build without the server's dependencies. The backend must have its own deployable unit and the shared game logic must be importable by web, server and mobile.

## Decision

Workspace layout:

| Package | Name | Role |
| --- | --- | --- |
| `packages/game` | `@nxc/game` | Pure, framework-free code every client and the server share: club catalog and content JSON, matcher (`engine`, `matching/*`, `model`), the locale list, and the ranked API contract (`ranked/modes`, `ranked/types`: wire types and the mode table). No Effect, no React, no Lingui. |
| `packages/server` | `@nxc/server` | The Effect 4 services, Postgres layer, SQL migrations, HTTP route table (`makeRoutes`, plain `Request` in, `Response` out) and the PGlite test harness. Framework-free. No `server-only`. |
| `apps/api` | `api` | A Hono app on Vercel Functions (Node runtime, Fluid Compute) that mounts `makeRoutes` at the same `/api/*` paths the Route Handlers served. Owns the database environment and runs migrations. |
| `apps/web` | `web` | Next.js, UI only. Depends on `@nxc/game`, never on `@nxc/server` or `effect`. Reaches the API over HTTP. |

Routing:

- On Vercel the project is one deployment with two Services (`vercel.json` at the repo root; the project's Root Directory must be the repo root). Top-level rewrites send `/api/(.*)` to the `api` service and everything else to `web`. The browser therefore still talks same-origin: the session cookie, origin check and CDN caching are unchanged.
- The `web` service gets a service binding to `api` as `API_ORIGIN`. Server components (the leaderboard page) fetch public boards from `API_ORIGIN` with a 30 second revalidate instead of calling the Effect runtime.
- Locally, `next.config.ts` rewrites `/api/:path*` to `API_ORIGIN`, which defaults to `http://127.0.0.1:4100`, the local Hono server. On Vercel the top-level rewrite wins before Next.js sees the request.

Environments, each testable on its own:

| Environment | Web | API | Database |
| --- | --- | --- | --- |
| Local | `next dev` on 5173 | `@hono/node-server` on 4100 | `apps/api/.env.local` (`vercel env pull` for the development branch, or any Postgres URL) |
| Local browser tests | `next start` on 4173 | Hono on 4101 | `E2E_DATABASE_URL` only; never `.env.local` |
| Preview | Vercel preview deployment | same deployment | the Preview environment's `DATABASE_URL`; must be a separate database (Neon branch) because the API build migrates it |
| Production | Vercel production | same deployment | the Production environment's `DATABASE_URL` |

Browser tests run against any environment with `E2E_BASE_URL`. Migrations run in the API build when `VERCEL_ENV` is `production` or `preview`, and from `pnpm db:migrate` elsewhere.

Out of scope here, planned for the mobile client: bearer-token sessions next to the cookie, CORS, API path versioning, and a native attestation check in place of the browser captcha.

## Consequences

- `web` builds without a database or Effect. The client-bundle check for Effect is no longer needed because `web` cannot resolve the package.
- A deploy ships both services atomically; a preview URL always has a matching API. Independent rollbacks would need a second Vercel project, which is a config change only.
- Server-rendered boards pay an in-region HTTP hop to the API instead of a direct query.
- Unit tests move with their modules: matcher tests to `packages/game`, PGlite tests to `packages/server`. `pnpm test` still runs everything through Turborepo.
