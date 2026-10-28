import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
const original = JSON.parse(fs.readFileSync('public/content.json', 'utf8'));

async function setup(page: Page) {
  const data = structuredClone(original);
  data.stickers = [];
  const writes: any[] = [];
  await page.route('**/content.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) }));
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
  return writes;
}
async function login(page: Page) {
  await page.getByLabel('编辑凭证', { exact: true }).fill('test-only-not-a-token');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByRole('tab')).toHaveCount(8);
}
async function seek(page: Page, id: string) {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.locator('.archive-scroll-track').evaluate(async (el, id) => {
    const { progressForModule } = await import('/components/archive/timeline.ts');
    const { portfolioWorks } = await import('/components/archive/content.ts');
    el.scrollTop = progressForModule(id as any, portfolioWorks.length) * (el.scrollHeight - el.clientHeight);
  }, id);
  await page.waitForTimeout(700);
}
function saved(writes: any[]) {
  return JSON.parse(Buffer.from(writes.filter(item => item.url.endsWith('/git/blobs')).at(-1).body.content, 'base64').toString('utf8'));
}

test('eight section panels are independent and video metadata is not editable', async ({ page }) => {
  const writes = await setup(page);
  await page.getByRole('button', { name: '编辑作品集', exact: true }).click();
  await login(page);
  const tabs = page.getByRole('tab');
  await expect(tabs).toHaveCount(8);
  await expect(tabs.nth(0)).toHaveText(`${original.screenText.about.titleLine1} ${original.screenText.about.titleLine2}`);
  await expect(tabs.nth(1)).toHaveText(original.screenText.fragments.title);
  await expect(tabs.nth(6)).toHaveText(original.templateProfile.name);
  await expect(tabs.nth(7)).toHaveText('贴纸');
  await expect(page.locator('#field-aboutPhotos-0-title')).toHaveCount(original.aboutPhotos?.length ? 1 : 0);
  await expect(page.locator('#field-moduleCopy-about-0-body')).toHaveValue(original.reasons[0].body);
  await page.locator('#field-moduleCopy-about-0-body').fill('Only the About section changes.');
  await tabs.nth(3).click();
  await expect(page.locator('#field-moduleCopy-perspective-0-body')).toHaveValue(original.reasons[0].body);
  await expect(page.locator('#field-moduleCopy-about-0-body')).toHaveCount(0);
  await tabs.nth(1).click();
  await expect(page.getByRole('heading', { name: original.screenText.fragments.title, exact: true })).toBeVisible();
  await expect(page.locator('.editor-video-upload')).toHaveCount(original.accountMedia.videos.length);
  await expect(page.getByLabel('视频地址', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('视频封面', { exact: true })).toHaveCount(0);
  await expect(page.locator('.editor-video-upload input[type=text]')).toHaveCount(0);
  await expect(page.locator('#field-templateProfile-name')).toHaveCount(0);
  await page.getByRole('button', { name: '保存发布', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('已保存到 GitHub', { timeout: 20000 });
  const data = saved(writes);
  expect(data.moduleCopy.about[0].body).toBe('Only the About section changes.');
  expect(data.moduleCopy.perspective[0].body).toBe(original.reasons[0].body);
  expect(data.moduleCopy.craft).toEqual(original.reasons.filter((item: any) => ['02', '04', '05'].includes(item.id)));
  expect(data.accountMedia).toEqual(original.accountMedia);
  expect(data.templateProfile.biography).toBe(original.templateProfile.biography);
  expect(data.templateProfile.name).toBe(original.templateProfile.name);
  expect(data.reasons).toEqual(original.reasons);
});

for (const width of [1440, 390]) {
  test(`AI entry opens its own uncluttered panel at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    await seek(page, 'fragments');
    await page.locator('.archive-desk-fragments .archive-desk-card-arrow').click();
    await page.locator('.archive-account-dialog').getByRole('button', { name: '编辑作品集', exact: true }).click();
    await login(page);
    await expect(page.getByRole('tab').nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: original.screenText.fragments.title, exact: true })).toBeVisible();
    expect(await page.locator('.portfolio-editor').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: `test-results/sections-ai-${width}.png` });
  });
  test(`name card and personal profile stay separate from About at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const writes = await setup(page);
    await seek(page, 'about');
    const card = page.locator('.archive-name-slip');
    await expect(card.locator('svg')).toHaveCount(0);
    await expect(card).not.toContainText('Profile');
    await expect(card).toContainText(original.templateProfile.name);
    await card.click();
    const image = page.locator('.profile-about-image');
    const copy = page.locator('.profile-about-copy');
    const left = (await image.boundingBox())!, right = (await copy.boundingBox())!;
    expect(left.x + left.width).toBeLessThan(right.x);
    expect(left.y).toBeCloseTo(right.y, 0);
    await expect(image).toHaveCSS('border-radius', '8px');
    await expect(copy.locator('h3')).toHaveText('About');
    await expect(copy).not.toContainText('Replace this');
    await expect(page.locator('.archive-resume-section')).toHaveCount(0);
    expect((await page.locator('.profile-about-layout').boundingBox())!.height).toBeGreaterThanOrEqual(620);
    await page.screenshot({ path: `test-results/sections-profile-${width}.png` });
    await page.locator('.archive-resume-dialog').getByRole('button', { name: '编辑作品集', exact: true }).click();
    await login(page);
    await expect(page.getByRole('tab').nth(6)).toHaveAttribute('aria-selected', 'true');
    await page.locator('#field-templateProfile-image').locator('..').locator('input[type=file]').setInputFiles('public/assets/operations/douyin-data-3.jpg');
    await expect(page.getByRole('status')).toContainText('文件已加入草稿');
    await page.getByLabel('个人简介', { exact: true }).fill('My introduction.');
    await page.getByRole('button', { name: '保存发布', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('已保存到 GitHub', { timeout: 20000 });
    const data = saved(writes);
    expect(data.templateProfile.image).toContain('assets/uploads/');
    expect(data.templateProfile.biography).toBe('My introduction.');
    expect(data.templateResume).toEqual(original.templateResume);
    expect(data.reasons).toEqual(original.reasons);
    expect(data.moduleCopy.about[0].body).toBe(original.reasons[0].body);
  });
}
