import { test, expect, type Page } from '@playwright/test';

async function desk(page: Page) {
  await page.addInitScript(() => {
    (window as any).stickerSounds = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof start>) {
      if (this.buffer?.duration && this.buffer.duration < 1) (window as any).stickerSounds.push({ state: this.context.state, peak: Math.max(...this.buffer.getChannelData(0)), duration: this.buffer.duration });
      return start.apply(this, args);
    };
  });
  await page.goto('/');
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.locator('.archive-scroll-track').evaluate(async el => {
    const { progressForModule } = await import('/components/archive/timeline.ts');
    const { portfolioWorks } = await import('/components/archive/content.ts');
    el.scrollTop = progressForModule('about', portfolioWorks.length) * (el.scrollHeight - el.clientHeight);
  });
  await expect(page.getByRole('button', { name: '拖动 suiyixuan 贴纸' })).toBeVisible();
  await page.waitForTimeout(650);
}

for (const width of [1440, 390]) {
  test(`visitors can drag the homepage sticker at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await desk(page);
    const sticker = page.locator('.homepage-sticker');
    const before = (await sticker.boundingBox())!;
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    await page.mouse.down();
    await page.mouse.move(before.x + before.width / 2 + 20, before.y + before.height / 2 + 130, { steps: 12 });
    expect(await page.evaluate(() => (window as any).stickerSounds.length)).toBe(0);
    await page.mouse.up();
    await expect.poll(() => page.evaluate(() => (window as any).stickerSounds.length)).toBe(1);
    const played = await page.evaluate(() => (window as any).stickerSounds[0]);
    expect(played.state).toBe('running');
    expect(played.peak).toBeGreaterThan(0.1);
    const sound = await page.request.get('/assets/sticker-place-v2.wav');
    expect(sound.ok()).toBe(true);
    expect((await sound.body()).length).toBeGreaterThan(1000);
    const after = (await sticker.boundingBox())!;
    expect(after.y - before.y).toBeCloseTo(130, 0);
    expect(after.x - before.x).toBeCloseTo(20, 0);
    await sticker.focus();
    await page.keyboard.press('ArrowDown');
    expect((await sticker.boundingBox())!.y - after.y).toBeCloseTo(8, 0);
    for (let i = 0; i < 45; i++) await page.keyboard.press('Shift+ArrowRight');
    const bounds = (await page.locator('.homepage-sticker-bounds').boundingBox())!;
    const edge = (await sticker.boundingBox())!;
    expect(edge.x + edge.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
    await page.setViewportSize({ width: 360, height: 720 });
    await expect.poll(async () => {
      const rect = (await sticker.boundingBox())!;
      return rect.x + rect.width;
    }).toBeLessThanOrEqual(351);
    await page.screenshot({ path: `test-results/sticker-${width}.png` });
    await expect(page.locator('.portfolio-editor[open]')).toHaveCount(0);
  });
}

test('touch dragging moves the sticker without scrolling the page', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await desk(page);
  const sticker = page.locator('.homepage-sticker');
  const rect = (await sticker.boundingBox())!;
  const scroll = await page.locator('.archive-scroll-track').evaluate(el => el.scrollTop);
  const cdp = await context.newCDPSession(page);
  const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + i * 2, y: y + i * 10 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => (window as any).stickerSounds.length)).toBe(1);
  expect((await sticker.boundingBox())!.y - rect.y).toBeGreaterThan(80);
  expect(await page.locator('.archive-scroll-track').evaluate(el => el.scrollTop)).toBe(scroll);
  await page.screenshot({ path: 'test-results/sticker-touch.png' });
  await context.close();
});
