# Production frontend

The game now uses React, TypeScript and Vite. Game rules remain pure TypeScript, and a single controller owns browser persistence, selection, time and round transitions. React subscribes to that controller and renders semantic components. Assets remain local and the deployment remains a static site at the existing origin.

The architecture review compared this with a server-owned session service. The client design was selected because the current game needs no shared scores, accounts or server authority. Requiring a request for each accepted club would add latency and infrastructure without improving an existing feature. Next.js remains a suitable option if public profiles, searchable challenge pages or server-backed competition become requirements.

Free time and Practice store a versioned record per target with the actual sampled question, accepted club IDs, phase and start timestamp. Both measure elapsed time and never expire. Completion stores a fixed elapsed duration. Daily is disabled pending a new design, and its older saves remain untouched. Existing Practice records migrate with their answers; the elapsed measurement starts on migration because the old record did not track time. Untrusted storage records pass through Zod before entering the game model. Invalid records produce a fresh round; unavailable storage leaves the game playable in memory.

Source lives in `src`, reviewed assets in `public/assets`, and generated output in `dist`. Crest paths and source identities are checked against all 200 bundled image files. The build output contains the same fonts, crest files and illustration as the prototype.

Validation covers the matcher, solvability, ordered unique scoring, legacy Practice saves, count-up timing and completion, practice recovery, storage failures and UI behavior. Browser tests run against the production build in desktop Chromium and mobile WebKit. They verify Arabic RTL, crest fallback, long-list scrolling and the bottom composer. CI uses the same checked-in scripts and lockfile as local development.

The review trimmed speculative server infrastructure, a general state library, brands for every primitive and a complex distributed merge protocol. Browser-local scores remain browser-local. A passing local suite is evidence of the app behavior tested; the GitHub workflow needs a GitHub remote to execute remotely.
