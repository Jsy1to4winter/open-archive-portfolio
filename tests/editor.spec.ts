import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";

const original = JSON.parse(fs.readFileSync("public/content.json", "utf8"));
const root =
  "https://api.github.com/repos/Jsy1to4winter/open-archive-portfolio";
async function mockGithub(
  page: Page,
  options: {
    owner?: boolean;
    denied?: boolean;
    conflict?: boolean;
    error?: boolean;
    cleanDesk?: boolean;
  } = {},
) {
  const writes: Array<{ url: string; body: Record<string, unknown> }> = [];
  let refReads = 0;
  await page.route("https://api.github.com/**", async (route) => {
    const request = route.request();
    const url = request.url();
    const reply = (json: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(json),
      });
    if (request.method() !== "GET") {
      writes.push({ url, body: request.postDataJSON() });
      if (options.denied) return reply({ message: "Forbidden" }, 403);
      if (options.error) return reply({ message: "Unavailable" }, 503);
      return reply({
        sha: url.endsWith("/git/commits") ? "new-commit" : "new-object",
      });
    }
    if (url.endsWith("/user"))
      return reply({
        login: options.owner === false ? "visitor" : "Jsy1to4winter",
      });
    if (url === root)
      return reply({ default_branch: "main", permissions: { push: true } });
    if (url.includes("/git/ref/"))
      return reply({
        object: {
          sha:
            options.conflict && refReads++ > 0 ? "other-commit" : "base-commit",
        },
      });
    if (url.includes("/git/commits/"))
      return reply({ tree: { sha: "base-tree" } });
    if (url.includes("/git/trees/"))
      return reply({
        tree: [{ path: "public/content.json", sha: "content-blob" }],
      });
    if (url.includes("/git/blobs/content-blob"))
      return reply({
        content: Buffer.from(JSON.stringify(options.cleanDesk ? { ...original, stickers: [] } : original)).toString("base64"),
      });
    return reply({}, 404);
  });
  return writes;
}
async function enter(page: Page, owner = true) {
  await page.goto("/");
  await page.getByRole("button", { name: "编辑作品集", exact: true }).click();
  await page
    .getByLabel("编辑凭证", { exact: true })
    .fill("test-only-not-a-real-token");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  if (owner) await page.getByRole('tab').nth(6).click();
}

test('owner uploads and publishes About photos', async ({ page }) => {
  const writes = await mockGithub(page);
  await enter(page);
  await page.getByRole('tab').nth(0).click();
  const index = original.aboutPhotos?.length ?? 0;
  await page.getByRole('button', { name: '添加关于我图片', exact: true }).click();
  await page.locator(`#field-aboutPhotos-${index}-image`).locator('..').locator('input[type=file]').setInputFiles('public/assets/operations/douyin-data-3.jpg');
  await expect(page.getByRole('status')).toContainText('文件已加入草稿');
  await page.locator(`#field-aboutPhotos-${index}-title`).fill('我的照片');
  await page.getByRole('button', { name: '保存发布', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('已保存到 GitHub', { timeout: 15000 });
  const blob = writes.filter(item => item.url.endsWith('/git/blobs')).at(-1)!;
  const saved = JSON.parse(Buffer.from(blob.body.content as string, 'base64').toString('utf8'));
  expect(saved.aboutPhotos[index].title).toBe('我的照片');
  expect(saved.aboutPhotos[index].image).toContain('uploads/');
  expect(saved.aboutPhotos.slice(0, index)).toEqual(original.aboutPhotos ?? []);
  expect(saved.reasons).toEqual(original.reasons);
  expect(JSON.stringify(saved)).not.toContain('blob:');
});

test("owner uploads and sizes multiple stickers and publishes them", async ({ page }) => {
  const writes = await mockGithub(page);
  await enter(page);
  await page.getByRole('tab', { name: '贴纸', exact: true }).click();
  await page.getByRole('button', { name: '添加贴纸', exact: true }).click();
  const index = original.stickers.length;
  await page.locator(`#field-stickers-${index}-image`).locator('..').locator('input[type=file]').setInputFiles('public/assets/operations/douyin-data-3.jpg');
  await expect(page.getByRole('status')).toContainText('文件已加入草稿');
  await page.locator(`#field-stickers-${index}-width`).fill('180');
  await page.getByRole('button', { name: '保存发布', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('已保存到 GitHub', { timeout: 15000 });
  const blob = writes.filter(item => item.url.endsWith('/git/blobs')).at(-1)!;
  const saved = JSON.parse(Buffer.from(blob.body.content as string, 'base64').toString('utf8'));
  expect(saved.stickers).toHaveLength(index + 1);
  expect(saved.stickers[index].width).toBe(180);
  expect(saved.stickers[index].image).toContain('uploads/');
  expect(JSON.stringify(saved)).not.toContain('blob:');
  expect(saved.accountMedia).toEqual(original.accountMedia);
});

test('owner sticker arrangement publishes and visitors start from it', async ({ page }) => {
  const writes = await mockGithub(page);
  await enter(page);
  await page.getByRole('button', { name: '预览', exact: true }).click();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.locator('.archive-scroll-track').evaluate(async el => {
    const { progressForModule } = await import('/components/archive/timeline.ts');
    const { portfolioWorks } = await import('/components/archive/content.ts');
    el.scrollTop = progressForModule('about', portfolioWorks.length) * (el.scrollHeight - el.clientHeight);
  });
  const sticker = page.locator('.homepage-sticker').first();
  await expect(sticker).toBeVisible();
  await page.waitForTimeout(700);
  const before = (await sticker.boundingBox())!;
  const centerX = before.x + before.width / 2, centerY = before.y + before.height / 2;
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX + 80, centerY + 100, { steps: 12 });
  await page.mouse.up();
  const arranged = (await sticker.boundingBox())!;
  await page.getByRole('button', { name: '编辑作品集', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('贴纸位置已加入草稿');
  await page.getByRole('button', { name: '保存发布', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('已保存到 GitHub', { timeout: 20000 });
  const blob = writes.filter(item => item.url.endsWith('/git/blobs')).at(-1)!;
  const saved = JSON.parse(Buffer.from(blob.body.content as string, 'base64').toString('utf8'));
  expect(saved.stickers[0].x).toBeGreaterThan(0);
  expect(saved.stickers[0].y).toBeGreaterThan(0);
  await page.route('**/content.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(saved) }));
  await page.reload();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.locator('.archive-scroll-track').evaluate(async el => {
    const { progressForModule } = await import('/components/archive/timeline.ts');
    const { portfolioWorks } = await import('/components/archive/content.ts');
    el.scrollTop = progressForModule('about', portfolioWorks.length) * (el.scrollHeight - el.clientHeight);
  });
  await expect(sticker).toBeVisible();
  await page.waitForTimeout(700);
  expect((await sticker.boundingBox())!.x).toBeCloseTo(arranged.x, 0);
  expect((await sticker.boundingBox())!.y).toBeCloseTo(arranged.y, 0);
  const count = writes.length;
  await sticker.focus();
  await page.keyboard.press('ArrowRight');
  expect(writes.length).toBe(count);
  expect((await sticker.boundingBox())!.x).toBeGreaterThan(arranged.x);
});

test("visitor is rejected and never writes", async ({ page }) => {
  const writes = await mockGithub(page, { owner: false });
  await enter(page, false);
  await expect(page.getByRole("alert")).toContainText("只有网站所有者");
  await expect(page.getByRole("button", { name: "保存发布" })).toHaveCount(0);
  expect(writes).toHaveLength(0);
  expect(
    await page.evaluate(() => JSON.stringify({ ...localStorage })),
  ).not.toContain("test-only");
});
test("owner edits, previews and publishes UTF-8 content atomically", async ({
  page,
}) => {
  const writes = await mockGithub(page);
  await enter(page);
  await page.getByLabel("姓名", { exact: true }).fill("我的名字");
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await expect(page.locator(".archive-name-slip-name")).toHaveText(
    "我的名字",
  );
  await page.getByRole("button", { name: "编辑作品集", exact: true }).click();
  await page.getByRole("button", { name: "保存发布", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("已保存到 GitHub");
  expect(writes.map((w) => w.url.split("/").pop())).toEqual([
    "blobs",
    "trees",
    "commits",
    "main",
  ]);
  const data = JSON.parse(
    Buffer.from(writes[0].body.content as string, "base64").toString("utf8"),
  );
  expect(data.templateProfile.name).toBe("我的名字");
  expect(writes[1].body.base_tree).toBe("base-tree");
  expect(writes[3].body.force).toBe(false);
  await page.getByRole("button", { name: "退出", exact: true }).click();
  await expect(page.getByLabel("编辑凭证", { exact: true })).toHaveValue("");
});
test("upload computes image dimensions and shares one atomic commit", async ({
  page,
}) => {
  const writes = await mockGithub(page);
  await enter(page);
  await page.getByRole('tab').nth(4).click();
  const image = await page.screenshot();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({ name: "art.png", mimeType: "image/png", buffer: image });
  await expect(
    page.getByLabel("作品图片", { exact: true }).first(),
  ).toHaveValue(/assets\/uploads\/.+\.png$/);
  await page.getByRole("button", { name: "保存发布", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("已保存到 GitHub");
  const savedImageData = JSON.parse(Buffer.from(writes.filter(w => w.url.endsWith('/git/blobs')).at(-1)!.body.content as string, 'base64').toString('utf8'));
  expect(savedImageData.portfolioWorks[0].width).toBe(1280);
  expect(writes.filter((w) => w.url.endsWith("/git/commits"))).toHaveLength(1);
  expect(writes.filter((w) => w.url.endsWith("/git/blobs"))).toHaveLength(2);
  const tree = writes.find((w) => w.url.endsWith("/git/trees"))!;
  expect(
    (tree.body.tree as Array<{ path: string }>).some((entry) =>
      entry.path.startsWith("public/assets/uploads/"),
    ),
  ).toBe(true);
});
test("concurrent update cannot overwrite repository", async ({ page }) => {
  const writes = await mockGithub(page, { conflict: true });
  await enter(page);
  await page.getByRole('tab').nth(0).click();
  await page.getByLabel("姓名", { exact: true }).fill("Changed");
  await page.getByRole("button", { name: "保存发布", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("仓库已发生更新");
  expect(writes).toHaveLength(0);
});
test("read-only credentials fail saving and keep draft", async ({ page }) => {
  const writes = await mockGithub(page, { denied: true });
  await enter(page);
  await page.getByLabel("姓名", { exact: true }).fill("My draft");
  await page.getByRole("button", { name: "保存发布", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("没有此仓库的编辑权限");
  await expect(page.getByLabel("姓名", { exact: true })).toHaveValue(
    "My draft",
  );
  expect(writes.some((w) => w.url.includes("/git/refs/"))).toBe(false);
});
test("discard restores public view and invalid links cannot publish", async ({
  page,
}) => {
  const writes = await mockGithub(page);
  await enter(page);
  await page
    .getByLabel("个人图片", { exact: true })
    .fill("javascript:alert(1)");
  await page.getByRole("button", { name: "保存发布", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("链接必须");
  expect(writes).toHaveLength(0);
  await page.getByRole("button", { name: "取消修改", exact: true }).click();
  await expect(page.getByLabel("个人图片", { exact: true })).toHaveValue(
    original.templateProfile.image ?? '',
  );
});
test("page text can be selected directly after owner preview", async ({
  page,
}) => {
  await mockGithub(page);
  await enter(page);
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('portfolio-open-editor', { detail: { section: 'profile' } })));
  await expect(page.getByLabel("姓名", { exact: true })).toBeVisible();
});
test("screen copy migrates old content and publishes without replacing profile", async ({
  page,
}) => {
  const writes = await mockGithub(page);
  await enter(page);
  await page.getByRole('tab').nth(0).click();
  await expect(page.locator("#field-screenText-about-titleLine1")).toHaveValue(
    original.screenText?.about.titleLine1 ?? "A little",
  );
  await page.locator("#field-screenText-about-titleLine1").fill("关于我的");
  await page.getByRole('tab').nth(1).click();
  await page.locator("#field-screenText-fragments-title").fill("灵感");
  await page.getByRole('tab').nth(2).click();
  await page.locator("#field-screenText-craft-titleLine1").fill("创作过程");
  await page.getByRole('tab').nth(3).click();
  await page.locator("#field-screenText-perspective-tag").fill("保持好奇");
  await page.getByRole('tab').nth(5).click();
  await page
    .locator("#field-screenText-collaboration-titleLine1")
    .fill("一起合作");
  await page.getByRole('tab').nth(4).click();
  await page.locator("#field-screenText-gallery-titleLine1").fill("精选");
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await expect(page.locator(".archive-screen-title-line").first()).toHaveText(
    original.screenText.intro.titleLine1,
  );
  await expect(page.locator(".archive-desk-about-title")).toContainText(
    "关于我的",
  );
  await expect(page.locator(".archive-desk-stat")).toHaveText("灵感");
  await expect(page.locator(".archive-desk-user-tag")).toHaveText("保持好奇");
  await page.getByRole("button", { name: "编辑作品集", exact: true }).click();
  await page.getByRole("button", { name: "保存发布", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("已保存到 GitHub");
  const saved = JSON.parse(
    Buffer.from(writes[0].body.content as string, "base64").toString("utf8"),
  );
  expect(saved.templateProfile.name).toEqual(original.templateProfile.name);
  expect(saved.portfolioWorks).toEqual(original.portfolioWorks);
  expect(saved.screenText.gallery.titleLine1).toBe("精选");
  await page.route("**/content.json", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(saved),
    }),
  );
  await page.reload();
  await expect(page.locator(".archive-screen-title-line").first()).toHaveText(
    original.screenText.intro.titleLine1,
  );
});
test("clicking card title opens the exact screen text field instead of details", async ({
  page,
}) => {
  await mockGithub(page, { cleanDesk: true });
  await enter(page);
  await page.getByRole('tab').nth(0).click();
  await page.locator("#field-screenText-about-titleLine1").fill("同样的标题");
  await page.getByRole('tab').nth(2).click();
  await page.locator("#field-screenText-craft-titleLine1").fill("同样的标题");
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.locator(".archive-scroll-track").evaluate(async (el) => {
    // Use the same timeline mapping as the visible chapter navigation.
    const module = await import("/components/archive/timeline.ts");
    const content = await import("/components/archive/content.ts");
    const progress = module.progressForModule(
      "about",
      content.portfolioWorks.length,
    );
    el.scrollTop = progress * (el.scrollHeight - el.clientHeight);
  });
  await page.waitForTimeout(700);
  await page.locator(".archive-desk-about-title > span").first().click();
  await expect(
    page.locator("#field-screenText-about-titleLine1"),
  ).toBeFocused();
  await expect(page.locator(".archive-archive-dialog[open]")).toHaveCount(0);
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.locator(".archive-scroll-track").evaluate(async (el) => {
    const module = await import("/components/archive/timeline.ts");
    el.scrollTop =
      module.progressForModule(
        "craft",
        (await import("/components/archive/content.ts")).portfolioWorks.length,
      ) *
      (el.scrollHeight - el.clientHeight);
  });
  await page.waitForTimeout(700);
  await page.locator('[data-edit-path="screenText.craft.titleLine1"]').click();
  await expect(
    page.locator("#field-screenText-craft-titleLine1"),
  ).toBeFocused();
});
test("editor remains accessible from an open portfolio detail", async ({
  page,
}) => {
  await mockGithub(page);
  await page.goto("/");
  await page.locator(".archive-intro-skip").click();
  await page.getByRole("button", { name: "Say hello", exact: true }).click();
  const detail = page.locator(".archive-archive-dialog[open]");
  await expect(detail).toBeVisible();
  const edit = detail.getByRole("button", { name: "编辑作品集", exact: true });
  const editBox = (await edit.boundingBox())!;
  const closeBox = (await detail
    .getByRole("button", { name: "Close details" })
    .boundingBox())!;
  expect(editBox.x + editBox.width).toBeLessThanOrEqual(closeBox.x);
  await edit.click();
  await expect(
    page.getByRole("heading", { name: "所有者登录", exact: true }),
  ).toBeVisible();
});
test("backup restores draft and cannot write outside media paths", async ({
  page,
}) => {
  const writes = await mockGithub(page);
  await enter(page);
  await page.locator('input[accept="application/json,.json"]').setInputFiles({
    name: "draft.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        content: {
          ...original,
          templateProfile: { ...original.templateProfile, name: "恢复草稿" },
        },
        uploads: [],
      }),
    ),
  });
  await expect(page.getByLabel("姓名", { exact: true })).toHaveValue(
    "恢复草稿",
  );
  await page.locator('input[accept="application/json,.json"]').setInputFiles({
    name: "draft.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        content: original,
        uploads: [{ path: "main.tsx", base64: "AA==" }],
      }),
    ),
  });
  await expect(page.getByRole("status")).toContainText("媒体格式无效");
  expect(writes).toHaveLength(0);
});
for (const width of [1440, 390])
  test(`editor fits ${width}px and opens above portfolio dialogs`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockGithub(page);
    await enter(page);
    await expect(
      page.getByRole("heading", { name: original.templateProfile.name, exact: true }),
    ).toBeVisible();
    const bounds = await page.locator(".portfolio-editor").boundingBox();
    expect(bounds!.width).toBeLessThanOrEqual(width);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(
      await page
        .locator(".portfolio-editor")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.screenshot({ path: `test-results/editor-${width}.png` });
  });
