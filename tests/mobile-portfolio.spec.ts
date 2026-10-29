import { test, expect } from '@playwright/test';
import fs from 'node:fs';

for (const width of [320, 390, 430]) test(`touch portfolio has reachable modules and edge-only stickers at ${width}`, async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors: string[] = [], requests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  const data = JSON.parse(fs.readFileSync('public/content.json', 'utf8').replaceAll('/open-archive-portfolio/', '/'));
  data.accountMedia.videos = [{ id: 'fixture', title: '测试视频', src: '/assets/uploads/0c55efa3-231c-45b7-9820-f2c7266a3ea9-h264.mp4', poster: '/assets/uploads/0c55efa3-231c-45b7-9820-f2c7266a3ea9-poster.jpg' }];
  await page.route('**/content.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) }));
  await page.goto('/');
  await expect(page.locator('.mobile-module')).toHaveCount(6);
  await expect(page.locator('.mobile-intro')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '播放展示视频' })).toHaveCount(0);
  expect((await page.locator('.mobile-module-about').boundingBox())!.y).toBeLessThan(110);
  await page.waitForTimeout(500);
  expect(requests.filter(url => /\.mp4(?:\?|$)|sticker-forge|\/three|artist-portrait|artist-particles|ffmpeg-core/.test(url))).toEqual([]);
  await expect(page.locator('.archive-desk-camera')).toHaveCount(0);
  const middle = (await page.locator('.mobile-module-about').boundingBox())!;
  for (const sticker of await page.locator('.homepage-sticker').all()) {
    const rect = (await sticker.boundingBox())!;
    expect(rect.width).toBeLessThanOrEqual(48);
    expect(rect.x + rect.width <= middle.x || rect.x >= middle.x + middle.width).toBe(true);
  }
  for (const label of ['about', 'fragments', 'craft', 'perspective', 'works', 'collaboration']) {
    const card = page.locator(`.mobile-module-${label}`);
    await card.scrollIntoViewIfNeeded();
    const rect = (await card.boundingBox())!;
    expect(rect.width).toBeGreaterThan(200);
    await card.tap({ position: { x: rect.width / 2, y: 70 } });
    const dialog = page.locator('.archive-archive-dialog[open]');
    await expect(dialog).toBeVisible();
    await expect(page.locator('.mobile-sticker-rail:visible')).toHaveCount(0);
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    if (label === 'about') {
      await expect(dialog.locator('.profile-about-image svg')).toBeVisible();
      await expect(dialog.locator('.artist-interactive')).toHaveAttribute('data-interactive', 'false');
      await dialog.evaluate(el => { el.scrollTop = el.scrollHeight; });
      const closeRect = (await dialog.getByRole('button', { name: 'Close details' }).boundingBox())!;
      expect(closeRect.y).toBeGreaterThanOrEqual(0);
      expect(closeRect.y + closeRect.height).toBeLessThan(80);
      await page.screenshot({ path: `test-results/mobile-about-bottom-${width}.png` });
    }
    if (label === 'craft') {
      const counter = dialog.locator('.about-photo-controls span');
      await expect(counter).toContainText('02');
      await dialog.getByRole('button', { name: '下一个账号主页' }).tap();
      await expect(counter).toContainText('03');
    }
    if (label === 'fragments') {
      await expect(dialog.locator('.account-video-runway')).toHaveCSS('height', /[0-9.]+px/);
      expect(await dialog.locator('.account-video-runway').evaluate(el => el.clientHeight)).toBeLessThan(500);
      await dialog.locator('.account-video-poster[aria-current=true]').tap();
      const video = page.locator('.account-video-player[open] video');
      await expect(video).toBeVisible();
      await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.readyState)).toBeGreaterThanOrEqual(2);
      await expect(page.locator('[data-background-music]')).toHaveJSProperty('paused', true);
      await page.getByRole('button', { name: '关闭视频', exact: true }).tap();
    }
    if (label === 'works') {
      await expect(dialog.locator('.mobile-data-controls span')).toHaveText(`1 / ${data.portfolioWorks.length}`);
      const image = dialog.locator('.mobile-data-gallery .swiper-slide-active img');
      await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
      await dialog.getByRole('button', { name: '下一张数据图片' }).tap();
      await expect(dialog.locator('.mobile-data-controls span')).toHaveText(`2 / ${data.portfolioWorks.length}`);
      await expect.poll(() => dialog.locator('.mobile-data-gallery .swiper').evaluate(el => (el as HTMLElement & { swiper: { animating: boolean } }).swiper.animating)).toBe(false);
      await page.screenshot({ path: `test-results/mobile-data-${width}.png` });
    }
    await dialog.getByRole('button', { name: 'Close details' }).tap();
    await expect(dialog).toHaveCount(0);
    if (label === 'works') {
      await card.tap();
      await expect(page.locator('.mobile-data-controls span')).toHaveText(`1 / ${data.portfolioWorks.length}`);
      await page.getByRole('button', { name: 'Close details' }).tap();
    }
  }
  await page.locator('.mobile-scroll').evaluate(el => { el.scrollTop = 0; });
  await page.screenshot({ path: `test-results/mobile-home-${width}.png` });
  // A side sticker can move along its rail but cannot enter the content column.
  const sticker = page.locator('.homepage-sticker').first();
  const before = (await sticker.boundingBox())!;
  const cdp = await context.newCDPSession(page);
  const x = before.x + before.width / 2, y = before.y + before.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + i * 10, y: y + i * 8 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const after = (await sticker.boundingBox())!;
  expect(after.x).toBeCloseTo(before.x, 0);
  expect(after.y).toBeGreaterThan(before.y + 40);
  expect(after.x + after.width).toBeLessThan(middle.x);
  // Phone landscape keeps the phone UI, with every entry still available.
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('.mobile-portfolio')).toBeVisible();
  await expect(page.locator('.mobile-module')).toHaveCount(6);
  await page.screenshot({ path: `test-results/mobile-landscape-${width}.png` });
  expect(errors).toEqual([]);
  await context.close();
});
