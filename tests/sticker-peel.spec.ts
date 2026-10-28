import { test, expect } from '@playwright/test';
import fs from 'node:fs';
for (const width of [1440, 390]) test(`edge peels stay anchored and center moves without curling at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const data = JSON.parse(fs.readFileSync('public/content.json', 'utf8'));
  data.stickers = [
    { id: 'name', name: 'suiyixuan', image: '', width: 220, x: .1, y: .03 },
    { id: 'image', name: '原图', image: '/assets/app-icons/chatgpt.png', width: 170, x: .65, y: .4 },
  ];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/content.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) }));
  await page.goto('/');
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.locator('.archive-scroll-track').evaluate(async el => {
    const { progressForModule } = await import('/components/archive/timeline.ts');
    const { portfolioWorks } = await import('/components/archive/content.ts');
    el.scrollTop = progressForModule('about', portfolioWorks.length) * (el.scrollHeight - el.clientHeight);
  });
  await page.waitForTimeout(700);
  for (let i = 0; i < 2; i++) {
    const sticker = page.locator('.homepage-sticker').nth(i);
    const surface = sticker.locator('.homepage-sticker-peel');
    await sticker.hover();
    await expect(surface).toHaveAttribute('data-ready', 'true', { timeout: 60000 });
    const canvas = surface.locator('canvas');
    const rest = await canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL());
    const before = (await sticker.boundingBox())!;
    await page.screenshot({ path: `test-results/peel-rest-${width}-${i}.png` });
    const x = before.x + before.width / 2, y = before.y + before.height / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x + 15, y + 65, { steps: 8 });
    await expect(surface).toHaveAttribute('data-progress', '0');
    await page.mouse.up();
    expect((await sticker.boundingBox())!.y - before.y).toBeCloseTo(65, 0);
    const anchored = (await sticker.boundingBox())!;
    const edgeX = anchored.x + 12, edgeY = anchored.y + anchored.height / 2;
    await page.mouse.move(edgeX, edgeY);
    await expect.poll(async () => Number(await surface.getAttribute('data-progress'))).toBeGreaterThan(0);
    await page.mouse.down();
    await page.mouse.move(edgeX + 40, edgeY + 65, { steps: 8 });
    await expect(sticker).toHaveAttribute('data-peel-active', 'true');
    await expect.poll(async () => Number(await surface.getAttribute('data-progress'))).toBeGreaterThan(.1);
    const curled = await canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL());
    expect(curled).not.toBe(rest);
    const ink = await canvas.evaluate((el: HTMLCanvasElement) => {
      const gl = el.getContext('webgl2')!;
      const pixels = new Uint8Array(el.width * el.height * 4);
      gl.readPixels(0, 0, el.width, el.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let count = 0; for (let p = 3; p < pixels.length; p += 4) if (pixels[p] > 0) count++;
      return count;
    });
    expect(ink).toBeGreaterThan(100);
    await page.screenshot({ path: `test-results/peel-curled-${width}-${i}.png` });
    expect((await sticker.boundingBox())!.x).toBeCloseTo(anchored.x, 1);
    expect((await sticker.boundingBox())!.y).toBeCloseTo(anchored.y, 1);
    await page.mouse.up();
    await expect(surface).toHaveAttribute('data-progress', '0');
    await expect(sticker).toHaveAttribute('data-peel-active', 'true');
    await expect(surface).toHaveAttribute('data-material', 'holographic');
    await expect(sticker.locator('.homepage-sticker-face')).toHaveCSS('opacity', '0');
    expect((await sticker.boundingBox())!.y - before.y).toBeCloseTo(65, 0);
    await page.screenshot({ path: `test-results/peel-returned-${width}-${i}.png` });
    await page.mouse.move(0, 0);
    await page.mouse.move(anchored.x + 12, anchored.y + anchored.height / 2);
    await expect.poll(async () => Number(await surface.getAttribute('data-progress'))).toBeGreaterThan(0);
    await page.mouse.move(0, 0);
    await expect(surface).toHaveAttribute('data-progress', '0');
  }
  expect(errors).toEqual([]);
});

test('touch peel returns without scrolling the page', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const data = JSON.parse(fs.readFileSync('public/content.json', 'utf8'));
  data.stickers = [{ id: 'touch', name: '触摸贴纸', image: '/assets/app-icons/chatgpt.png', width: 180, x: .3, y: .02 }];
  await page.route('**/content.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) }));
  await page.goto('/');
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.locator('.archive-scroll-track').evaluate(async el => {
    const { progressForModule } = await import('/components/archive/timeline.ts');
    const { portfolioWorks } = await import('/components/archive/content.ts');
    el.scrollTop = progressForModule('about', portfolioWorks.length) * (el.scrollHeight - el.clientHeight);
  });
  await page.waitForTimeout(700);
  const sticker = page.locator('.homepage-sticker');
  await sticker.tap();
  await expect(sticker.locator('.homepage-sticker-peel')).toHaveAttribute('data-ready', 'true', { timeout: 60000 });
  await expect(sticker.locator('.homepage-sticker-peel')).toHaveAttribute('data-progress', '0');
  const rect = (await sticker.boundingBox())!;
  const x = rect.x + 12, y = rect.y + rect.height / 2;
  const scroll = await page.locator('.archive-scroll-track').evaluate(el => el.scrollTop);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + i * 2, y: y + i * 8 }] });
  await expect(sticker).toHaveAttribute('data-peel-active', 'true');
  await page.screenshot({ path: 'test-results/peel-touch.png' });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(sticker.locator('.homepage-sticker-peel')).toHaveAttribute('data-progress', '0');
  expect((await sticker.boundingBox())!.x).toBeCloseTo(rect.x, 1);
  expect((await sticker.boundingBox())!.y).toBeCloseTo(rect.y, 1);
  expect(await page.locator('.archive-scroll-track').evaluate(el => el.scrollTop)).toBe(scroll);
  await context.close();
});
