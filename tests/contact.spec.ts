import { test, expect } from '@playwright/test';
test('Say hello only shows email and phone', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.locator('.archive-scroll-track').evaluate(async el => {
    const { progressForModule } = await import('/components/archive/timeline.ts');
    const { portfolioWorks } = await import('/components/archive/content.ts');
    el.scrollTop = progressForModule('about', portfolioWorks.length) * (el.scrollHeight - el.clientHeight);
  });
  await page.locator('.archive-archive-chrome header').getByRole('button', { name: 'Say hello' }).click();
  const dialog = page.locator('.archive-archive-dialog[open]');
  await expect(dialog.locator('.archive-detail-reason')).toHaveCount(0);
  await expect(dialog.locator('.archive-detail-contact')).toHaveCount(2);
  await expect(dialog.locator('a[href^="mailto:"]')).toBeVisible();
  await expect(dialog.locator('a[href^="tel:"]')).toBeVisible();
  await expect(dialog).not.toContainText('策略迭代与用户运营');
});
