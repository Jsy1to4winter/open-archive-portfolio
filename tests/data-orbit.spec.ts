import { test, expect } from '@playwright/test';
import fs from 'node:fs';

test('orbit is initialized before the paper finishes expanding', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.locator('.archive-scroll-track').evaluate(async el => {
    const { progressForModule } = await import('/components/archive/timeline.ts');
    const { portfolioWorks } = await import('/components/archive/content.ts');
    el.scrollTop = progressForModule('works', portfolioWorks.length) * 0.73 / 0.74 * (el.scrollHeight - el.clientHeight);
  });
  await expect(page.locator('.archive-orbit-transition')).toHaveAttribute('aria-hidden', 'true');
  await page.locator('.data-orbit').evaluate(el => { el.setAttribute('data-prepared', 'yes'); });
  await expect.poll(() => page.locator('.data-orbit-card').first().evaluate(el => el.style.transform)).not.toBe('');
  await page.locator('.archive-scroll-track').evaluate(async el => {
    const { progressForModule } = await import('/components/archive/timeline.ts');
    const { portfolioWorks } = await import('/components/archive/content.ts');
    el.scrollTop = progressForModule('works', portfolioWorks.length) * (el.scrollHeight - el.clientHeight);
  });
  await expect(page.locator('.archive-orbit-transition')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('.data-orbit')).toHaveAttribute('data-prepared', 'yes');
});

for (const viewport of [{ width: 1440, height: 857 }, { width: 390, height: 769 }]) {
  test(`homepage data card opens rotating gallery at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const content = JSON.parse(fs.readFileSync('public/content.json', 'utf8'));
    content.stickers = [];
    await page.route('**/content.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(content) }));
    await page.goto('/');
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.locator('.archive-scroll-track').evaluate(async el => {
      const { progressForModule } = await import('/components/archive/timeline.ts');
      const { portfolioWorks } = await import('/components/archive/content.ts');
      el.scrollTop = progressForModule('about', portfolioWorks.length) * (el.scrollHeight - el.clientHeight);
    });
    await expect(page.locator('.archive-gallery-paper')).toBeVisible();
    await page.locator('.archive-gallery-paper').click();
    await expect(page.locator('.data-orbit')).toBeVisible();
    await expect(page.locator('.archive-gallery-content')).toHaveAttribute('aria-hidden', 'false');
    await page.mouse.move(0, 0);
    const first = page.locator('.data-orbit-card').first();
    const initial = await first.evaluate(el => el.style.transform);
    await expect.poll(() => first.evaluate(el => el.style.transform), { timeout: 7000 }).not.toBe(initial);
    await page.getByRole('button', { name: 'Pause rotation', exact: true }).click();
    for (let index = 1; index < content.portfolioWorks.length; index++) {
      await page.locator('.data-orbit .archive-gallery-next').click();
      await expect(page.locator('.data-orbit .archive-gallery-counter')).toHaveText(`${String(index + 1).padStart(2, '0')} / 05`);
    }
    await page.locator('.data-orbit .archive-gallery-next').click();
    await expect(page.locator('.data-orbit .archive-gallery-counter')).toHaveText('01 / 05');
    await page.screenshot({ path: `test-results/data-card-entry-${viewport.width}.png` });
  });
}

for (const width of [1440, 390]) test(`3D data rotation, pause and lightbox at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.locator('.archive-scroll-track').evaluate(async el => {
    const { progressForGalleryProgress } = await import('/components/archive/timeline.ts');
    const { portfolioWorks } = await import('/components/archive/content.ts');
    el.scrollTop = progressForGalleryProgress(0, portfolioWorks.length) * (el.scrollHeight - el.clientHeight);
  });
  const orbit = page.locator('.data-orbit');
  await expect(orbit).toBeVisible();
  const cards = orbit.locator('.data-orbit-card');
  await expect(cards).toHaveCount(5);
  for (const image of await cards.locator('img').all()) {
    await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  }
  await page.mouse.move(0, 0);
  const transform = () => cards.first().evaluate(el => el.style.transform);
  await page.waitForTimeout(2000);
  const before = await transform();
  await expect.poll(transform).not.toBe(before);
  await page.getByRole('button', { name: 'Pause rotation', exact: true }).click();
  const paused = await transform();
  await page.waitForTimeout(350);
  expect(await transform()).toBe(paused);
  await page.screenshot({ path: `test-results/data-orbit-${width}.png` });
  const imageBox = (await cards.first().locator('img').boundingBox())!;
  expect(imageBox.height).toBeLessThanOrEqual(391);
  expect(imageBox.width).toBeLessThanOrEqual(361);
  await orbit.getByRole('button', { name: 'Next image', exact: true }).click();
  await expect(orbit.locator('.archive-gallery-counter')).toHaveText('02 / 05');
  await page.waitForTimeout(900);
  await cards.nth(1).click();
  await expect(page.locator('.archive-archive-dialog[open] .archive-lightbox img')).toBeVisible();
  const during = await transform();
  await page.waitForTimeout(350);
  expect(await transform()).toBe(during);
  await page.getByRole('button', { name: 'Close details', exact: true }).click();
  await expect(orbit).toBeVisible();
  await expect(orbit.locator('.archive-gallery-counter')).toHaveText('01 / 05');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(orbit.getByRole('button', { name: 'Pause rotation' })).toHaveCount(0);
  const reduced = await transform();
  await page.waitForTimeout(450);
  expect(await transform()).toBe(reduced);
  expect(errors).toEqual([]);
});
