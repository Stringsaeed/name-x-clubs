import { expect, test } from '@playwright/test';
import { clubs } from '../../src/content/catalog';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-14T12:00:00Z'));
  await page.goto('/');
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
  await page.reload();
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
  await expect(page.getByRole('textbox')).toBeInViewport();
  const start = await page.getByRole('button', { name: 'Let’s play', exact: true }).boundingBox();
  const conversation = await page.locator('.conversation').boundingBox();
  expect(start).not.toBeNull();
  expect(conversation).not.toBeNull();
  expect((start?.y ?? 0) + (start?.height ?? 0)).toBeLessThanOrEqual(
    (conversation?.y ?? 0) + (conversation?.height ?? 0),
  );
  await page.screenshot({ path: testInfo.outputPath('free-time-layout.png') });
});
test('restores random practice mode, question and accepted clubs', async ({ page }) => {
  await practice(page);
  await page.getByRole('button', { name: 'Mode 50' }).click();
  await page.getByRole('button', { name: 'Surprise me', exact: true }).click();
  const question = await page.getByRole('heading', { level: 2 }).innerText();
  await page.getByRole('button', { name: 'Let’s play', exact: true }).click();
  await page.getByRole('textbox').fill('Arsenal, Barcelona');
  await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(question);
  await expect(page.getByRole('textbox')).toBeEnabled();
  await expect(page.getByRole('log').locator('li')).toHaveCount(2);
  await expect(page.locator('#timer-text')).toHaveText('00:00');
});
test('plays in Arabic with real crests and a bottom composer', async ({ page }, testInfo) => {
  await practice(page);
  await page.getByRole('button', { name: 'Switch to Arabic' }).click();
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
  await page.getByRole('textbox').fill(
    clubs
      .slice(0, 103)
      .map((c) => c.name)
      .join(', '),
  );
  await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
  await expect(page.getByRole('log').locator('li')).toHaveCount(100);
  await expect(page.getByRole('heading', { name: 'You know ball.', exact: true })).toBeVisible();
  await expect(page.getByText('100 / 100 · 00:00', { exact: true })).toBeVisible();
});
test('scrolls long answer history without moving the composer', async ({ page }) => {
  await practice(page);
  await page.getByRole('button', { name: 'Mode 100' }).click();
  await page.getByRole('button', { name: 'Let’s play', exact: true }).click();
  await page.getByRole('textbox').fill(
    clubs
      .slice(0, 95)
      .map((c) => c.name)
      .join(', '),
  );
  await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
  await expect(page.getByRole('log').locator('li')).toHaveCount(95);
  await expect(page.getByRole('textbox')).toBeInViewport();
  await page.getByRole('log').getByText('Arsenal', { exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('textbox')).toBeInViewport();
});
test('keeps an initials badge when a crest request fails', async ({ page }) => {
  await page.route('**/assets/crests/england-0.png', (route) => route.abort());
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
  await page.reload();
  await expect(page.locator('#timer-text')).toHaveText('06:15');
  await page.getByRole('button', { name: 'Finish round', exact: true }).click();
  await expect(page.getByText('1 / 10 · 06:15', { exact: true })).toBeVisible();
  await page.clock.setFixedTime(new Date('2026-10-14T13:00:00Z'));
  await page.reload();
  await expect(page.locator('#timer-text')).toHaveText('06:15');
  await page.getByRole('button', { name: 'Another round', exact: true }).click();
  await expect(page.locator('#timer-text')).toHaveText('00:00');
  await expect(page.getByRole('log').locator('li')).toHaveCount(0);
});
