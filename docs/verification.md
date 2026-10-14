# Verification

Last local run: 14 October 2026, after the Next.js migration.

| Gate | Command | Result (2026-10-14) |
| --- | --- | --- |
| Unit and component tests | `pnpm test` | 37 passed (5 files) |
| Lint and format | `pnpm exec biome check src tests *.ts scripts` | 0 errors, 22 warnings (complexity, shadowing, function length; addressed by the planned refactor) |
| Catalog check | `pnpm i18n:check` | Up to date and complete |
| Production build with type-check | `pnpm build` | Passed; `/en`, `/ar` prerendered, `/` dynamic redirect |
| Desktop Chromium and mobile WebKit | `pnpm test:e2e` | 22 passed |
| Crest collection | crest tests in `pnpm test` | 200 files validated |
| GitHub Actions | `.github/workflows/ci.yml` | see latest run; no remote run claimed |

Reproduce with `pnpm check`, then install browser engines with `pnpm exec playwright install chromium webkit` and run `pnpm test:e2e` from a normal terminal. Browser tests start `next start` on port 4173. Generated `playwright-report/` and `test-results/` are ignored.

Known issues and open checks are in [discovery.md](discovery.md).
