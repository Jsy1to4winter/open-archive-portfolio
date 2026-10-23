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
        content: Buffer.from(JSON.stringify(original)).toString("base64"),
      });
    return reply({}, 404);
  });
  return writes;
}
async function enter(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "编辑作品集", exact: true }).click();
  await page
    .getByLabel("编辑凭证", { exact: true })
    .fill("test-only-not-a-real-token");
  await page.getByRole("button", { name: "登录", exact: true }).click();
}

test("visitor is rejected and never writes", async ({ page }) => {
  const writes = await mockGithub(page, { owner: false });
  await enter(page);
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
  await page.getByLabel("品牌名称", { exact: true }).fill("我的工作室");
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await expect(page.locator(".archive-intro-brand-name")).toHaveText(
    "我的工作室",
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
  expect(data.templateProfile.brand).toBe("我的工作室");
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
  await page.getByRole("tab", { name: "作品", exact: true }).click();
  const image = await page.screenshot();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({ name: "art.png", mimeType: "image/png", buffer: image });
  await expect(
    page.getByLabel("作品图片", { exact: true }).first(),
  ).toHaveValue(/assets\/uploads\/.+\.png$/);
  await expect(
    page.getByLabel("图片宽度", { exact: true }).first(),
  ).toHaveValue("1280");
  await page.getByRole("button", { name: "保存发布", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("已保存到 GitHub");
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
    .getByLabel("网站链接", { exact: true })
    .fill("javascript:alert(1)");
  await page.getByRole("button", { name: "保存发布", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("链接必须");
  expect(writes).toHaveLength(0);
  await page.getByRole("button", { name: "取消修改", exact: true }).click();
  await expect(page.getByLabel("网站链接", { exact: true })).toHaveValue(
    original.templateProfile.website,
  );
});
test("page text can be selected directly after owner preview", async ({
  page,
}) => {
  await mockGithub(page);
  await enter(page);
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await page.locator(".archive-intro-brand-name").click();
  await expect(page.getByLabel("品牌名称", { exact: true })).toBeFocused();
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
          templateProfile: { ...original.templateProfile, brand: "恢复草稿" },
        },
        uploads: [],
      }),
    ),
  });
  await expect(page.getByLabel("品牌名称", { exact: true })).toHaveValue(
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
      page.getByRole("heading", { name: "编辑作品集", exact: true }),
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
