import { expect, test } from '@playwright/test';
import { clubs } from '../../src/content/catalog';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-14T12:00:00Z'));
  await page.goto('/');
});
async function practice(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
}
test('accepts bilingual aliases once and resumes the daily round', async ({ page }) => {
  await page.getByRole('button', { name: 'Let’s play', exact: true }).click();
  await page.getByRole('textbox').fill('Arsenal, مانشستر يونايتد, Man Utd');
  await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
  expect(await page.getByRole('log').locator('li').count()).toBe(2);
  await expect(page.getByRole('status')).toContainText('already on your list');
  await page.reload();
  await expect(page.getByRole('log').locator('li')).toHaveCount(2);
  await expect(page.getByRole('textbox')).toBeEnabled();
  await expect(page.locator('#timer-text')).toHaveText('01:00');
});
test('imports an existing v2 daily save without resetting its deadline', async ({ page }) => {
  await page.evaluate(() =>
    localStorage.setItem(
      'nxc-v2-daily-2026-10-14-10',
      JSON.stringify({
        phase: 'playing',
        found: ['england-0'],
        deadline: Date.parse('2026-10-14T12:00:45Z'),
        remaining: 60,
      }),
    ),
  );
  await page.reload();
  await expect(page.getByRole('log')).toContainText('Arsenal');
  await expect(page.locator('#timer-text')).toHaveText('00:45');
});
test('restores random practice mode, question and accepted clubs', async ({ page }) => {
  await practice(page);
  await page.getByRole('button', { name: /Name 50 clubs/ }).click();
  await page.getByRole('button', { name: 'Surprise me', exact: true }).click();
  const question = await page.getByRole('heading', { level: 2 }).innerText();
  await page.getByRole('button', { name: 'Let’s play', exact: true }).click();
  await page.getByRole('textbox').fill('Arsenal, Barcelona');
  await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(question);
  await expect(page.getByRole('textbox')).toBeEnabled();
  await expect(page.getByRole('log').locator('li')).toHaveCount(2);
  await expect(page.locator('#timer-text')).toHaveText('∞');
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
  await page.getByRole('button', { name: /Name 100 clubs/ }).click();
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
  await expect(page.getByText('100 out of 100. Nicely played.', { exact: true })).toBeVisible();
});
test('scrolls long answer history without moving the composer', async ({ page }) => {
  await practice(page);
  await page.getByRole('button', { name: /Name 100 clubs/ }).click();
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

test('an elapsed deadline completes the daily round and stays complete after reload', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Let’s play', exact: true }).click();
  await page.getByRole('textbox').fill('Arsenal');
  await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
  await page.clock.setFixedTime(new Date('2026-10-14T12:01:01Z'));
  await expect(page.getByRole('heading', { name: 'Good shift.', exact: true })).toBeVisible();
  await expect(page.locator('#timer-text')).toHaveText('00:00');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Good shift.', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Let’s play', exact: true })).toHaveCount(0);
});
