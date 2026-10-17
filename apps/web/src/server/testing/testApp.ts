/**
 * Test harness: the real services and migrations on an in-process PGlite database, with Effect's
 * `TestClock` as the only clock. Never imported by application code.
 */
import { PgliteClient } from '@effect/sql-pglite';
import { type Effect, Layer, ManagedRuntime } from 'effect';
import { snakeToCamel } from 'effect/String';
import type { SqlClient } from 'effect/sql';
import { TestClock } from 'effect/testing';
import { ServerConfig, type ServerSettings } from '../config';
import { runMigrations } from '../db/migrations';
import { sessionCookieName } from '../http/request';
import { makeRoutes } from '../http/routes';
import { appLayer } from '../layers';

/** A fresh, migrated PGlite database. Rows come back camelCase, as in production. */
export function testDatabase() {
  const client = PgliteClient.layer({ transformResultNames: snakeToCamel });

  return Layer.effectDiscard(runMigrations).pipe(Layer.provideMerge(client));
}

export const testEpochMs = Date.parse('2026-10-14T12:00:00.000Z');

export const testOrigin = 'http://nxc.test';

export async function makeTestApp(settings: Partial<ServerSettings> = {}) {
  const layer = appLayer(testDatabase(), ServerConfig.layerTest(settings)).pipe(
    Layer.provideMerge(TestClock.layer()),
  );
  const runtime = ManagedRuntime.make(layer);
  await runtime.runPromise(TestClock.setTime(testEpochMs));

  const routes = makeRoutes({ get: () => runtime, reset: () => undefined });

  return {
    routes,
    advance: (ms: number) => runtime.runPromise(TestClock.adjust(ms)),
    run: <A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>) => runtime.runPromise(effect),
    dispose: () => runtime.dispose(),
  };
}

export type TestApp = Awaited<ReturnType<typeof makeTestApp>>;

type RequestOptions = Readonly<{
  method?: 'GET' | 'POST';
  body?: unknown;
  session?: string;
  origin?: string | null;
  headers?: Record<string, string>;
}>;

export function apiRequest(path: string, options: RequestOptions = {}) {
  const method = options.method ?? (options.body === undefined ? 'GET' : 'POST');
  const headers = new Headers(options.headers);
  const origin = options.origin === undefined ? testOrigin : options.origin;

  if (origin !== null) {
    headers.set('origin', origin);
  }

  if (options.session !== undefined) {
    headers.set('cookie', `${sessionCookieName}=${options.session}`);
  }

  const init: RequestInit = { method, headers };

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  return new Request(`${testOrigin}${path}`, init);
}

/** The session token from a `Set-Cookie` header. */
export function sessionFrom(response: Response) {
  const cookie = response.headers.get('set-cookie') ?? '';
  const match = new RegExp(`${sessionCookieName}=([^;]+)`).exec(cookie);

  if (!match?.[1]) {
    throw new Error(`No session cookie in: ${cookie}`);
  }

  return match[1];
}
