import { expect, type Page, test } from '@playwright/test';
import { clubs } from '../../src/content/catalog';
import { resolveClub } from '../../src/game/engine';

/** Names that mean one club anywhere in the world, including a famous club that shares its name. */
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
async function reloadReady(page: Page) {
  await page.reload();
  await page.locator('.site-shell[data-ready]').waitFor();
}
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-14T12:00:00Z'));
  await gotoReady(page);
});
async function practice(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
}
test('accepts bilingual aliases once and resumes the free-time round', async ({ page }) => {
  await page.getByRole('button', { name: 'Let’s play', exact: true }).click();
  await page.getByRole('textbox').fill('Arsenal, مانشستر يونايتد, Man Utd');
  await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
  expect(await page.getByRole('log').locator('li').count()).toBe(2);
  await expect(page.getByRole('status')).toContainText('already on your list');
  await reloadReady(page);
  await expect(page.getByRole('log').locator('li')).toHaveCount(2);
  await expect(page.getByRole('textbox')).toBeEnabled();
  await expect(page.locator('#timer-text')).toHaveText('00:00');
});
test('keeps Daily disabled and shows only compact mode choices', async ({ page }, testInfo) => {
  await expect(page.getByRole('button', { name: 'Free time', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByRole('button', { name: /Daily/ })).toHaveCount(0);
  await expect(page.locator('.level-picker button')).toHaveText(['Mode 10', 'Mode 50', 'Mode 100']);
  await expect(page.locator('.sidebar, .hero-description, .eyebrow, .trust-strip')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Know your clubs?Prove it.');
  if ((page.viewportSize()?.width ?? 0) > 760) {
    await expect(page.locator('.hero-art img')).toBeVisible();
  }
  const startButton = page.getByRole('button', { name: 'Let’s play', exact: true });
  await expect(startButton).toBeInViewport();
  await expect(page.getByRole('textbox')).toBeHidden();
  const start = await startButton.boundingBox();
  const composer = await page.locator('#answer-composer').boundingBox();
  const conversation = await page.locator('.conversation').boundingBox();
  expect(start).not.toBeNull();
  expect(composer).not.toBeNull();
  expect(conversation).not.toBeNull();
  // The start button occupies the composer slot, below the empty chat list.
  expect(start?.y ?? 0).toBeGreaterThanOrEqual(composer?.y ?? 0);
  expect((start?.y ?? 0) + (start?.height ?? 0)).toBeLessThanOrEqual(
    (composer?.y ?? 0) + (composer?.height ?? 0) + 1,
  );
  expect(start?.y ?? 0).toBeGreaterThanOrEqual(
    (conversation?.y ?? 0) + (conversation?.height ?? 0) - 1,
  );
  await page.screenshot({ path: testInfo.outputPath('free-time-layout.png') });
});
test('restores random practice mode, question and accepted clubs', async ({ page }) => {
  // Math.random() = 0 picks the first challenge on offer (Europe), where both clubs below count.
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await reloadReady(page);
  await practice(page);
  await page.getByRole('button', { name: 'Mode 50' }).click();
  await page.getByRole('button', { name: 'Surprise me', exact: true }).click();
  const question = await page.getByRole('heading', { level: 2 }).innerText();
  await page.getByRole('button', { name: 'Let’s play', exact: true }).click();
  await page.getByRole('textbox').fill('Arsenal, Barcelona');
  await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
  await reloadReady(page);
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(question);
  await expect(page.getByRole('textbox')).toBeEnabled();
  await expect(page.getByRole('log').locator('li')).toHaveCount(2);
  await expect(page.locator('#timer-text')).toHaveText('00:00');
});
test('plays in Arabic with real crests and a bottom composer', async ({ page }, testInfo) => {
  await practice(page);
  await page.getByRole('link', { name: 'Switch to Arabic' }).click();
  await page.waitForURL(/\/ar/);
  await page.locator('.site-shell[data-ready]').waitFor();
  await page.getByRole('button', { name: 'يلا نلعب', exact: true }).click();
  await page.getByRole('textbox').fill('الهلال السعودي، الأهلي المصري، العين، الزمالك');
  await page.getByRole('button', { name: 'إرسال الإجابة', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('log').locator('li')).toHaveCount(4);
  await expect(page.locator('.crest-frame.has-logo')).toHaveCount(4);
  await expect(page.getByRole('textbox')).toBeInViewport();
  const geometry = await page.evaluate(() => ({
    input: document.querySelector('.answer-composer')?.getBoundingClientRect().top,
    list: document.querySelector('.conversation')?.getBoundingClientRect().bottom,
    width: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  expect(geometry.input).toBeGreaterThanOrEqual(geometry.list ?? 0);
  expect(geometry.width).toBe(geometry.viewport);
  await page.screenshot({ path: testInfo.outputPath('arabic-layout.png') });
});
test('caps a 100-club round and shows a complete result', async ({ page }) => {
  await practice(page);
  await page.getByRole('button', { name: 'Mode 100' }).click();
  await page.getByRole('button', { name: 'Let’s play', exact: true }).click();
  await page.getByRole('textbox').fill(worldwideNames(103).join(', '));
  await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
  await expect(page.getByRole('log').locator('li')).toHaveCount(100);
  await expect(page.getByRole('heading', { name: 'You know ball.', exact: true })).toBeVisible();
  await expect(page.getByText('100 / 100 · 00:00', { exact: true })).toBeVisible();
});
test('scrolls long answer history without moving the composer', async ({ page }) => {
  await practice(page);
  await page.getByRole('button', { name: 'Mode 100' }).click();
  await page.getByRole('button', { name: 'Let’s play', exact: true }).click();
  await page.getByRole('textbox').fill(worldwideNames(95).join(', '));
  await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
  await expect(page.getByRole('log').locator('li')).toHaveCount(95);
  await expect(page.getByRole('textbox')).toBeInViewport();
  await page.getByRole('log').getByText('Arsenal', { exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('textbox')).toBeInViewport();
});
test('keeps an initials badge when a crest request fails', async ({ page }) => {
  await page.route('**/assets/crests/england-0.webp', (route) => route.abort());
  await practice(page);
  await page.getByRole('button', { name: 'Let’s play', exact: true }).click();
  await page.getByRole('textbox').fill('Arsenal');
  await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
  const row = page.getByRole('log').locator('li');
  await expect(row.locator('img')).toHaveCount(0);
  await expect(row.locator('.club-crest')).toHaveText('A');
});
test('the help dialog is keyboard accessible', async ({ page }) => {
  await page.locator('header').getByRole('button', { name: 'How to play', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('elapsed time rises without expiring and freezes on finishing across reload', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Let’s play', exact: true }).click();
  await page.getByRole('textbox').fill('Arsenal');
  await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
  await page.clock.setFixedTime(new Date('2026-10-14T12:06:15Z'));
  await expect(page.locator('#timer-text')).toHaveText('06:15');
  await expect(page.getByRole('textbox')).toBeEnabled();
  await reloadReady(page);
  await expect(page.locator('#timer-text')).toHaveText('06:15');
  await page.getByRole('button', { name: 'Finish round', exact: true }).click();
  await expect(page.getByText('1 / 10 · 06:15', { exact: true })).toBeVisible();
  await page.clock.setFixedTime(new Date('2026-10-14T13:00:00Z'));
  await reloadReady(page);
  await expect(page.locator('#timer-text')).toHaveText('06:15');
  await page.getByRole('button', { name: 'Another round', exact: true }).click();
  await expect(page.locator('#timer-text')).toHaveText('00:00');
  await expect(page.getByRole('log').locator('li')).toHaveCount(0);
});

test('GET / redirects by language cookie', async ({ page, context, baseURL }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/en$/);
  await context.addCookies([{ name: 'nxc-language', value: 'ar', url: baseURL ?? page.url() }]);
  await page.goto('/');
  await expect(page).toHaveURL(/\/ar$/);
});
test('serves /ar with rtl html before hydration', async ({ request }) => {
  const res = await request.get('/ar');
  expect(await res.text()).toContain('<html lang="ar" dir="rtl"');
});
