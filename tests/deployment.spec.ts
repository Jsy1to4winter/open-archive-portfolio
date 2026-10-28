import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

test('saving waits for the public artifact before offering the updated share link', async ({ page }) => {
  const original = JSON.parse(fs.readFileSync('public/content.json', 'utf8'));
  let savedHash = '';
  let live = false;
  await page.route('**/version.json?*', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ revision: 'old-build', contentHash: live ? savedHash : 'old-content' }) }));
  await page.route('https://api.github.com/**', route => {
    const req = route.request(), url = req.url();
    const reply = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (req.method() !== 'GET') {
      if (url.endsWith('/git/blobs')) savedHash = createHash('sha256').update(Buffer.from(req.postDataJSON().content, 'base64')).digest('hex');
      return reply({ sha: url.endsWith('/git/commits') ? 'saved-revision' : 'object' });
    }
    if (url.endsWith('/user')) return reply({ login: 'Jsy1to4winter' });
    if (url.endsWith('/open-archive-portfolio')) return reply({ default_branch: 'main', permissions: { push: true } });
    if (url.includes('/git/ref/')) return reply({ object: { sha: 'head' } });
    if (url.includes('/git/commits/')) return reply({ tree: { sha: 'tree' } });
    if (url.includes('/git/trees/')) return reply({ tree: [{ path: 'public/content.json', sha: 'content' }] });
    return reply({ content: Buffer.from(JSON.stringify(original)).toString('base64') });
  });
  await page.goto('/');
  await page.getByRole('button', { name: '编辑作品集', exact: true }).click();
  await page.getByLabel('编辑凭证', { exact: true }).fill('test-only');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.getByRole('tab', { name: '贴纸', exact: true }).click();
  await page.locator('#field-stickers-0-width').fill('210');
  await page.getByRole('button', { name: '保存发布', exact: true }).click();
  await expect(page.locator('.editor-deployment')).toContainText('等待部署');
  await expect(page.getByRole('link', { name: '查看部署进度' })).toHaveAttribute('href', /actions\/workflows\/pages.yml$/);
  await expect(page.getByRole('link', { name: '打开已更新的作品集' })).toHaveCount(0);
  live = true;
  await expect(page.locator('.editor-deployment')).toContainText('已确认公开版本更新', { timeout: 15000 });
  await expect(page.getByRole('link', { name: '打开已更新的作品集' })).toHaveAttribute('href', 'https://jsy1to4winter.github.io/open-archive-portfolio/?v=saved-revision');
});
