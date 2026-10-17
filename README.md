# Name × Clubs

A bilingual football game with Free time and category practice. Name 10, 50 or 100 clubs in English or Arabic, including common abbreviations and clear spelling mistakes. Accepted clubs appear in order above a bottom composer, with real crests from a bundled 200-club collection. English uses Nunito and Arabic uses Alan Sans.

## Run

Use the Node version in `.node-version`, then:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` starts Next.js on `http://127.0.0.1:5173`. No account, database or runtime sports API is required by the game.

The phone app is `apps/mobile`, Expo SDK 58. It plays the same free-time and practice rounds against the shared catalog, ranks Free time rounds through the production API and shows the leaderboard. It needs a development build (sound uses `react-native-audio-api`, which is native). From `apps/mobile`:

```sh
npx expo run:ios        # or: npx expo run:android
npx expo start --dev-client
```

Set `EXPO_PUBLIC_API_URL` to point ranked rounds and the leaderboard at another server (default `https://clubs.saeed.sh`). Design notes live in `apps/mobile/docs/`.

Catalogs compile automatically: Turborepo runs `i18n:compile` before `dev`, `build`, `test` and `typecheck`. After changing UI text, run `pnpm i18n:extract` to update the PO catalogs in `apps/web/src/locales/`, then translate the new entries.

## Stack

| Responsibility | Implementation |
| --- | --- |
| UI | React 19 with semantic HTML and responsive CSS |
| Framework | Next.js 16.4 App Router, server output. `/en` and `/ar` are prerendered; `/` is a route handler that redirects to a locale |
| Types | TypeScript 7 in strict mode, including unchecked indexes and exact optional properties |
| i18n | Lingui 6.9. SWC macro plugin in Next, Vite plugin in Vitest, PO catalogs compiled before each run |
| Stored-data validation | Zod 4 |
| Unit and component tests | Vitest 5 and Testing Library |
| Browser regression tests | Playwright against `next start`, desktop Chromium and mobile WebKit |
| Formatting and lint | Biome 2 with readability rules |
| Workspace | pnpm workspaces and Turborepo. The Next.js app is `apps/web` |
| CI | GitHub Actions. A pull request runs once; a newer push cancels the run in progress. Lint and unit tests run beside the production build and Playwright |
| Hosting | Vercel, with the project Root Directory set to `apps/web`. Cloudflare would use `@opennextjs/cloudflare` |

Dependencies use exact versions. The build does not require credentials or secrets.

## Verify before shipping

```sh
pnpm check
pnpm --filter web exec playwright install chromium webkit
pnpm test:e2e
```

`check` runs lint, then Turborepo runs the i18n catalog check, unit and component tests, and `next build`, which includes type-checking. `pnpm test:e2e` builds the app first, then runs Playwright against `next start` on port 4173. Traces and screenshots are retained on failure; `pnpm --filter web exec playwright show-report` opens the report.

Browser tests need a normal terminal outside restricted sandboxes. Native browsers may fail to register with macOS from a sandboxed process, and the test launcher refuses to start them there. Linux CI runs the same suite.

For active development use `pnpm test:watch`, `pnpm typecheck`, or `pnpm format`. `pnpm test:coverage` reports game-module coverage. Known issues and open checks are listed in [docs/discovery.md](docs/discovery.md).

## Architecture

```text
apps/web/                Next.js app. Turborepo runs its dev, build, and test tasks
apps/mobile/             Expo SDK 58 app for the same free-time and practice rounds
apps/web/src/app/        Routes: [lang]/layout (root layout, sets lang and dir), [lang]/page,
                         [lang]/error, route.ts (locale redirect), icon.svg
apps/web/src/screens/    GameScreen, the client component that renders the game
apps/web/src/components/ Answer list, composer, timer, results and accessible help dialog
apps/web/src/game/       Round logic, controller, browserStore (localStorage)
apps/web/src/content/    Bilingual copy (labels)
apps/web/src/i18n/       server (server-only), client provider, negotiate (locale choice)
packages/game/src/       @nxc/game: club catalog and content JSON, matcher (engine, matching/*, model), locale list
apps/web/src/locales/    PO catalogs per locale; compiled messages.ts is generated and ignored
apps/web/src/fonts/      Nunito and Alan Sans files and licenses, loaded with next/font
apps/web/src/styles/     Game stylesheet
apps/web/public/assets/  Pitch illustration and 200 reviewed club crests
apps/web/tests/e2e/      Browser tests against the production server
```

Rendering model:

- The server renders a fixed idle snapshot (free mode, level 10, no answers). It does not read browser storage.
- After hydration, `browserStore` reads localStorage through `useSyncExternalStore`, using the fixed snapshot as the server snapshot. Saved progress appears once the client has mounted.
- The language comes from the route (`/en` or `/ar`), which also sets `lang` and `dir` on the server.
- The cookie `nxc-language` remembers the chosen locale. `/` reads it, falls back to `Accept-Language`, and redirects with `Cache-Control: private, no-store`.

React sends user intents to the controller and subscribes to its snapshot. The controller owns selection, browser storage, elapsed time and storage events. The pure round transition owns acceptance, deduplication, target limits and completion. The UI never independently decides whether an answer counts.

See [the architecture decisions](docs/decisions/) for the rationale behind the current frontend and the superseded React/Vite choice.

## Game and persistence rules

- Free time offers Mode 10, Mode 50 and Mode 100 with clubs from anywhere.
- The timer starts at 00:00 and counts up, including time spent away from the tab. It never expires and freezes when the target is reached or the player finishes.
- Free time and Practice save their actual question, start timestamp, phase and ordered club IDs in versioned records per target. Refreshing preserves elapsed time.
- Daily is disabled pending a new design. Previous daily saves remain untouched.
- Legacy Practice lists migrate with their selected question and answers. Their elapsed measurement starts at migration because the old format had no start time.
- Zod validates browser records before they enter the game model. Corrupt records fall back to a new round. Blocked browser storage does not prevent play.
- Every selectable category contains enough clubs to complete its level. Higher levels use broad worldwide or European pools.
- Country questions refer to a club's football country, not its current division. Monaco belongs to the French pool. Letter questions use the common English name.
- Progress and scores are local to a browser. No server-verified leaderboard or cross-device account is implied.

## Club data and artwork

`packages/game/src/content/clubs.json` is the curated source of club names, Arabic names and aliases. `packages/game/src/content/catalog.ts` validates it and provides the typed catalog. Club IDs are stable; do not renumber existing records when adding a club.

All crests are local files under `apps/web/public/assets/crests`. `sources.json` preserves reviewed identities, original ESPN/Wikipedia source URLs, retrieval date and checksums. Artwork and trademarks remain with their respective owners. Crests are plain `<img>` elements that load as needed and keep an initials fallback if unavailable. No external image service runs during play.

Run `pnpm assets:restore` to restore missing files from their reviewed sources. Matching local files are retained. The script regenerates `packages/game/src/content/crests.json`; tests reject missing, mismatched or altered assets. Review identity mappings before adding artwork.

## Deploy

Production is the Vercel project `name-x-clubs` (team `stringsaeeds-projects`), connected to GitHub `Stringsaeed/name-x-clubs`. The project Root Directory is `apps/web`, so Vercel installs this pnpm workspace from the repository root and builds the Next.js app. Pushes to `main` deploy production; other branches get preview deployments, protected by Vercel Authentication. `NEXT_PUBLIC_SITE_URL` is set for production. It is used for `metadataBase` and the hreflang alternates.

Custom domains: `name-x-clubs.saeed.sh` and `clubs.saeed.sh` are attached. DNS for saeed.sh is on Cloudflare, so each needs a DNS-only (grey cloud) CNAME to `cname.vercel-dns.com`.

Run the browser suite against any deployment with `E2E_BASE_URL=https://… pnpm test:e2e`. pnpm 12 rejects packages published less than 24 hours ago (`minimumReleaseAge`). If an install fails for that reason, pin to an older release.

The earlier ChatGPT Sites prototype is retired and no longer published. Progress is stored per origin, so players do not carry saved rounds from the prototype URL to the new host.
