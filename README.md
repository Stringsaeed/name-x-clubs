# Name × Clubs

A bilingual football game with Free time and category practice. Name 10, 50 or 100 clubs in English or Arabic, including common abbreviations and clear spelling mistakes. Accepted clubs appear in order above a bottom composer, with real crests from a bundled 200-club collection. English uses Nunito and Arabic uses Alan Sans.

## Run

Use the Node version in `.node-version`, then:

```sh
npm ci
npm run dev
```

Open the printed local URL. No account, database or runtime sports API is required by the game.

## Stack

| Responsibility | Implementation |
| --- | --- |
| UI | React 19, semantic HTML and responsive CSS |
| Build | Vite 8 with hashed application assets |
| Types | TypeScript 7 in strict mode, including unchecked indexes and exact optional properties |
| Stored-data validation | Zod 4 |
| Unit and component tests | Vitest 5 and Testing Library |
| Browser regression tests | Playwright, desktop Chromium and mobile WebKit |
| Formatting and lint | Biome 2 |
| CI | GitHub Actions, a pinned Node version and committed npm lockfile |
| Hosting | Static `dist/` output; Vercel or Cloudflare (not yet chosen) |

Dependencies use exact versions. The build does not require credentials or environment secrets.

## Verify before shipping

```sh
npm run check
npx playwright install chromium webkit
npm run test:e2e
```

`check` runs formatting/lint checks, unit and component tests, strict type checking, and the production build. Browser tests start the built site's preview server automatically on port 4173. They test the compiled app rather than the development server. Traces and screenshots are retained on failure; `npx playwright show-report` opens the report.

On macOS, run browser tests from a normal terminal. The test launcher refuses to start native browsers inside Codex's restricted command sandbox, which blocks macOS application registration and can produce native crash dialogs. Approved execution outside that sandbox and Linux CI use the same full suite.

For active development use `npm run test:watch`, `npm run typecheck`, or `npm run format`. `npm run test:coverage` reports game-module coverage. `.github/workflows/ci.yml` runs the same checks and uploads browser reports when the source is hosted on GitHub. A workflow file alone is not a remote CI result.

## Architecture

```text
src/content/     Typed club catalog, generated crest paths and bilingual copy
src/game/        Pure matching/round logic and one browser-state controller
src/components/  Answer list, composer, timer, results and accessible help dialog
src/app/         Page composition, behavior tests and responsive styling
public/assets/   Fonts, licenses, illustration and 200 reviewed club crests
tests/e2e/       Browser tests against the production build
dist/            Generated static output, ignored by Git
```

React sends user intents to the controller and subscribes to its snapshot. The controller owns selection, browser storage, elapsed time and storage events. The pure round transition owns acceptance, deduplication, target limits and completion. The UI never independently decides whether an answer counts.

See [the architecture decision](docs/decisions/001-production-frontend.md) for the React/Vite choice and its tradeoffs.

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

`src/content/clubs.json` is the curated source of club names, Arabic names and aliases. `src/content/catalog.ts` validates it and provides the typed catalog. Club IDs are stable; do not renumber existing records when adding a club.

All crests are local files under `public/assets/crests`. `sources.json` preserves reviewed identities, original ESPN/Wikipedia source URLs, retrieval date and checksums. Artwork and trademarks remain with their respective owners. Images load as needed and retain an initials fallback if unavailable. No external image service runs during play.

Run `npm run assets:restore` to restore missing files from their reviewed sources. Matching local files are retained. The script regenerates `src/content/crests.json`; tests reject missing, mismatched or altered assets. Review identity mappings before adding artwork.

## Deploy

The build is a plain static site: `npm run build` writes `dist/`, which deploys unchanged to Vercel (framework preset Vite, output `dist`) or Cloudflare (Workers static assets or Pages, output `dist`). The provider is not chosen yet, so no provider config is committed.

The earlier ChatGPT Sites prototype is retired and no longer published. Progress is stored per origin, so players do not carry saved rounds from the prototype URL to the new host.
