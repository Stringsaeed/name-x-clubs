import { describe, expect, it } from '@effect/vitest';
import { Effect, Layer, ManagedRuntime } from 'effect';
import { SqlClient } from 'effect/sql';
import { ServerConfig } from '../config';
import { appLayer } from '../layers';
import { type AppRuntime, makeRoutes } from './routes';

describe('a runtime that cannot reach the database', () => {
  it('answers health with 503 and rebuilds the runtime on the next request', async () => {
    const unreachable = Layer.effect(SqlClient.SqlClient)(Effect.die(new Error('no database')));
    let runtime: AppRuntime | undefined;
    let builds = 0;
    const routes = makeRoutes({
      get: () => {
        if (!runtime) {
          builds++;
          runtime = ManagedRuntime.make(appLayer(unreachable, ServerConfig.layerTest()));
        }

        return runtime;
      },
      reset: () => {
        runtime = undefined;
      },
    });

    const first = await routes.health();
    const second = await routes.health();

    expect(first.status).toBe(503);
    expect(first.headers.get('cache-control')).toBe('private, no-store');
    expect(second.status).toBe(503);
    expect(builds).toBe(2);
  });
});
