import { test, expect } from '@playwright/test';
import fs from 'node:fs';

for (const entry of ['AI短视频', '赛道视频', '展示页']) test(`${entry} accepts the 35 MB boundary and rejects larger files`, async ({ page }) => {
  const data = JSON.parse(fs.readFileSync('public/content.json', 'utf8'));
  data.accountMedia.videos = [];
  data.accountVideoGroups?.forEach((group: { videos: unknown[] }) => { group.videos = []; });
  // Isolate size validation from codec handling with a known playable MP4.
  await page.addInitScript(() => {
    const size = Object.getOwnPropertyDescriptor(Blob.prototype, 'size')!.get!;
    Object.defineProperty(File.prototype, 'size', { get() {
      if (this.name === 'boundary.mp4') return 35 * 1024 * 1024;
      if (this.name === 'too-large.mp4') return 35 * 1024 * 1024 + 1;
      return size.call(this);
    } });
  });
  await page.route('https://api.github.com/**', route => {
    const url = route.request().url();
    const reply = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (url.endsWith('/user')) return reply({ login: 'Jsy1to4winter' });
    if (url.endsWith('/open-archive-portfolio')) return reply({ default_branch: 'main', permissions: { push: true } });
    if (url.includes('/git/ref/')) return reply({ object: { sha: 'head' } });
    if (url.includes('/git/commits/')) return reply({ tree: { sha: 'tree' } });
    if (url.includes('/git/trees/')) return reply({ tree: [{ path: 'public/content.json', sha: 'content' }] });
    return reply({ content: Buffer.from(JSON.stringify(data)).toString('base64') });
  });
  await page.goto('/');
  await page.getByRole('button', { name: '编辑作品集', exact: true }).click();
  await page.getByLabel('编辑凭证', { exact: true }).fill('test-only');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.getByRole('tab').nth(entry === 'AI短视频' ? 1 : entry === '赛道视频' ? 2 : 6).click();
  if (entry === 'AI短视频') await page.getByRole('button', { name: '添加视频作品' }).click();
  if (entry === '赛道视频') await page.locator('.editor-track-group').first().getByRole('button', { name: '添加视频作品' }).click();
  const input = page.locator('.editor-video-upload input[accept="video/mp4,video/webm"]').first();
  const buffer = fs.readFileSync('public/assets/uploads/0c55efa3-231c-45b7-9820-f2c7266a3ea9-h264.mp4');
  await input.setInputFiles({ name: 'too-large.mp4', mimeType: 'video/mp4', buffer });
  await expect(page.getByRole('status')).toContainText('35 MB');
  await expect(page.locator('.editor-video-upload video')).toHaveCount(entry === '展示页' ? 1 : 0);
  await input.setInputFiles({ name: 'boundary.mp4', mimeType: 'video/mp4', buffer });
  await expect(page.getByRole('status')).toContainText('文件已加入草稿', { timeout: 30000 });
  await expect(page.locator('.editor-video-upload video').first()).toHaveAttribute('src', /^blob:/);
  await expect(page.locator('.editor-video-upload video').first()).toHaveAttribute('poster', /^blob:/);
});
