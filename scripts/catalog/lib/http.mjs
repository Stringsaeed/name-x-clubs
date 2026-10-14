// Polite, throttled, disk-cached HTTP for the catalog ingest.
// Every response body is stored under scripts/catalog/.cache/ keyed by the request, so a rerun
// is instant and deterministic. Pass --refresh to bypass the cache.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const USER_AGENT = 'NameXClubs-catalog/0.1 (stringsaeed@gmail.com)';
const CACHE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '.cache');
const MAX_RETRIES = 5;
const TIMEOUT_MS = 90_000;

export const stats = { network: 0, cached: 0, retries: 0 };

const refresh = process.argv.includes('--refresh');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let lastRequestAt = 0;

async function throttle(gapMs) {
  const wait = lastRequestAt + gapMs - Date.now();

  if (wait > 0) {
    await sleep(wait);
  }

  lastRequestAt = Date.now();
}

function cachePath(method, url, params) {
  const digest = createHash('sha1').update(`${method} ${url} ${params.toString()}`).digest('hex');

  return join(CACHE_DIR, `${digest}.json`);
}

async function readCache(path) {
  if (refresh) {
    return null;
  }

  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function retryDelay(response, attempt) {
  const retryAfter = Number(response.headers.get('retry-after'));

  return retryAfter > 0 ? retryAfter * 1000 : 3000 * 2 ** attempt;
}

async function fetchJson(method, url, params, accept) {
  const target = new URL(url);

  if (method === 'GET') {
    target.search = params.toString();
  }

  for (let attempt = 0; ; attempt++) {
    stats.network++;
    const response = await fetch(target, {
      method,
      body: method === 'POST' ? params : undefined,
      headers: { 'User-Agent': USER_AGENT, Accept: accept, 'Accept-Encoding': 'gzip' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const retryable = response.status === 429 || response.status >= 500;

    if (retryable && attempt < MAX_RETRIES) {
      stats.retries++;
      await sleep(retryDelay(response, attempt));
      continue;
    }

    if (!response.ok) {
      throw new Error(`${response.status} ${method} ${url}`);
    }

    return response.json();
  }
}

/**
 * Fetches JSON, serving it from the disk cache when this exact request was made before.
 * `gapMs` is the minimum pause between network requests (all requests run serially).
 */
export async function cachedJson({ url, params, method = 'GET', gapMs = 400, accept }) {
  const search = new URLSearchParams({ format: 'json', ...params });
  const path = cachePath(method, url, search);
  const hit = await readCache(path);

  if (hit) {
    stats.cached++;
    return hit;
  }

  await throttle(gapMs);
  const json = await fetchJson(method, url, search, accept ?? 'application/json');

  if (json.error) {
    throw new Error(`${json.error.code}: ${json.error.info}`);
  }

  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(path, JSON.stringify(json));

  return json;
}
