import { randomInt } from 'node:crypto';
import { type APIRequestContext, type BrowserContext, test } from '@playwright/test';

/**
 * Skips the current test when the server has no database: a public board then answers 503.
 * CI runs the suite against a migrated database loaded with fixtures/leaderboard-seed.sql.
 */
export async function skipWithoutDatabase(request: APIRequestContext) {
  const board = await request.get('/api/leaderboards/t10?period=day');

  test.skip(board.status() === 503, 'The server has no database.');
}

/**
 * Gives the browser its own client address. The server allows a few new players per address per
 * hour, and every Free time round in the suite creates one, so ranked tests would run out.
 */
export async function useOwnClientAddress(context: BrowserContext) {
  const address = `198.18.${randomInt(256)}.${randomInt(1, 255)}`;

  await context.setExtraHTTPHeaders({ 'x-forwarded-for': address });
}
