import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) test(`Chinese footer and replayable perspective text at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.locator('.archive-scroll-track').evaluate(async el => {
    const { progressForModule } = await import('/components/archive/timeline.ts');
    const { portfolioWorks } = await import('/components/archive/content.ts');
    el.scrollTop = progressForModule('perspective', portfolioWorks.length) * (el.scrollHeight - el.clientHeight);
  });
  await expect(page.locator('.archive-sticker-hint')).toHaveText('拖动贴纸，试着互动一下');
  await page.waitForTimeout(700);
  await page.locator('.archive-desk-perspective .archive-desk-card-arrow').click();
  const entries = page.locator('.archive-reason-interactive');
  await expect(entries).toHaveCount(6);
  const text = entries.first().locator('[role=button]');
  await expect(text).toHaveCSS('opacity', '1');
  await text.click();
  expect(await text.evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41)).toBeGreaterThan(0);
  await expect(text).toHaveCSS('opacity', '1');
  await expect.poll(() => text.evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41)).toBe(0);
  await text.focus();
  await page.keyboard.press('Enter');
  expect(await text.evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41)).toBeGreaterThan(0);
  await expect(text).toHaveCSS('opacity', '1');
  await page.screenshot({ path: `test-results/reason-motion-${width}.png` });
  const last = entries.last().locator('[role=button]');
  await last.scrollIntoViewIfNeeded();
  await expect(last).toHaveCSS('opacity', '1');
  await expect(page.locator('.archive-archive-dialog')).toHaveJSProperty('scrollWidth', await page.locator('.archive-archive-dialog').evaluate(el => el.clientWidth));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await last.click();
  await expect(last).toHaveCSS('opacity', '1');
  expect(await last.evaluate(el => getComputedStyle(el).transform)).toBe('none');
});
