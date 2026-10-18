// Fails fast when a TestFlight release is missing required EAS setup, so the
// workflow shows a clear message instead of an EAS CLI error mid-build.
// Run from apps/mobile; see docs/testflight.md for the setup steps.
import { readFileSync } from 'node:fs';

const app = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;
const eas = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));

const eventName = process.env.GITHUB_EVENT_NAME;
const refName = process.env.GITHUB_REF_NAME ?? '';
const isTagPush = eventName === 'push' && process.env.GITHUB_REF_TYPE === 'tag';

const failures = [];

if (!app.extra?.eas?.projectId) {
  failures.push(
    'app.json has no extra.eas.projectId — run `npx eas-cli@latest init` in apps/mobile and commit app.json.',
  );
}

const ascAppId = eas.submit?.production?.ios?.ascAppId;
if (!/^\d+$/.test(String(ascAppId))) {
  failures.push(
    'eas.json submit.production.ios.ascAppId is not set — create the App Store Connect app record (docs/testflight.md), then fill in its Apple ID number.',
  );
}

if (isTagPush && refName !== `v${app.version}`) {
  failures.push(
    `Tag ${refName} does not match app.json version ${app.version} — tag releases as v<version>, e.g. v${app.version}.`,
  );
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`✖ ${failure}`);
  }
  process.exit(1);
}

console.log(`Release readiness OK: version ${app.version}${isTagPush ? `, tag ${refName}` : ''}`);
