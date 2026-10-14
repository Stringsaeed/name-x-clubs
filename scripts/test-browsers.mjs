import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Seatbelt blocks macOS application registration before Playwright can create a
// page. Stop before launch so a failed suite cannot generate repeated crash dialogs.
if (process.platform === 'darwin' && process.env.CODEX_SANDBOX === 'seatbelt') {
  console.error(
    'Browser tests cannot launch inside the macOS command sandbox. Run pnpm test:e2e in a normal terminal, or approve execution outside the sandbox. No test browser was started.',
  );
  process.exitCode = 1;
} else {
  const cli = fileURLToPath(import.meta.resolve('@playwright/test/cli'));
  const result = spawnSync(process.execPath, [cli, 'test', ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) {
    console.error(result.error.message);
  }
  process.exitCode = result.status ?? 1;
}
