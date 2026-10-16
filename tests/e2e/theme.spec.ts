import { expect, test } from '@playwright/test';

test('switches palettes and keeps the choice across reloads and languages', async ({ page }) => {
  await page.goto('/en');
  const root = page.locator('html');
  await expect(root).toHaveCSS('color-scheme', 'dark');
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(root).toHaveCSS('color-scheme', 'light');
  await expect(root).toHaveCSS('background-color', 'rgb(247, 248, 242)');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f7f8f2');

  await page.reload();
  await expect(root).toHaveCSS('color-scheme', 'light');
  await page.getByRole('button', { name: 'Switch to dark mode' }).waitFor();
  await page.getByRole('link', { name: 'Switch to Arabic' }).click();
  await expect(root).toHaveCSS('color-scheme', 'light');
  await page.getByRole('button', { name: 'التبديل إلى الوضع الداكن' }).click();
  await expect(root).toHaveCSS('color-scheme', 'dark');
  await expect(root).toHaveCSS('background-color', 'rgb(17, 26, 22)');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#111a16');

  await page.reload();
  await expect(root).toHaveCSS('color-scheme', 'dark');
  await expect(page.getByRole('button', { name: 'التبديل إلى الوضع الفاتح' })).toBeVisible();
});
