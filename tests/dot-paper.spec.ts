import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) test(`subtle dot paper keeps the original canvas color at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.locator('.archive-scroll-track').evaluate(async el => {
    const { progressForModule } = await import('/components/archive/timeline.ts');
    const { portfolioWorks } = await import('/components/archive/content.ts');
    el.scrollTop = progressForModule('about', portfolioWorks.length) * (el.scrollHeight - el.clientHeight);
  });
  await expect(page.locator('.archive-desk-layer')).toHaveAttribute('aria-hidden', 'false');
  await page.waitForTimeout(700);
  await expect(page.locator('.archive-desk-layer')).toHaveCSS('background-color', 'rgb(243, 243, 243)');
  await expect(page.locator('.archive-desk-layer')).toHaveCSS('background-size', '22px 22px');
  await expect(page.locator('.archive-desk-about')).toHaveCSS('background-image', 'none');
  const buffer = await page.screenshot({ path: `test-results/dot-paper-${width}.png` });
  const pixels = await page.evaluate(async url => {
    const image = new Image(); image.src = url; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
    return { dot: ctx.getImageData(45, 111, 1, 1).data[0], paper: ctx.getImageData(52, 118, 1, 1).data[0] };
  }, `data:image/png;base64,${buffer.toString('base64')}`);
  expect(pixels.paper).toBe(243);
  expect(pixels.dot).toBeLessThan(pixels.paper);
  expect(pixels.dot).toBeGreaterThan(200);
});
