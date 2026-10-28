import { test, expect } from '@playwright/test';
for (const width of [1440, 390]) test(`fixed app icons below skills at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.locator('.archive-scroll-track').evaluate(async el => {
    const { progressForModule } = await import('/components/archive/timeline.ts');
    const { portfolioWorks } = await import('/components/archive/content.ts');
    el.scrollTop = progressForModule('about', portfolioWorks.length) * (el.scrollHeight - el.clientHeight);
  });
  await page.locator('.archive-desk-about-main').evaluate((el: HTMLElement) => el.click());
  const icons = page.locator('.skill-apps');
  await icons.scrollIntoViewIfNeeded();
  await expect(icons.locator('li')).toHaveCount(5);
  const boxes = await icons.locator('li').evaluateAll(elements => elements.map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right }; }));
  expect(new Set(boxes.map(box => Math.round(box.y))).size).toBe(1);
  expect(boxes[4].right).toBeLessThan(width);
  expect(boxes[0].x).toBeGreaterThanOrEqual(0);
  const row = (await icons.boundingBox())!;
  expect(boxes[0].x).toBeCloseTo(row.x, 0);
  const gaps = boxes.slice(1).map((box, i) => box.x - boxes[i].right);
  expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(1);
  await expect(icons.locator('[draggable=true]')).toHaveCount(0);
  const image = await icons.locator('.skill-app-icon').first().evaluate(el => getComputedStyle(el).backgroundImage);
  const response = await page.request.get(image.slice(5, -2));
  expect(response.ok()).toBeTruthy();
  await page.screenshot({ path: `test-results/skill-apps-${width}.png` });
});
