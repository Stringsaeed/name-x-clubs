import { clubs } from '@nxc/game/content/catalog';
import { resolveClub } from '@nxc/game/engine';
import { expect, type Page, test } from '@playwright/test';
import { suspiciousUnderMs } from '../../src/server/rounds/pace';
import { skipWithoutDatabase, useOwnClientAddress } from './database';

/**
 * Ranked Free time against a real server and database. Run it against a `next start` with
 * `DATABASE_URL` set; without a database the tests that need one are skipped.
 */

/** Names that mean one club anywhere in the world. */
function worldwideNames(count: number) {
  return clubs
    .filter((club) => {
      const result = resolveClub(club.name);

      return result.kind === 'match' && result.club.id === club.id;
    })
    .slice(0, count)
    .map((club) => club.name);
}

async function gotoReady(page: Page, path = '/en') {
  await page.goto(path);
  await page.locator('.site-shell[data-ready]').waitFor();
}

function isStart(method: string, url: string) {
  return method === 'POST' && new URL(url).pathname === '/api/rounds';
}

function isAnswers(method: string, url: string) {
  return method === 'POST' && new URL(url).pathname.endsWith('/answers');
}

/** Clicks "Let’s play" and returns the server's start response. */
async function startRanked(page: Page) {
  const started = page.waitForResponse((response) =>
    isStart(response.request().method(), response.url()),
  );
  await page.getByRole('button', { name: 'Let’s play', exact: true }).click();
  const startResponse = await started;
  expect(startResponse.status()).toBe(201);

  return (await startResponse.json()) as { roundId: string; displayName: string };
}

async function submit(page: Page, text: string) {
  // Phones start on the in-page keyboard, which makes the field read-only.
  const system = page.locator('[data-keyboard="system"]');
  if (await system.isVisible()) {
    await system.click();
  }
  const field = page.getByRole('textbox');
  await expect(field).toBeEditable();
  await field.fill(text);
  await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
}

const periods = ['day', 'week', 'all'] as const;

/** The player's rank on the public Mode 10 board for `period`, or null when not listed. */
async function boardRank(page: Page, period: string, player: { displayName: string }) {
  const board = await page.request.get(`/api/leaderboards/t10?period=${period}`);
  const { entries } = (await board.json()) as { entries: { name: string; rank: number }[] };

  return entries.find((entry) => entry.name === player.displayName)?.rank ?? null;
}

function chips(page: Page) {
  return page.locator('.ranked-chip');
}

test.beforeEach(async ({ context }) => {
  await useOwnClientAddress(context);
});

test('a ranked Mode 10 round ends verified and appears on the 24-hour board', async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  await skipWithoutDatabase(request);

  const names = worldwideNames(10);
  await gotoReady(page);
  const startedAt = Date.now();
  const started = await startRanked(page);

  // Batch 1: the first entry, held on its way so the next two entries queue behind it.
  let answerRequests = 0;
  await page.route('**/api/rounds/*/answers', async (route) => {
    answerRequests += 1;

    if (answerRequests === 1) {
      await new Promise((resolve) => setTimeout(resolve, 1_500));
    }

    await route.continue();
  });
  const firstAnswered = page.waitForResponse((response) =>
    isAnswers(response.request().method(), response.url()),
  );
  await submit(page, names.slice(0, 3).join(', '));

  // Batch 2: two entries typed while batch 1 is in flight.
  await submit(page, names.slice(3, 6).join(', '));
  await submit(page, names.slice(6, 9).join(', '));
  await firstAnswered;
  await expect(page.getByRole('log').locator('li')).toHaveCount(9);

  // Batch 3 completes the round, after the pace policy's minimum for a ranked time.
  const minimumMs = suspiciousUnderMs.t10 + 1_000;
  await page.waitForTimeout(Math.max(0, minimumMs - (Date.now() - startedAt)));
  await submit(page, names[9] ?? '');

  // Other tests may rank on the same board meanwhile, so each chip is checked against the
  // player's place on that board.
  await expect(chips(page)).toHaveCount(3);
  const ranks = await Promise.all(periods.map((period) => boardRank(page, period, started)));
  expect(ranks).not.toContain(null);
  await expect(chips(page)).toHaveText([
    `#${ranks[0]} · Last 24 hours`,
    `#${ranks[1]} · Last 7 days`,
    `#${ranks[2]} · All time`,
  ]);
  expect(answerRequests).toBe(3);
  await expect(page.locator('.ranked-result-time')).toHaveText(/^00:1\d\.\d$/);
  await expect(page.locator('.ranked-result-player')).toHaveText(started.displayName);
  const resultPanel = page.locator('#result-panel');
  await expect(resultPanel.getByRole('link', { name: 'Leaderboard', exact: true })).toHaveAttribute(
    'href',
    '/en/leaderboard?mode=t10&period=day',
  );
});

test('a round started offline is played locally and marked Not ranked', async ({
  page,
  context,
}) => {
  await gotoReady(page);
  let startRequests = 0;
  page.on('request', (request) => {
    if (isStart(request.method(), request.url())) {
      startRequests += 1;
    }
  });

  await context.setOffline(true);
  await page.getByRole('button', { name: 'Let’s play', exact: true }).click();

  await expect(page.locator('.ranked-badge')).toHaveText('Not ranked');
  await submit(page, 'Arsenal');
  await expect(page.getByRole('log').locator('li')).toHaveCount(1);
  await expect(page.getByRole('textbox')).toBeEnabled();
  await context.setOffline(false);
  expect(startRequests).toBeLessThanOrEqual(1);
});

test('reloading mid-round resumes the ranked round with its clubs', async ({ page, request }) => {
  await skipWithoutDatabase(request);
  const names = worldwideNames(2);
  await gotoReady(page);
  const started = await startRanked(page);
  const answered = page.waitForResponse((response) =>
    isAnswers(response.request().method(), response.url()),
  );
  await submit(page, names.join(', '));
  expect((await (await answered).json()).found).toHaveLength(2);

  const resumed = page.waitForResponse(
    (response) => new URL(response.url()).pathname === `/api/rounds/${started.roundId}`,
  );
  await page.reload();
  await page.locator('.site-shell[data-ready]').waitFor();
  const view = (await (await resumed).json()) as { found: string[]; phase: string };

  expect(view).toMatchObject({ phase: 'playing' });
  expect(view.found).toHaveLength(2);
  await expect(page.getByRole('log').locator('li')).toHaveCount(2);
  await expect(page.getByRole('textbox')).toBeEnabled();
  await expect(page.locator('.ranked-badge')).toHaveCount(0);

  // The resumed round keeps taking answers on the server.
  const next = page.waitForResponse((response) =>
    isAnswers(response.request().method(), response.url()),
  );
  await submit(page, worldwideNames(3)[2] ?? '');
  expect(await (await next).json()).toMatchObject({ nextSeq: 2 });
  await expect(page.getByRole('log').locator('li')).toHaveCount(3);
});
