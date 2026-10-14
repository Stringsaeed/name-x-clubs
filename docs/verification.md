# Migration verification

Verified on 14 October 2026 against the Vite production build.

| Gate | Result |
| --- | --- |
| Strict TypeScript and Biome | Passed |
| Unit and component tests | 30 passed |
| Desktop Chromium and mobile WebKit regression tests | 18 passed |
| Reviewed local crest collection | 200 files validated against identities and checksums |
| Legacy daily saves and absolute deadlines | Restored and tested, including expiry after reload |
| Practice recovery | Mode, level, sampled question, phase and accepted clubs restored |
| Arabic RTL and bottom composer | Browser geometry checks passed; mobile screenshot retained in the test report |
| GitHub CI execution | Configured; no GitHub remote run claimed |

The first native browser run failed before tests started because the macOS command sandbox blocked application registration. The same WebKit binary launched successfully in the approved execution context. The test launcher now refuses that restricted context before starting a browser. The complete Chromium/WebKit suite subsequently passed outside the sandbox. No macOS security setting was changed.

Reproduce application checks with `npm run check`, then install the browser engines and run `npm run test:e2e` from a normal terminal. The browser tests start the production preview on port 4173. `playwright-report/` and `test-results/` are generated, ignored artifacts; CI uploads them after a run.
