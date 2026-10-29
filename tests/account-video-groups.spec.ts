import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';

const original = JSON.parse(fs.readFileSync('public/content.json', 'utf8').replaceAll('/open-archive-portfolio/', '/'));
const clip = '/assets/uploads/0c55efa3-231c-45b7-9820-f2c7266a3ea9-h264.mp4';
const poster = '/assets/uploads/0c55efa3-231c-45b7-9820-f2c7266a3ea9-poster.jpg';
function fixture() {
  return { ...structuredClone(original), stickers: [], accountVideoGroups: ['萌宠赛道视频', '生活类赛道视频', 'AI漫剧类赛道视频'].map((title, group) => ({ id: `group-${group}`, title, videos: Array.from({ length: 10 }, (_, i) => ({ id: `video-${group}-${i}`, title: '', src: clip, poster })) })) };
}
async function openCraft(page: Page, mobile: boolean) {
  if (mobile) await page.locator('.mobile-module-craft').click();
  else {
    await page.locator('.archive-scroll-track').evaluate(async el => {
      const { progressForModule } = await import('/components/archive/timeline.ts');
      const { portfolioWorks } = await import('/components/archive/content.ts');
      el.scrollTop = progressForModule('craft', portfolioWorks.length) * (el.scrollHeight - el.clientHeight);
    });
    await page.locator('.archive-desk-craft').click();
  }
  await expect(page.locator('.archive-craft-dialog[open]')).toBeVisible();
}

for (const width of [1440, 390]) test(`30 grouped videos follow the accounts and browse independently at ${width}`, async ({ browser, baseURL }) => {
  const mobile = width < 768;
  const context = await browser.newContext({ baseURL, viewport: { width, height: 900 }, isMobile: mobile, hasTouch: mobile });
  const page = await context.newPage();
  const data = fixture(), requests: string[] = [], errors: string[] = [];
  page.on('request', req => { if (req.url().endsWith(clip)) requests.push(req.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/content.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) }));
  await page.goto('/');
  await openCraft(page, mobile);
  const dialog = page.locator('.archive-craft-dialog[open]');
  await expect(dialog.locator('.about-photo-gallery .swiper-initialized')).toBeVisible();
  const rows = dialog.locator('.account-video-group');
  await expect(rows).toHaveCount(3);
  await expect(dialog.locator('.account-group-video')).toHaveCount(30);
  const accounts = (await dialog.locator('.about-photo-gallery').boundingBox())!;
  const accountImage = dialog.locator('.about-photo-gallery .swiper-slide-active img');
  await expect.poll(() => accountImage.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  const imageRect = (await accountImage.boundingBox())!;
  expect(imageRect.height).toBeLessThanOrEqual(mobile ? 190 : 220);
  expect(imageRect.width).toBeLessThanOrEqual(mobile ? 160 : 190);
  expect((await rows.first().boundingBox())!.y).toBeLessThan(650);
  await expect(dialog.locator('.about-photo-gallery')).toHaveCSS('opacity', '1');
  await accountImage.evaluate((el: HTMLImageElement) => el.decode());
  await rows.first().locator('img').first().evaluate((el: HTMLImageElement) => el.decode());
  await page.screenshot({ path: `test-results/compact-accounts-${width}.png` });
  expect((await rows.first().boundingBox())!.y).toBeGreaterThanOrEqual(accounts.y + accounts.height);
  expect(requests).toEqual([]);
  if (mobile) {
    const first = rows.first();
    await first.scrollIntoViewIfNeeded();
    const frame = (await first.locator('.swiper').boundingBox())!;
    const before = await first.locator('.swiper-wrapper').evaluate(el => getComputedStyle(el).transform);
    const cdp = await context.newCDPSession(page);
    const x = frame.x + frame.width * .8, y = frame.y + frame.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - i * 20, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => first.locator('.swiper-wrapper').evaluate(el => getComputedStyle(el).transform)).not.toBe(before);
    await expect(page.locator('.group-video-player[open]')).toHaveCount(0);
    expect(await rows.nth(1).locator('.swiper').evaluate(el => (el as HTMLElement & { swiper: { activeIndex: number } }).swiper.activeIndex)).toBe(0);
  }
  for (let i = 0; i < 3; i++) {
    const row = rows.nth(i);
    await expect(row.getByRole('heading')).toHaveText(data.accountVideoGroups[i].title);
    await expect(row.locator('.swiper-slide')).toHaveCount(10);
    await expect(row.locator('.account-group-count')).toHaveText('10 / 10');
    await row.scrollIntoViewIfNeeded();
    const before = await row.locator('.swiper-wrapper').evaluate(el => getComputedStyle(el).transform);
    await row.getByRole('button', { name: `${data.accountVideoGroups[i].title} 下一页` }).click();
    await expect.poll(() => row.locator('.swiper-wrapper').evaluate(el => getComputedStyle(el).transform)).not.toBe(before);
    await row.locator('.swiper').evaluate(el => (el as HTMLElement & { swiper: { slideTo: (index: number, speed: number) => void } }).swiper.slideTo(9, 0));
    await expect(row.getByRole('button', { name: `${data.accountVideoGroups[i].title} 下一页` })).toBeDisabled();
    const last = (await row.locator('.account-group-video').last().boundingBox())!;
    const frame = (await row.locator('.swiper').boundingBox())!;
    expect(last.x + last.width).toBeLessThanOrEqual(frame.x + frame.width + 1);
    expect(last.x).toBeGreaterThanOrEqual(frame.x - 1);
  }
  await page.screenshot({ path: `test-results/grouped-videos-${width}.png` });
  const row = rows.first();
  await row.scrollIntoViewIfNeeded();
  await row.locator('.account-group-video').last().click();
  const player = page.locator('.group-video-player[open]');
  await expect(player).toBeVisible();
  await expect.poll(() => player.locator('video').evaluate((el: HTMLVideoElement) => el.readyState)).toBeGreaterThanOrEqual(2);
  await expect.poll(() => player.locator('video').evaluate((el: HTMLVideoElement) => el.currentTime)).toBeGreaterThan(0);
  await expect(page.locator('[data-background-music]')).toHaveJSProperty('paused', true);
  expect(requests.length).toBeGreaterThan(0);
  await player.getByRole('button', { name: '关闭赛道视频' }).click();
  await expect(page.locator('[data-background-music]')).toHaveJSProperty('paused', false);
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await dialog.getByRole('button', { name: 'Close details' }).click();
  expect(errors).toEqual([]);
  await context.close();
});

test('legacy content migrates without moving existing videos; invalid group sizes are rejected', async ({ page }) => {
  await page.goto('/');
  const legacy = structuredClone(original);
  delete legacy.accountVideoGroups;
  const result = await page.evaluate(async old => {
    const { normalizeContent, validateContent } = await import('/components/archive/content.ts');
    const migrated = normalizeContent(old);
    const errors: string[] = [];
    const video = { id: 'sample', title: '', src: '/valid.mp4', poster: '' };
    for (const variant of ['eleven', 'four', 'unsafe']) {
      const changed = structuredClone(migrated);
      if (variant === 'eleven') changed.accountVideoGroups[0].videos = Array.from({ length: 11 }, (_, i) => ({ ...video, id: String(i) }));
      if (variant === 'four') changed.accountVideoGroups.push({ id: 'four', title: 'four', videos: [] });
      if (variant === 'unsafe') changed.accountVideoGroups[0].videos = [{ ...video, src: 'javascript:alert(1)' }];
      try { validateContent(changed); } catch { errors.push(variant); }
    }
    return { groups: migrated.accountVideoGroups, existing: migrated.accountMedia, photos: migrated.aboutPhotos, errors };
  }, legacy);
  expect(result.groups).toHaveLength(3);
  expect(result.groups.every(group => !group.videos.length)).toBe(true);
  expect(result.existing).toEqual(original.accountMedia);
  expect(result.photos).toEqual(original.aboutPhotos);
  expect(result.errors).toEqual(['eleven', 'four', 'unsafe']);
});

test('owner uploads the thirtieth video, renames a track and publishes only its own content', async ({ page }) => {
  const data = fixture(); data.accountVideoGroups[0].videos.pop();
  const writes: Array<{ url: string; body: Record<string, unknown> }> = [];
  const root = 'https://api.github.com/repos/Jsy1to4winter/open-archive-portfolio';
  await page.route('https://api.github.com/**', route => {
    const req = route.request(), url = req.url();
    const reply = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (req.method() !== 'GET') { writes.push({ url, body: req.postDataJSON() }); return reply({ sha: url.endsWith('/git/commits') ? 'new-commit' : 'new-object' }); }
    if (url.endsWith('/user')) return reply({ login: 'Jsy1to4winter' });
    if (url === root) return reply({ default_branch: 'main', permissions: { push: true } });
    if (url.includes('/git/ref/')) return reply({ object: { sha: 'base' } });
    if (url.includes('/git/commits/')) return reply({ tree: { sha: 'tree' } });
    if (url.includes('/git/trees/')) return reply({ tree: [{ path: 'public/content.json', sha: 'content' }] });
    return reply({ content: Buffer.from(JSON.stringify(data)).toString('base64') });
  });
  await page.goto('/');
  await page.getByRole('button', { name: '编辑作品集', exact: true }).click();
  await page.getByLabel('编辑凭证', { exact: true }).fill('test-only');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.getByRole('tab').nth(2).click();
  const groups = page.locator('.editor-track-group');
  await expect(groups).toHaveCount(3);
  await page.locator('#field-accountVideoGroups-0-title').fill('宠物日常视频');
  await groups.first().getByRole('button', { name: '添加视频作品' }).click();
  await expect(groups.first().getByRole('button', { name: '添加视频作品' })).toBeDisabled();
  await groups.first().locator('input[type=file]').last().setInputFiles(`public${clip}`);
  await expect(page.getByRole('status')).toContainText('文件已加入草稿', { timeout: 30000 });
  await expect(groups.first().locator('video').last()).toHaveAttribute('poster', /^blob:/);
  await expect(groups.first().locator('video').last()).toHaveAttribute('preload', 'none');
  await expect(page.locator('input[id$="-src"]')).toHaveCount(0);
  await page.getByRole('button', { name: '保存发布', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('已保存到 GitHub', { timeout: 20000 });
  const saved = JSON.parse(Buffer.from(writes.filter(write => write.url.endsWith('/git/blobs')).at(-1)!.body.content as string, 'base64').toString());
  expect(saved.accountVideoGroups.map((group: { videos: unknown[] }) => group.videos.length)).toEqual([10, 10, 10]);
  expect(saved.accountVideoGroups[0].title).toBe('宠物日常视频');
  expect(saved.accountVideoGroups[0].videos[9].poster).toMatch(/assets\/uploads\/.*\.jpg$/);
  expect(saved.accountVideoGroups[0].videos[9].src).toMatch(/assets\/uploads\/.*\.mp4$/);
  expect(JSON.stringify(saved)).not.toContain('blob:');
  expect(saved.accountMedia).toEqual(data.accountMedia);
  expect(saved.aboutPhotos).toEqual(data.aboutPhotos);
  await page.getByRole('tab').nth(0).click();
  await expect(groups).toHaveCount(0);
  await page.getByRole('tab').nth(1).click();
  await expect(groups).toHaveCount(0);
});
