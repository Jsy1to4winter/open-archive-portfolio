import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';

async function start(page: Page) {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const music = page.locator('audio[data-background-music]');
  await expect.poll(() => music.evaluate((el: HTMLAudioElement) => el.paused)).toBe(false);
  await expect.poll(() => music.evaluate((el: HTMLAudioElement) => el.currentTime)).toBeGreaterThan(0.05);
  await expect(music).toHaveJSProperty('loop', true);
  return music;
}

test('music yields to audible media, resumes at the same position, and respects manual pause', async ({ page }) => {
  const music = await start(page);
  const before = await music.evaluate((el: HTMLAudioElement) => el.currentTime);
  await page.evaluate(async () => {
    const audio = document.createElement('audio');
    audio.id = 'test-other-audio';
    audio.src = '/assets/portfolio-background.mp3';
    document.body.append(audio);
    await audio.play();
  });
  await expect(music).toHaveJSProperty('paused', true);
  await page.evaluate(() => document.getElementById('test-other-audio')!.remove());
  await expect(music).toHaveJSProperty('paused', false);
  expect(await music.evaluate((el: HTMLAudioElement) => el.currentTime)).toBeGreaterThanOrEqual(before);
  await page.getByRole('button', { name: '暂停背景音乐', exact: true }).click();
  await expect(music).toHaveJSProperty('paused', true);
  await page.evaluate(async () => {
    const { holdAudioFocus } = await import('/components/archive/audio-focus.ts');
    const release = holdAudioFocus(); release();
  });
  await expect(music).toHaveJSProperty('paused', true);
  await page.getByRole('button', { name: '播放背景音乐', exact: true }).click();
  await expect(music).toHaveJSProperty('paused', false);
});

for (const width of [1440, 390]) test(`video dialog suspends music until closed at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const content = JSON.parse(fs.readFileSync('public/content.json', 'utf8'));
  content.stickers = [];
  content.accountMedia.videos = [{ id: 'test-video', title: '测试作品', src: '/assets/uploads/0c55efa3-231c-45b7-9820-f2c7266a3ea9-h264.mp4', poster: '' }];
  await page.route('**/content.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(content) }));
  const music = await start(page);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  if (width < 768) await page.locator('.mobile-module-fragments').click();
  else {
  await page.locator('.archive-scroll-track').evaluate(async el => {
    const { progressForModule } = await import('/components/archive/timeline.ts');
    const { portfolioWorks } = await import('/components/archive/content.ts');
    el.scrollTop = progressForModule('fragments', portfolioWorks.length) * (el.scrollHeight - el.clientHeight);
  });
  await page.waitForTimeout(700);
  await page.locator('.archive-desk-fragments .archive-desk-card-arrow').click();
  }
  await page.locator('.account-video-poster').click();
  await expect(page.locator('.account-video-player[open]')).toBeVisible();
  await expect(music).toHaveJSProperty('paused', true);
  await page.locator('.account-video-player video').evaluate((el: HTMLVideoElement) => el.pause());
  await expect(music).toHaveJSProperty('paused', true);
  await page.screenshot({ path: `test-results/background-music-${width}.png` });
  await page.getByRole('button', { name: '关闭视频', exact: true }).click();
  await expect(music).toHaveJSProperty('paused', false);
});

test('sticker sound layers over background music without pausing it', async ({ page }) => {
  const music = await start(page);
  await page.evaluate(async () => {
    const { prepareStickerSound, unlockStickerSound } = await import('/components/archive/sticker-sound.ts');
    await prepareStickerSound(); unlockStickerSound();
  });
  await page.evaluate(async () => {
    const { playStickerSound } = await import('/components/archive/sticker-sound.ts');
    playStickerSound();
    if ((document.querySelector('[data-background-music]') as HTMLAudioElement).paused) throw new Error('Sticker unexpectedly paused music');
  });
  await expect(music).toHaveJSProperty('paused', false);
});

test('blocked autoplay offers a working first-click music button', async ({ page }) => {
  await page.addInitScript(() => {
    let unlocked = false;
    document.addEventListener('pointerdown', () => { unlocked = true; }, true);
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (this.src.includes('portfolio-background.mp3') && !unlocked) return Promise.reject(new DOMException('Blocked autoplay', 'NotAllowedError'));
      return play.call(this);
    };
  });
  await page.goto('/');
  const music = page.locator('[data-background-music]');
  await expect(music).toHaveJSProperty('paused', true);
  await page.getByRole('button', { name: '播放背景音乐', exact: true }).click();
  await expect(music).toHaveJSProperty('paused', false);
});
