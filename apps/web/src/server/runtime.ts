/**
 * The one `ManagedRuntime` behind every API route. It is created on the first request, not at
 * import, so `next build` (which imports route modules) never needs `DATABASE_URL`.
 */
import 'server-only';
import { Effect, ManagedRuntime } from 'effect';
import type { Locale } from '../i18n/config';
import { ServerConfig } from './config';
import { DatabaseLive } from './db/Database';
import { type AppRuntime, makeRoutes } from './http/routes';
import { appLayer } from './layers';
import { type BoardEntry, Leaderboard, type Period } from './leaderboard/Leaderboard';
import type { RankedMode } from './rounds/modes';

let current: AppRuntime | undefined;

function getRuntime(): AppRuntime {
  current ??= ManagedRuntime.make(appLayer(DatabaseLive, ServerConfig.layer));

  return current;
}

function resetRuntime() {
  const failed = current;
  current = undefined;
  void failed?.dispose();
}

export const routes = makeRoutes({ get: getRuntime, reset: resetRuntime });

/** The public board for server components. `undefined` means the database is unavailable. */
export async function loadBoard(
  mode: RankedMode,
  period: Period,
  lang: Locale,
): Promise<readonly BoardEntry[] | undefined> {
  const program = Leaderboard.use((board) => board.top(mode, period, lang)).pipe(
    Effect.catch(() => Effect.succeed(undefined)),
  );

  try {
    return await getRuntime().runPromise(program);
  } catch (buildFailure) {
    console.error('Server runtime unavailable', buildFailure);
    resetRuntime();

    return undefined;
  }
}
