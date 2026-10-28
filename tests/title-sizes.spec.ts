import { test, expect } from '@playwright/test';
import fs from 'node:fs';
for (const width of [1440, 390]) test(`independent title sizing previews and publishes at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const data = JSON.parse(fs.readFileSync('public/content.json', 'utf8'));
  delete data.titleSizes;
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
    return reply({ content: Buffer.from(JSON.stringify(data)).toString('base64') });
  });
  await page.goto('/');
  await page.getByRole('button', { name: '编辑作品集', exact: true }).click();
  await page.getByLabel('编辑凭证', { exact: true }).fill('test-only-not-a-token');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.locator('#field-titleSizes-about')).toHaveValue('76');
  await page.locator('#field-titleSizes-about').fill('48');
  await page.getByRole('tab').nth(1).click();
  await expect(page.locator('#field-titleSizes-about')).toHaveCount(0);
  await page.locator('#field-titleSizes-fragments').fill('50');
  await page.getByRole('button', { name: '预览', exact: true }).click();
  await expect.poll(() => page.locator('.archive-desk-stat').evaluate(el => getComputedStyle(el).fontSize)).toBe('50px');
  await page.getByRole('button', { name: '编辑作品集', exact: true }).click();
  await page.getByRole('button', { name: '保存发布', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('已保存到 GitHub');
  const blob = writes.filter(item => item.url.endsWith('/git/blobs')).at(-1);
  const saved = JSON.parse(Buffer.from(blob.body.content, 'base64').toString('utf8'));
  expect(saved.titleSizes).toEqual({ about: 48, fragments: 50, craft: 37, perspective: 39, gallery: 34, collaboration: 26 });
  expect(saved.screenText).toEqual(data.screenText);
  expect(saved.accountMedia).toEqual(data.accountMedia);
});
