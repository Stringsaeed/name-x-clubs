import { expect, type Page, test } from '@playwright/test';
import { skipWithoutDatabase } from './database';

/**
 * Runs against a server whose database holds fixtures/leaderboard-seed.sql: Mode 10 has a board in
 * every period (fewer players in "day" than in "all"), and Mode 100 has no times at all. Ranked
 * tests may add faster players to Mode 10 meanwhile, so no test expects a given player's place.
 */
const timePattern = /^\d{2,}:\d{2}\.\d$/;

async function boardRowCount(page: Page) {
  const podium = await page.locator('.lb-podium-card').count();
  const rows = await page.locator('.lb-table tbody tr').count();

  return podium + rows;
}

test('shows the podium and the table for the default board', async ({ page, request }) => {
  await skipWithoutDatabase(request);
  await page.goto('/en/leaderboard');

  await expect(page.getByRole('heading', { name: 'Leaderboard', level: 1 })).toBeVisible();
  await expect(page.locator('.lb-podium-card')).toHaveCount(3);
  await expect(
    page.locator('.lb-podium-card, .lb-table tbody tr').filter({ hasText: 'Omar K.' }),
  ).toHaveCount(1);
  await expect(page.locator('.lb-table tbody tr').first()).toBeVisible();
  await expect(page.locator('.lb-table tbody tr .lb-time span').first()).toHaveText(timePattern);
  await expect(page.locator('.lb-table tbody tr .lb-when').first()).toContainText('ago');
  await expect(page.getByRole('link', { name: 'Mode 10', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  );
  await expect(page.getByRole('link', { name: 'Last 24 hours' })).toHaveAttribute(
    'aria-current',
    'true',
  );
});

test('the tabs switch mode and period through the URL', async ({ page }) => {
  await page.goto('/en/leaderboard');

  await page.getByRole('link', { name: 'Last 7 days' }).click();
  await expect(page).toHaveURL(/mode=t10&period=week/);

  await page.getByRole('link', { name: 'Mode 50', exact: true }).click();
  await expect(page).toHaveURL(/mode=t50&period=week/);
  await expect(page.getByRole('link', { name: 'Mode 50', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  );

  await page.getByRole('link', { name: 'All time' }).click();
  await expect(page).toHaveURL(/mode=t50&period=all/);
  await expect(page.getByRole('link', { name: 'All time' })).toHaveAttribute(
    'aria-current',
    'true',
  );
});

test('longer periods list more players', async ({ page, request }) => {
  await skipWithoutDatabase(request);
  await page.goto('/en/leaderboard?mode=t10&period=day');
  await expect(page.locator('.lb-podium-card')).toHaveCount(3);
  const dayRows = await boardRowCount(page);

  await page.goto('/en/leaderboard?mode=t10&period=all');
  await expect(page.locator('.lb-podium-card')).toHaveCount(3);

  expect(await boardRowCount(page)).toBeGreaterThan(dayRows);
});

test('an unknown query falls back to Mode 10 and the last 24 hours', async ({ page }) => {
  await page.goto('/en/leaderboard?mode=nope&period=never');

  await expect(page.getByRole('link', { name: 'Mode 10', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  );
  await expect(page.getByRole('link', { name: 'Last 24 hours' })).toHaveAttribute(
    'aria-current',
    'true',
  );
});

test('the Arabic page is right to left with times kept left to right', async ({
  page,
  request,
}) => {
  await skipWithoutDatabase(request);
  await page.goto('/ar/leaderboard?mode=t10&period=all');

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.getByRole('heading', { name: 'المتصدرون', level: 1 })).toBeVisible();

  const time = page.locator('.lb-table tbody .lb-time span').first();
  await expect(time).toHaveAttribute('dir', 'ltr');
  await expect(time).toHaveText(timePattern);
  await expect(page.locator('.lb-podium-time').first()).toHaveAttribute('dir', 'ltr');
});

test('a mode with no times shows the empty state', async ({ page, request }) => {
  await skipWithoutDatabase(request);
  await page.goto('/en/leaderboard?mode=t100&period=all');

  await expect(page.getByRole('heading', { name: 'No times yet' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Let.s play/ })).toHaveAttribute('href', '/en');
  await expect(page.locator('.lb-table')).toHaveCount(0);
});

test('the header link opens the board and marks it as the current page', async ({ page }) => {
  await page.goto('/en');
  await page.locator('.site-shell[data-ready]').waitFor();

  await page.getByRole('link', { name: 'Leaderboard' }).click();

  await expect(page).toHaveURL(/\/en\/leaderboard$/);
  await expect(page.getByRole('link', { name: 'Leaderboard' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('the language switch keeps the board query', async ({ page }) => {
  await page.goto('/en/leaderboard?mode=t50&period=week');

  await expect(page.getByRole('link', { name: 'Switch to Arabic' })).toHaveAttribute(
    'href',
    '/ar/leaderboard?mode=t50&period=week',
  );
});

test('the game links in the header go back to the game', async ({ page }) => {
  await page.goto('/en/leaderboard');

  await page.getByRole('button', { name: 'Practice', exact: true }).click();

  await expect(page).toHaveURL(/\/en$/);
});
