# Production frontend

The game now uses React, TypeScript and Vite. Game rules remain pure TypeScript, and a single controller owns browser persistence, selection, time and round transitions. React subscribes to that controller and renders semantic components. Assets remain local and the deployment remains a static site at the existing origin.

The architecture review compared this with a server-owned session service. The client design was selected because the current game needs no shared scores, accounts or server authority. Requiring a request for each accepted club would add latency and infrastructure without improving an existing feature. Next.js remains a suitable option if public profiles, searchable challenge pages or server-backed competition become requirements.

The selected design keeps the existing `nxc-v2-daily-<UTC day>-<target>` save format so upgrades and rollback builds can read daily progress. A deadline is an absolute timestamp and cannot be reset by refreshing. Practice gets a versioned record per level that stores the actual sampled challenge, accepted club IDs and phase. Untrusted storage records pass through Zod before entering the game model. Invalid records produce a fresh round; unavailable storage leaves the game playable in memory.

Source lives in `src`, reviewed assets in `public/assets`, and generated output in `dist`. Crest paths and source identities are checked against all 200 bundled image files. The build output contains the same fonts, crest files and illustration as the prototype.

Validation covers the matcher, solvability, ordered unique scoring, legacy saves, inactive-tab expiry, practice recovery, storage failures and UI behavior. Browser tests run against the production build in desktop Chromium and mobile WebKit. They verify Arabic RTL, crest fallback, long-list scrolling and the bottom composer. CI uses the same checked-in scripts and lockfile as local development.

The review trimmed speculative server infrastructure, a general state library, brands for every primitive and a complex distributed merge protocol. Browser-local scores remain browser-local. A passing local suite is evidence of the app behavior tested; the GitHub workflow needs a GitHub remote to execute remotely.
