/**
 * A scripted stand-in for `fetch` in ranked tests. Every request waits until the test answers it,
 * so tests decide exactly what is in flight.
 */
import { createRankedApi, type FetchLike } from './api';
import type { SessionStoragePort } from './storedRound';

export type FakeRequest = Readonly<{
  path: string;
  method: string;
  body: unknown;
  respond: (status: number, body: unknown) => Promise<void>;
  failNetwork: () => Promise<void>;
}>;

/** Lets every pending promise callback run, including ones queued by those callbacks. */
export async function flushPromises() {
  for (let turn = 0; turn < 20; turn += 1) {
    await Promise.resolve();
  }
}

function fakeResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

export function createFakeServer() {
  const requests: FakeRequest[] = [];

  const fetch: FetchLike = (path, init) =>
    new Promise<Response>((resolve, reject) => {
      const rawBody = init?.body;

      requests.push({
        path,
        method: init?.method ?? 'GET',
        body: typeof rawBody === 'string' ? JSON.parse(rawBody) : null,
        respond: async (status, body) => {
          resolve(fakeResponse(status, body));
          await flushPromises();
        },
        failNetwork: async () => {
          reject(new TypeError('Failed to fetch'));
          await flushPromises();
        },
      });
    });

  /** The oldest request not answered yet, checked against `path`. */
  function take(path: string | RegExp) {
    const request = requests.shift();

    if (request === undefined) {
      throw new Error(`Expected a request to ${path}, but none is pending`);
    }

    const matches = typeof path === 'string' ? request.path === path : path.test(request.path);

    if (!matches) {
      throw new Error(`Expected a request to ${path}, got ${request.method} ${request.path}`);
    }

    return request;
  }

  return { api: createRankedApi(fetch), requests, take };
}

export function memoryStorage(): SessionStoragePort & { values: Map<string, string> } {
  const values = new Map<string, string>();

  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}
