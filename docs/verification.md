# Game verification

Verified on 14 October 2026 against the Vite production build.

| Gate | Result |
| --- | --- |
| Strict TypeScript and Biome | Passed |
| Unit and component tests | 31 passed |
| Desktop Chromium and mobile WebKit regression tests | 18 passed |
| Reviewed local crest collection | 200 files validated against identities and checksums |
| Free time and disabled Daily | Compact modes, no Daily entry, and previous daily saves left untouched |
| Elapsed timing | Counts up beyond the old deadline, restores after refresh, freezes on finish and resets for another round |
| Practice recovery | Mode, target, sampled question, phase, elapsed time and accepted clubs restored; legacy answers migrate |
| Arabic RTL and bottom composer | Browser geometry checks passed; mobile screenshot retained in the test report |
| GitHub CI execution | Configured; no GitHub remote run claimed |

The first native browser run failed before tests started because the macOS command sandbox blocked application registration. The same WebKit binary launched successfully in the approved execution context. The test launcher now refuses that restricted context before starting a browser. The complete Chromium/WebKit suite subsequently passed outside the sandbox. No macOS security setting was changed.

Reproduce application checks with `npm run check`, then install the browser engines and run `npm run test:e2e` from a normal terminal. The browser tests start the production preview on port 4173. `playwright-report/` and `test-results/` are generated, ignored artifacts; CI uploads them after a run.
