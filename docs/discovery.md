# Discovery: October 2026

Audit of the React/Vite build at `702fb2c`, before the Next.js migration. Each finding was reproduced against the real modules or measured in a browser. Line numbers refer to that commit.

## Summary

- **No confirmed memory leaks.** After forced GC the heap is 2.45 MB at load, 4.68 MB with 100 answers, and still 4.68 MB after 40 mode switches. Every listener, interval and timeout is cleaned up.
- **The matcher has real false positives.** Multi-word names that are not in the catalog are split, and the pieces are credited as other clubs. For example, "Real Mallorca" scores Real Madrid and Mallorca.
- **Progress can be lost across tabs.** A stale in-memory cache can overwrite a round saved by another tab.
- **The main performance cost is assets, not React.** Crests total 1.88 MB and fonts 475 KB of TTF that is neither subset nor woff2. JavaScript is 115 KB gzip.
- **Readability.** There are no blank lines between declarations. `createGameController` is about 220 lines in one closure, `GameApp` is about 275 lines, and there are nested ternaries and brace-less one-liners. The current Biome config enables almost no lint rules.
- **Tooling health.** Lint, types and 31 unit tests pass. Coverage is 91% statements and 81% branches. `npm audit` reports nothing. Components have no direct tests.

## Defects

### High

| # | Where | Problem | Repro | Fix |
| --- | --- | --- | --- | --- |
| H1 | `engine.ts:133-170` | Leftover words of an unknown entry are matched as separate clubs. | `Real Mallorca` → Real Madrid + Mallorca. `Sporting Braga` → Sporting CP + Braga. `Arsenal de Sarandi` → Arsenal. `الهلال السوداني` → Al Hilal. | Accept a split only when every chunk resolves. Otherwise report the whole entry as unknown. |
| H2 | `controller.ts:146-149`, `258-265` | The storage event refreshes only the visible level. Other levels keep a stale cache that later overwrites another tab's save. | Tab A visits 50 and returns to 10. Tab B finds 3 clubs on 50. Tab A opens 50 and sees an idle round; Start erases B's round. | Invalidate the cache for any changed `nxc-v2-*` key, or always re-read storage in `load`. |
| H3 | `engine.ts:103-116` | Fuzzy matching credits the wrong club. | `Bayer` → Bayern. `Angers`, `Randers` → Rangers. `Juventude` → Juventus. `الاهلي القطري` → Al Ahly (Egypt). | Allow two edits only at 10+ characters. Treat fuzzy hits on short names, or hits on the last word alone, as unknown or ambiguous. |

### Medium

| # | Where | Problem | Fix |
| --- | --- | --- | --- |
| M1 | `engine.ts:94-102` | The hard-coded ambiguity regex mostly never runs, because exact aliases match first. `Real` → Real Madrid and `Inter` → Inter Milan. `Sheffield`, `Borussia`, `Madrid` and `Los Angeles` return unknown instead of asking for clarification. | Move ambiguity into data (an `ambiguous` alias list) and check it before the exact lookup. |
| M2 | `clubs.json` | English and Arabic disagree. `Al Ittihad` → Saudi, but `الاتحاد` → ambiguous. Same for `Al Nasr` and `النصر`. | Give the shared English names the same ambiguity as the Arabic ones. |
| M3 | `controller.ts:114` | If the clock moves backwards (`startedAt > now`), the saved round is discarded and the next Start overwrites it. | Clamp `startedAt` to `now()`. |
| M4 | `controller.ts:262-264` | An invalid value from another tab (garbage, or a future schema) resets the current round to idle, and that empty round is then saved. | Replace the view only when the incoming record parses. |
| M5 | `engine.ts:118-172` | A 12k-character junk paste blocks the main thread for 570–824 ms. Each unknown part runs the fuzzy search twice, and the eligible set is rebuilt for every part. | Cache the eligible set per scope, skip the second pass for single words, and cap the number of parts. |
| M6 | `AnswerComposer.tsx:73` | The answer field is a single-line `<input>`. Native paste in Chromium and WebKit turns `Arsenal\nChelsea\nLiverpool` into `Arsenal Chelsea Liverpool`. That list only works because of the word-splitting fallback that causes H1, so fixing H1 alone would break newline pastes. | Convert pasted newlines to commas in `onPaste` before tightening the splitter. |
| M7 | `round.ts:24` | Elapsed time keeps running while the player is on another mode or level. | Decide whether switching should pause. If it should, store accumulated time plus a resume timestamp. |

### Low

- **L1. Saved time values are not bounded.** `elapsed: 1e15` restores, and a practice record whose `category` does not match its `challengeId` restores. Add bounds and a consistency check (`controller.ts:35-50`, `105-126`).
- **L2. The v1 migration loses data.** Completed rounds become `00:00`, and idle records that contain clubs fall back to a world session (`controller.ts:160-176`).
- **L3. Parser noise.**
  - Emoji-only and `---` parts produce empty unknown inputs.
  - `'&'` in the separator list can never match, because `normalize` removes it.
  - `123Arsenal` matches but `Arsenal123` does not.
  - Wrong-scope `النصر` reports ambiguous instead of wrong category.
- **L4. Toast timer.** The toast does not restart when the same message is shown twice (`GameApp.tsx:44-47`).
- **L5. Unused fuzzy flag.** `Resolution.fuzzy` is never read, so there is no "did you mean" path.

### Dead code

- `durationForTarget`, `dailyChallenge`, `dailyStorageKey`, `remainingSeconds` and `dayKey` in `engine.ts` are used only by tests. Daily mode will be redesigned.
- The `tick` intent and action are never dispatched by the UI.
- `Challenge.difficulty` is never read.
- 16 of 91 CSS class selectors have no reference in TSX: `answer-slot(s)`, `challenge-label`, `difficulty`, `filled`, `footer-center`, `game-bottom`, `game-rules`, `game-topline`, `icon-defs`, `input-hint`, `pill`, `slot-check`, `slot-name`, `slot-number` and `status-dot`.

## Memory and performance

Measured in headless Chromium against the production preview.

| Priority | Finding | Evidence | Fix |
| --- | --- | --- | --- |
| High | Crests are oversized. | 199 PNGs, 1.88 MB. Mostly 96×96, some 120×205, displayed at 32 px. All load once a 100-club round completes. | Square 64×64 WebP/AVIF, about 150–250 KB in total. |
| High | Fonts are full TTF. | `nunito.ttf` 277 KB and `alan-sans.ttf` 198 KB, not subset and not woff2. | Subset to Latin and Arabic, convert to woff2, and let `next/font` handle preloading. |
| Medium | `AnswerList` memo never applies before a round completes. | The `empty` element is new on every render, `namedClubs()` allocates a new array, and rows are not memoised. Measured submit-to-frame is 13.9 ms average and 15.4 ms peak at 100 rows. | Pass primitives, `useMemo` the club list, and memoise rows. |
| Medium | Bundle size. | 386 KB JS (115 KB gzip). `clubs.json` and the whole of Zod are in the entry chunk. A 1.7 MB source map is emitted into `dist/`. | Validate content at build time, keep Zod for storage only, and use hidden source maps. |
| Low | Timer ticks four times per second. | 250 ms interval, whole-second display. It re-renders only itself. | Tick once per second, aligned to the second boundary. |
| Low | Rows re-animate. | All 100 rows replay `message-in` on every mode switch. | Animate only newly added rows. |
| Low | One dialog effect is expensive. | `backdrop-filter` and a 100 px shadow on the help dialog only. | Acceptable. |

Startup is fine: DOMContentLoaded in 40–61 ms, FCP in 76–116 ms, and no long tasks from building the alias map or the Zod parse. Under StrictMode, `useState(createGameController)` builds a second controller that is discarded without holding resources. That is not a leak, but the Next.js store below removes it anyway.

## Readability

Biome cannot enforce blank lines: the formatter keeps existing blank lines but never adds them. Spacing therefore needs one manual pass, done during the refactor.

| Area | Problem | Direction |
| --- | --- | --- |
| `controller.ts` | One closure holds storage I/O, wire parsing, load and restore, migration, dispatch and sharing. It has 8 shadowed names, an `if` ladder in `dispatch`, and nested ternaries at lines 171, 278 and 318. | Split into `storage.ts`, `session-store.ts`, `share.ts` and a thin controller. Use a `switch` per intent and named validity checks. |
| `engine.ts` | `normalize` is a chain of unnamed regexes. `resolveClub` normalises, looks up exactly, guards and runs fuzzy matching in one function. `distance` uses one-letter names. | Name the regex constants. Split into `exactMatch` and `fuzzyMatch` with readable loop variables. |
| `GameApp.tsx` | A 275-line component with five effects and `language === 'en' ? … : …` repeated about 8 times. | Split into `Header`, `Hero`, `LevelPicker`, `PracticeControls`, `ChallengeHeading` and `Progress`, plus `useViewportHeight` and `useToast`. Lingui replaces the inline strings. |

### Proposed Biome rules (middle strictness)

The `recommended` preset, plus:

- **Error:**
  - `noNestedTernary`
  - `useBlockStatements` (auto-fixable)
  - `noParameterAssign`
  - `noNonNullAssertion`
  - `noUselessElse`
  - `useCollapsedElseIf`
  - `useConst`
  - `useTemplate`
  - `useSingleVarDeclarator`
  - `useConsistentArrayType`
  - `noUselessTernary`
  - `noUnusedImports`
  - `noUnusedVariables`
  - `useExhaustiveDependencies`
  - `useHookAtTopLevel`
  - `noExplicitAny`
- **Warn:**
  - `noExcessiveCognitiveComplexity` (max 15)
  - `noExcessiveLinesPerFunction` (60 lines, blank lines not counted, off for tests)
  - `noShadow`
  - `noForEach`
  - `noUnusedFunctionParameters`
  - `noConsole` (allows `error` and `warn`; off for scripts and config)
- **Left out:**
  - `useFilenamingConvention` and `useNamingConvention` conflict with Next's `page.tsx` and `GET` conventions.
  - `noMagicNumbers` and `useExplicitType` are too strict for this level.

Applying these rules to the current code raises:

| Rule | Hits | Level |
| --- | --- | --- |
| `useBlockStatements` | 49 | error, auto-fixed |
| `noShadow` | 10 | warn |
| `noExcessiveCognitiveComplexity` | 6 | warn |
| `noNestedTernary` | 4 | error |
| `noExcessiveLinesPerFunction` | 3 | warn |

The warnings point directly at the refactors above.

## Tests and CI

- **Coverage.** `engine.ts` is at 98% statements and `controller.ts` at 83%. The uncovered parts of `controller.ts` are the share and storage-event paths.
- **No direct tests.** Components, `labels.ts` and `round.ts` are exercised only through `GameApp` and the controller.
- **Gaps that let defects through.** No tests cover H1–H3 or cross-tab overwrites.
- **CI.** Actions are pinned by tag, not by commit SHA. Coverage is not enforced.
- **Node version.** `.node-version` is 24.21.0, but the local machine runs 26.7.0.

## Next.js migration

The full plan is in the migration commits. The key decisions:

- **Versions.** Next 16.4.0, React 19.3, TypeScript 7. Next 16.4 type-checks through the project's `tsc` when TS 7 is installed.
- **Output.** Default server output, not `output: 'export'`, so Route Handlers are available for the future club resolver. Node runtime only and no `next/image`, so it deploys to Vercel as-is and to Cloudflare through `@opennextjs/cloudflare`.
- **Routing.** `/en` and `/ar` routes are statically generated, and `<html lang dir>` is rendered on the server. `/` is a Route Handler that redirects to the language from the cookie, then `Accept-Language`, then English. Progress keys stay per origin, so both languages share saves.
- **Persistence.** A lazily created per-tab controller is read through `useSyncExternalStore` with a fixed server snapshot, so there is no hydration mismatch and the duplicate StrictMode controller goes away.
- **Lingui.** `@lingui/swc-plugin` handles macros, and precompiled `.ts` catalogs are shared by Next and Vitest. Compatibility with Next 16.4's SWC is unverified, so it is tested first.
- **Fonts.** Nunito and Alan Sans through `next/font/local`.

## Order of work

1. Biome rules, with mechanical fixes.
2. Next.js migration, as small verified commits.
3. Readability refactors of the controller, engine and `GameApp`, with fixes for H1–H3 and M1–M6 and a regression test for each.
4. Assets: crests to WebP and woff2 font subsets.
5. Lingui string migration.
6. Club knowledge (Wikidata), per `docs/research/club-knowledge.md`.
