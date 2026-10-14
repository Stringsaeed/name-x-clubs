# Name × Clubs

A bilingual football game with Free time and category practice. Name 10, 50 or 100 clubs in English or Arabic, including common abbreviations and clear spelling mistakes. Accepted clubs appear in order above a bottom composer, with real crests from a bundled 200-club collection. English uses Nunito and Arabic uses Alan Sans.

## Run

Use the Node version in `.node-version`, then:

```sh
npm ci
npm run dev
```

`npm run dev` starts Next.js on `http://127.0.0.1:5173`. No account, database or runtime sports API is required by the game.

Catalogs compile automatically: `predev`, `prebuild`, `pretest` and `pretypecheck` run `npm run i18n:compile`. After changing UI text, run `npm run i18n:extract` to update the PO catalogs in `src/locales/`, then translate the new entries.

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
| CI | GitHub Actions, a pinned Node version and committed npm lockfile |
| Hosting | Vercel or Cloudflare, not yet chosen. Vercel works with no config; Cloudflare will use `@opennextjs/cloudflare` |

Dependencies use exact versions. The build does not require credentials or secrets.

## Verify before shipping

```sh
npm run check
npx playwright install chromium webkit
npm run test:e2e
```

`check` runs lint, the i18n catalog check, unit and component tests, and `next build`, which includes type-checking. `test:e2e` runs against `next start` on port 4173, so run `npm run build` first. Traces and screenshots are retained on failure; `npx playwright show-report` opens the report.

Browser tests need a normal terminal outside restricted sandboxes. Native browsers may fail to register with macOS from a sandboxed process, and the test launcher refuses to start them there. Linux CI runs the same suite.

For active development use `npm run test:watch`, `npm run typecheck`, or `npm run format`. `npm run test:coverage` reports game-module coverage. Known issues and open checks are listed in [docs/discovery.md](docs/discovery.md).

## Architecture

```text
src/app/                 Routes: [lang]/layout (root layout, sets lang and dir), [lang]/page,
                         [lang]/error, route.ts (locale redirect), icon.svg
src/screens/             GameScreen, the client component that renders the game
src/components/          Answer list, composer, timer, results and accessible help dialog
src/game/                Pure matching/round logic, controller, browserStore (localStorage)
src/content/             Typed club catalog, generated crest paths and bilingual copy
src/i18n/                config, server (server-only), client provider, negotiate (locale choice)
src/locales/             PO catalogs per locale; compiled messages.ts is generated and ignored
src/fonts/               Nunito and Alan Sans files and licenses, loaded with next/font
src/styles/              Game stylesheet
public/assets/           Pitch illustration and 200 reviewed club crests
tests/e2e/               Browser tests against the production server
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

`src/content/clubs.json` is the curated source of club names, Arabic names and aliases. `src/content/catalog.ts` validates it and provides the typed catalog. Club IDs are stable; do not renumber existing records when adding a club.

All crests are local files under `public/assets/crests`. `sources.json` preserves reviewed identities, original ESPN/Wikipedia source URLs, retrieval date and checksums. Artwork and trademarks remain with their respective owners. Crests are plain `<img>` elements that load as needed and keep an initials fallback if unavailable. No external image service runs during play.

Run `npm run assets:restore` to restore missing files from their reviewed sources. Matching local files are retained. The script regenerates `src/content/crests.json`; tests reject missing, mismatched or altered assets. Review identity mappings before adding artwork.

## Deploy

**Vercel.** Import the repository, keep the framework preset as Next.js, and leave build settings empty. Set `NEXT_PUBLIC_SITE_URL` to the production origin (for example `https://example.com`). It is used for `metadataBase` and the hreflang alternates.

**Cloudflare.** Not configured yet. The plan is to use `@opennextjs/cloudflare`; no Cloudflare config is committed.

The earlier ChatGPT Sites prototype is retired and no longer published. Progress is stored per origin, so players do not carry saved rounds from the prototype URL to the new host.
