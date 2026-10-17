# Verification

Last local run: 14 October 2026, after the refactor, matcher fixes, asset optimization and Lingui migration.

| Gate | Command | Result (2026-10-14) |
| --- | --- | --- |
| Unit and component tests | `pnpm test` | 129 passed |
| Lint and format | `pnpm lint` | 0 errors; 8 warnings, all in the research script `scripts/wikidata-probe.mjs` |
| Catalog check | `pnpm i18n:check` | Up to date and complete |
| Production build with type-check | `pnpm build` | Passed; `/en`, `/ar` prerendered, `/` dynamic redirect |
| Desktop Chromium and mobile WebKit | `pnpm test:e2e` | 22 passed |
| Crest collection | crest tests in `pnpm test` | 200 WebP crests, 64×64, validated against reviewed sources |
| GitHub Actions | `.github/workflows/ci.yml` | see latest run; no remote run claimed |

Reproduce with `pnpm check`, then install browser engines with `pnpm --filter web exec playwright install chromium webkit` and run `pnpm test:e2e` from a normal terminal. Browser tests start `next start` on port 4173. Generated `playwright-report/` and `test-results/` are ignored.

Known issues and open checks are in [discovery.md](discovery.md).
