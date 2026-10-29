import { test, expect } from '@playwright/test';
import fs from 'node:fs';
for (const width of [1440, 390]) test(`intro texts and video can be replaced at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const original = JSON.parse(fs.readFileSync('public/content.json', 'utf8'));
  const writes: any[] = [];
  await page.route('https://api.github.com/**', route => {
    const url = route.request().url();
    const reply = (value: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(value) });
    if (route.request().method() !== 'GET') { writes.push({ url, body: route.request().postDataJSON() }); return reply({ sha: 'updated' }); }
    if (url.endsWith('/user')) return reply({ login: 'Jsy1to4winter' });
    if (url.endsWith('/open-archive-portfolio')) return reply({ default_branch: 'main', permissions: { push: true } });
    if (url.includes('/git/ref/')) return reply({ object: { sha: 'head' } });
    if (url.includes('/git/commits/')) return reply({ tree: { sha: 'tree' } });
    if (url.includes('/git/trees/')) return reply({ tree: [{ path: 'public/content.json', sha: 'data' }] });
    return reply({ content: Buffer.from(JSON.stringify(original)).toString('base64') });
  });
  await page.goto('/');
  await expect(page.locator('.archive-intro-credit')).toHaveCount(0);
  if (width >= 768) await expect(page.locator('.archive-intro-footer')).not.toContainText('BY KAKI');
  await page.getByRole('button', { name: '编辑作品集', exact: true }).click();
  await page.getByLabel('编辑凭证', { exact: true }).fill('test-only-not-a-token');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.getByRole('tab', { name: '展示页', exact: true }).click();
  await page.locator('#field-templateProfile-brand').fill('MY STUDIO');
  await page.locator('#field-screenText-intro-titleLine1').fill('My creative');
  await page.locator('#field-screenText-intro-titleLine2').fill('portfolio');
  await page.locator('#field-screenText-intro-selectedWork').fill('MY WORK');
  await page.getByText('替换展示页视频', { exact: true }).locator('input').setInputFiles('public/assets/uploads/0c55efa3-231c-45b7-9820-f2c7266a3ea9-h264.mp4');
  await expect(page.getByRole('status')).toContainText('文件已加入草稿');
  await expect(page.locator('.editor-video-upload video')).toHaveJSProperty('videoWidth', 1056);
  await page.getByRole('button', { name: '预览', exact: true }).click();
  if (width >= 768) {
    await expect(page.locator('.archive-screen-eyebrow')).toHaveText('MY STUDIO / MY WORK');
    await expect(page.locator('.archive-screen-title')).toContainText('My creative');
    await expect(page.locator('.archive-computer-screen video')).toHaveJSProperty('videoWidth', 1056);
  } else {
    await expect(page.locator('.mobile-brand')).toHaveText('MY STUDIO');
    await expect(page.locator('.mobile-intro')).toHaveCount(0);
  }
  await page.screenshot({ path: `test-results/intro-edited-${width}.png` });
  await page.getByRole('button', { name: '编辑作品集', exact: true }).click();
  await page.getByRole('button', { name: '保存发布', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('已保存到 GitHub');
  const blob = writes.filter(item => item.url.endsWith('/git/blobs')).at(-1);
  const saved = JSON.parse(Buffer.from(blob.body.content, 'base64').toString('utf8'));
  expect(saved.introMedia.src).toContain('uploads/');
  expect(saved.introMedia.poster).toContain('uploads/');
  expect(saved.templateProfile.brand).toBe('MY STUDIO');
  expect(saved.screenText.intro.titleLine2).toBe('portfolio');
  expect(saved.accountMedia).toEqual(original.accountMedia);
  expect(JSON.stringify(saved)).not.toContain('blob:');
});
