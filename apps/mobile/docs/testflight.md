# TestFlight releases

Tag-based releases: pushing a `v<version>` tag triggers `.github/workflows/mobile-testflight.yml`,
which runs an EAS cloud build of the `production` profile and auto-submits the `.ipa` to TestFlight
via EAS Submit. Building and signing happen on EAS servers — no macOS runner, no local Xcode.

## One-time setup

### 1. Initialize the EAS project

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest init
```

`eas init` creates the project on EAS and writes `extra.eas.projectId` into `app.json`. Commit it —
CI fails without it.

### 2. Create an App Store Connect API key

Requires an active Apple Developer Program membership.

1. Sign in at [App Store Connect](https://appstoreconnect.apple.com/) → Users and Access →
   Integrations → App Store Connect API → **+**.
2. Name it (e.g. "EAS"), role **Admin**, create it.
3. Download the `.p8` file and note the **Key ID** and **Issuer ID** (shown on the same page).

### 3. Set up iOS credentials and the submit key

```bash
npx eas-cli@latest credentials --platform ios
```

1. Select the `production` build profile.
2. Log in with the Apple ID and follow the prompts — EAS creates and manages the distribution
   certificate and provisioning profile for `com.stringsaeed.clubs`.
3. Select **App Store Connect: Manage your API Key**, then
   **Set up your project to use an API Key for EAS Submit**, and provide the `.p8`, Key ID, and
   Issuer ID from step 2. The key is stored on EAS servers, which is what lets non-interactive CI
   submissions authenticate with Apple.

### 4. First build and submit — creates the App Store Connect app record

```bash
npx eas-cli@latest build --platform ios --profile production --auto-submit
```

When `eas submit` reports that no app was found and offers to create one on App Store Connect,
confirm it (bundle `com.stringsaeed.clubs`, name "Name × Clubs"). After Apple processes the upload, the
build appears in TestFlight.

### 5. Fill in `ascAppId`

App Store Connect → Apps → the app → App Information → General Information → **Apple ID** (numeric).
Put that number into `submit.production.ios.ascAppId` in `apps/mobile/eas.json` and commit.
Non-interactive CI submissions require it.

### 6. Add the GitHub secret

1. [expo.dev](https://expo.dev/) → Account Settings → Personal access tokens → Create
   (EAS CLI access token).
2. Repo Settings → Secrets and variables → Actions → new secret named `EXPO_TOKEN`.

Once steps 1, 5, and 6 are done, the workflow's release-readiness check passes.

## Cutting a release

1. Set `expo.version` in `apps/mobile/app.json` to the release version (e.g. `1.0.1`).
2. Commit, then tag and push:

   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

3. The workflow verifies readiness, builds on EAS (auto-incrementing the iOS build number remotely
   via `cli.appVersionSource: remote` — no version-bump commits needed), waits for the build, then
   submits to TestFlight. Internal testers get the build about 10–15 minutes after Apple processes
   it.

The workflow fails before building if `app.json` has no `projectId`, `ascAppId` is unset, or the tag
does not match `v<version>`.

## If App Store Connect processing rejects the build

Apple scans the binary for linked APIs that require iOS purpose strings. This app links
microphone APIs through `react-native-audio-api` (it bundles an `AudioRecorder` even though the game
only plays sounds), so its plugin entry in `app.json` must carry `iosMicrophonePermission` — without
it, processing fails with "Missing purpose string in Info.plist for
NSMicrophoneUsageDescription". If a new library links camera, location, photos, or similar APIs, add
the matching `NS*UsageDescription` key to `ios.infoPlist` in `app.json`.

A rejected build never reaches TestFlight. Fix the config, then build and submit again —
`autoIncrement` bumps the iOS build number on EAS servers, so Apple accepts the new binary under the
same marketing version.

## Optional

- Distribute to named internal TestFlight groups by adding `groups` to
  `submit.production.ios` in `eas.json`.
- If iOS credentials ever need repair on CI (e.g. profile re-signing), pass the ASC key via
  `EXPO_ASC_API_KEY_PATH`, `EXPO_ASC_KEY_ID`, `EXPO_ASC_ISSUER_ID`, `EXPO_APPLE_TEAM_ID` env vars —
  see [Trigger builds from CI](https://docs.expo.dev/build/building-on-ci.md).
- If project uploads to EAS become slow, add a `.easignore` — but keep every workspace directory
  (`apps/*`, `packages/*`), `pnpm install` on the build server needs them.
  See [.easignore reference](https://docs.expo.dev/build-reference/easignore.md).
