/**
 * The one `ManagedRuntime` behind every API route. It is created on the first request, not at
 * import, so loading the app (or a deployment build) never needs `DATABASE_URL`.
 */
import { ManagedRuntime } from 'effect';
import { ServerConfig } from './config';
import { DatabaseLive } from './db/Database';
import { type AppRuntime, makeRoutes } from './http/routes';
import { appLayer } from './layers';

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
