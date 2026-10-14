# Leaderboards, Mode X and identity

Status: proposal, 2026-10-14. Not implemented. Open decisions are listed at the end.

## Platform facts

- **Apple Game Center has no web API.** It needs a native iOS/macOS app or a native wrapper around the web game, and it does not exist on Android. The only server-side piece is identity verification (`fetchItems(forIdentityVerificationSignature:)`), which also needs the native app.
- **Google Play Games Services is the Android equivalent.** Sign-in and score submission are Android-only. PGS v1 shuts down in 2027 ([deprecation](https://developer.android.com/games/pgs/deprecation)). No official web submission path was found.
- **Consequence: the leaderboard is our own backend.** If a native wrapper ever exists, it links Game Center or Play Games identities to our players, and native boards mirror our verified scores.
- **In-app browsers isolate storage.** X, Instagram and TikTok open links in their own WKWebView or Android WebView, whose cookies and storage are not shared with Safari or Chrome. Safari also caps script-written storage at 7 days without interaction ([WebKit tracking prevention](https://webkit.org/tracking-prevention/)). Google blocks its OAuth inside embedded webviews (`disallowed_useragent`), and passkeys are unreliable there. Progress therefore has to live on the server, keyed by a server-set httpOnly cookie, with a way to move it to another browser.

## Mode X

- **Rules.** One ranked board, "Mode X · 3:00": world scope, countdown timed by the server. The score is unique accepted clubs. Ties go to the earlier last accepted club, then the earlier finish. Stopping early is allowed.
- **Shorter or longer rounds.** 1:00 and 5:00 can exist as unranked play. Several ranked durations would split a small player base into empty boards.
- **The catalog caps the score.** Today it is 200 clubs. A larger Wikidata-based catalog changes what scores mean, so each round stores a `catalog_version`. See the open decision on seasons.

## Architecture

- **Client.** Plain TypeScript. `src/game/engine.ts` and `round.ts` stay pure and are imported by both client and server.
- **Server.** Effect 4 under `src/server/**` (`server-only`), called from thin Next.js Route Handlers through one lazily created `ManagedRuntime`.
  - **Services.** `PlayerStore`, `RoundStore`, `Leaderboard`, `Moderation`, `RateLimit`, `Captcha` and `EdgeCache` are Context tags with Layers. Time comes from Effect `Clock`, so tests use `TestClock`.
  - **Schemas.** Effect Schema decodes requests and rejects excess properties, so a forged `elapsedMs` field becomes a 400.
  - **Errors.** Tagged errors map to HTTP in one place: 400, 401, 404, 409, 422, 429, 403 and 503.
  - **Packages.** Effect 4 ships HTTP, Schema and SQL in `effect` itself. Use `@effect/sql-pg`, `@effect/sql-pglite` and `@effect/vitest` at 4.x, and do not install the v3-line `@effect/platform`.
  - **Bundle boundary.** A Biome `noRestrictedImports` rule keeps `effect` out of `src/game`, `src/components` and `src/screens`. A CI check fails if `.next/static` contains Effect.
- **Database: Postgres on Neon** (Frankfurt, close to Gulf and Egypt players).
  - On Vercel: a small `PgClient` pool on Neon's pooled endpoint.
  - On Cloudflare: Hyperdrive, with a request-scoped client, because Workers cannot share sockets across requests.
  - Tests: PGlite runs the real migrations in-process.
  - D1 is rejected: it would lock in the host and add a second SQL dialect.
- **Abuse protection.** Turnstile checks only when a round enters the board. Edge rate rules run in front of a Postgres fixed-window `RateLimit` service.

## Server-authoritative rounds

1. **Start.** `POST /api/rounds` stores `started_at` from the server clock and returns `serverNow`, so the on-screen timer matches the server.
2. **Optimistic feedback.** The client keeps running the pure transition locally for instant feedback.
3. **Sending answers.** Each entry gets a `seq`. One request is in flight at a time, and entries queue only while a request is pending. Holding answers back can only make a time slower.
4. **Server scoring.** The server replays entries through the same matcher and stamps the receive time.
   - Ranked time is the receive time of the batch that completes the target.
   - Client-reported times are only consistency checks.
   - Duplicate `seq` values are idempotent, and a gap returns 409 with `expectedSeq`.
5. **Pace policy.**
   - Hard reject only impossible rounds: Mode 10 under 5 s, Mode 50 under 30 s, Mode 100 under 60 s.
   - Flag suspicious pace and hold the round off public boards.
   - Tune both from logged gaps after launch.
6. **Entry caps.** Ranked rounds accept up to 120 characters, 3 clubs per entry and 10 entries per request. This blunts pasting a prepared list; see the open decisions.
7. **Connection loss.** More than 15 s without the server continues the round locally as "unranked (connection)". Local and Practice rounds are never uploaded.

## Identity

- **Anonymous by default.** A player is created on the first ranked start.
  - The `nxc_s` cookie is httpOnly, Secure, SameSite=Lax and lasts 400 days with sliding renewal. The database stores only its hash.
  - A device key in localStorage and IndexedDB can restore a lost cookie.
- **Recovery code.** For example `NXC-7KQ2-M9HD-4TRW`, about 60 bits, stored as a hash. It is shown once after the first verified round, with copy, share-to-self and QR options. Generating a new one revokes the old.
- **Transfer link.** In-app browsers are detected by user-agent tokens such as `Instagram`, `FBAN/FBAV` and `Twitter`. A slim banner offers "Open in Safari/Chrome to keep your progress". It creates a single-use link that expires in 10 minutes, with its secret in the URL fragment. Android can try an `intent://` link to open Chrome. iOS has no reliable automatic escape, so the banner explains the menu step.
- **Usernames (optional).**
  - Format: 3–16 characters, Latin or Arabic letters (one script per name), digits and `_`.
  - Uniqueness is checked on a skeleton: NFKC, lowercase, confusables folded, and the engine's Arabic folding (alef, yaa, taa marbuta, diacritics, tatweel).
  - Reserved words: `admin`, `official` and the game name.
  - Renames have a 30-day cooldown.
  - Profanity filtering uses `obscenity` for English. Arabic and Arabizi need a curated list reviewed by a native speaker.
- **Display.** Anonymous players show as `Player #4F2A`.
- **Later.** Passkeys, and `identity_links(provider, subject)` for Game Center or Play Games if a native wrapper ships.

## Data model (Postgres, UUIDv7)

```sql
players(id, created_at, last_seen_at, status, handle_id)
credentials(hash pk, player_id, kind /*session|device|recovery|transfer*/, expires_at, revoked_at)
handles(id, player_id, display, skeleton /*unique while claimed*/, held_until)
identity_links(provider, subject, player_id, pk(provider, subject))
rounds(id, player_id, mode, catalog_version, started_at, deadline_at, finished_at, status,
       found, elapsed_ms, score_key, next_seq, flags)
round_entries(round_id, seq, received_ms, client_ms, text, accepted, pk(round_id, seq))
best_scores(mode, period /*d:2026-10-14|w:2026-W42|all*/, player_id, round_id, score_key, achieved_at,
            pk(mode, period, player_id))  -- index (mode, period, score_key, achieved_at)
rate_limits(key, window_start, count)
```

- **One sort key.** `score_key` sorts every board ascending. Timed modes use `elapsed_ms`; Mode X uses `(10000 − clubs) × 10^7 + last_ms`.
- **Updating bests.** Verifying a round upserts its three period rows in one transaction.
- **Queries.** Top-N is `ORDER BY score_key, achieved_at LIMIT 50`. "My rank" is `1 + count(*)` of rows ahead of mine.
- **Retention.**
  - Round entries: 30 days.
  - Unreferenced rounds: 180 days.
  - Daily bests: 60 days.
  - IPs: kept only as daily-salted HMACs, for 7 days.
- **Privacy.** `GET /api/me/export` and `DELETE /api/me` cover export and deletion. There is no email and no real name.

## API

| Route | Purpose | Caching |
| --- | --- | --- |
| `POST /api/rounds` | Start a ranked round and create the player if missing | no-store |
| `GET /api/rounds/:id` | Resume after reload | no-store |
| `POST /api/rounds/:id/answers` | `{seq, entries}` → authoritative `found`, events, phase | no-store |
| `POST /api/rounds/:id/finish` | Finish and get day, week and all-time ranks (Turnstile if entering the board) | no-store |
| `GET /api/leaderboards/:mode?period=` | Public board; never reads cookies | `s-maxage=30, stale-while-revalidate=60`; Cloudflare Cache API on Workers |
| `GET /api/leaderboards/:mode/me` | My rank | private |
| `GET/DELETE /api/me`, `GET /api/me/export`, `PUT /api/me/handle` | Profile, deletion, export, username | no-store |
| `POST /api/identity/{recovery-code,transfer,redeem,restore}` | Move identity between browsers | rate-limited |

## Desktop layout

The mockups show three ways to fill the empty side of the game card on desktop.

- **A, live pitch:** crests drop into formation slots, with a crest wall for Mode 50 and 100.
- **B, side rail:** leaderboard and personal bests.
- **C, round stats.**

Recommendation: A while playing, and B's compact "To beat" card plus top 5 before and after a round. Both reuse existing assets and add no explanatory copy.

## Phases

0. **Spike.** Fix the matcher exploits (in progress). Prove Effect 4 with `sql-pg` against Neon on Vercel, and through Hyperdrive on Workers via OpenNext. Measure bundle size and cold start.
1. **First boards.** Anonymous cookie, server rounds, the Mode 10 board (day and all time) and "my rank". Tests use `@effect/vitest` with `TestClock` and PGlite against forged times, `seq` replay, foreign round ids and impossible pace. Playwright covers a ranked round on the board, offline fallback and resume on reload.
2. **Identity and more boards.** Usernames, moderation, recovery code, transfer link and banner, Turnstile, Modes 50 and 100, weekly boards.
3. **Mode X and data lifecycle.** Mode X 3:00, retention sweep, export, deletion, report and hide.
4. **Later.** Passkeys, native identity links, Redis cache only if p95 latency needs it.

## Open decisions

1. Daily and weekly reset on UTC or Asia/Riyadh (GMT+3)?
2. Mode X: a single ranked 3:00 board, with 1:00 and 5:00 unranked?
3. Ranked entries: up to 3 clubs per entry (recommended), or exactly one? This decides how much pasting ranked play allows.
4. Show anonymous players on public boards as `Player #4F2A`, or only players with a username?
5. When the catalog grows from 200 to 1,200+ clubs: start a new season, or keep all-time boards running?
6. Budget for about $5–25 a month: Neon beyond the free tier, and Workers Paid if Cloudflare is chosen.
