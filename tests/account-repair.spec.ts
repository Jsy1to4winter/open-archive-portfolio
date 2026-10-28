import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";

const original = JSON.parse(fs.readFileSync("public/content.json", "utf8"));
function localContent() {
  const data = structuredClone(original);
  const local = (url: string) =>
    url.replace(/^\/open-archive-portfolio\//, "/");
  data.accountMedia.image = local(data.accountMedia.image);
  data.accountMedia.videos = ['0c55efa3-231c-45b7-9820-f2c7266a3ea9', 'd194aca2-8ead-414b-b9cc-5f960bbf4c44'].map((id, i) => ({ id, title: `修复视频 ${i + 1}`, src: `/assets/uploads/${id}-h264.mp4`, poster: `/assets/uploads/${id}-poster.jpg` }));
  data.stickers = [];
  return data;
}
async function enterModule(page: Page, id: string) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const progress = await page
    .locator(".archive-scroll-track")
    .evaluate(async (el, moduleId) => {
      const timeline = await import("/components/archive/timeline.ts");
      const data = await import("/components/archive/content.ts");
      const progress = timeline.progressForModule(
        moduleId as any,
        data.portfolioWorks.length,
      );
      el.scrollTop = progress * (el.scrollHeight - el.clientHeight);
      return progress;
    }, id);
  await page.waitForFunction(
    (progress) =>
      Math.abs(
        Number(
          document
            .querySelector(".archive-pinned-stage")
            ?.getAttribute("data-progress"),
        ) - progress,
      ) < 0.002,
    progress,
  );
  await page
    .locator(
      id === "about"
        ? ".archive-desk-about-main"
        : ".archive-desk-" + id + " .archive-desk-card-arrow",
    )
    .click();
}
async function loginEditor(page: Page) {
  await page.route("https://api.github.com/**", (route) => {
    const url = route.request().url();
    const reply = (data: unknown) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    if (url.endsWith("/user")) return reply({ login: "Jsy1to4winter" });
    if (url.endsWith("/open-archive-portfolio"))
      return reply({ default_branch: "main", permissions: { push: true } });
    if (url.includes("/git/ref/")) return reply({ object: { sha: "head" } });
    if (url.includes("/git/commits/")) return reply({ tree: { sha: "tree" } });
    if (url.includes("/git/trees/"))
      return reply({ tree: [{ path: "public/content.json", sha: "data" }] });
    return reply({
      content: Buffer.from(JSON.stringify(original)).toString("base64"),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "编辑作品集", exact: true }).click();
  await page
    .getByLabel("编辑凭证", { exact: true })
    .fill("test-only-not-a-token");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page.getByRole("tab", { name: original.screenText.fragments.title, exact: true }).click();
}

for (const width of [1440, 390])
  test(`both uploaded videos actually play at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/content.json", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(localContent()),
      }),
    );
    await page.goto("/");
    await enterModule(page, "fragments");
    for (let i = 0; i < 2; i++) {
      if (i)
        await page
          .getByRole("button", { name: "下一个视频", exact: true })
          .click();
      await page.locator(".account-video-poster").nth(i).click();
      const video = page.locator(".account-video-player[open] video");
      await expect(video).toBeVisible();
      await expect
        .poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime))
        .toBeGreaterThan(0.1);
      await expect(video).toHaveJSProperty("videoWidth", 1056);
      expect(
        await video.evaluate((el: HTMLVideoElement) => el.error),
      ).toBeNull();
      await page.screenshot({
        path: `test-results/repaired-video-${width}-${i}.png`,
      });
      await page.getByRole("button", { name: "关闭视频", exact: true }).click();
    }
  });

test("video limit is ten in editor and validation", async ({ page }) => {
  await loginEditor(page);
  const add = page.getByRole("button", { name: "添加视频作品", exact: true });
  for (let count = original.accountMedia.videos.length; count < 10; count++)
    await add.click();
  await expect(add).toBeDisabled();
  await expect(page.locator(".editor-video-count")).toHaveText("10 / 10");
  await page.getByRole("button", { name: "删除", exact: true }).last().click();
  await expect(add).toBeEnabled();
  const tooMany = {
    ...original,
    accountMedia: {
      ...original.accountMedia,
      videos: Array.from({ length: 11 }, (_, i) => ({
        ...original.accountMedia.videos[0],
        id: `video-${i}`,
      })),
    },
  };
  await page.locator('input[accept="application/json,.json"]').setInputFiles({
    name: "too-many.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ content: tooMany, uploads: [] })),
  });
  await expect(page.getByRole("status")).toContainText("最多可以放 10 个");
  await expect(page.locator(".editor-video-count")).toHaveText("9 / 10");
});

test("HEVC upload converts locally without blanking the editor", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await loginEditor(page);
  const src = page.locator('.editor-video-upload video').first();
  const before = await src.getAttribute('src');
  await page.locator('.editor-video-upload input[type=file]').first()
    .setInputFiles(
      "public/assets/uploads/0c55efa3-231c-45b7-9820-f2c7266a3ea9.mp4",
    );
  await expect(page.getByRole("status")).toContainText(
    /正在加载视频转换器|正在转换/,
  );
  await expect(page.getByRole("heading", { name: original.screenText.fragments.title, exact: true })).toBeVisible();
  await expect(src).toBeVisible();
  await page.screenshot({ path: "test-results/video-upload-progress.png" });
  await expect(page.getByRole("status")).toContainText("文件已加入草稿", {
    timeout: 100000,
  });
  await expect(src).not.toHaveAttribute('src', before!);
  await expect(page.locator(".portfolio-editor[open]")).toBeVisible();
  expect(errors).toEqual([]);
  await expect(src).toHaveAttribute('poster', /^blob:/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await enterModule(page, "fragments");
  await page.locator(".account-video-poster").first().click();
  const converted = page.locator(".account-video-player[open] video");
  await expect
    .poll(() => converted.evaluate((el: HTMLVideoElement) => el.currentTime))
    .toBeGreaterThan(0.1);
  await expect(converted).toHaveJSProperty("videoWidth", 1056);
  expect(
    await converted.evaluate((el: HTMLVideoElement) => el.error),
  ).toBeNull();
});

test("invalid video leaves the editor and existing draft intact", async ({
  page,
}) => {
  await loginEditor(page);
  const src = page.locator('.editor-video-upload video').first();
  const before = await src.getAttribute('src');
  await page.locator('.editor-video-upload input[type=file]').first()
    .setInputFiles({
      name: "broken.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.from("not a video"),
    });
  await expect(page.getByRole("status")).toContainText(/无法读取|未能读取/, {
    timeout: 15000,
  });
  await expect(src).toHaveAttribute('src', before!);
  await expect(page.getByRole("heading", { name: original.screenText.fragments.title, exact: true })).toBeVisible();
});

test("perspective retains all six operations sections", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const id of ["perspective"]) {
    await enterModule(page, id);
    const dialog = page.locator(".archive-archive-dialog[open]");
    await expect(dialog.locator(".archive-detail-reason")).toHaveCount(6);
    expect(
      await dialog.locator(".archive-detail-reason h3").allTextContents(),
    ).toEqual(original.reasons.map((item: any) => item.title));
    expect(
      await dialog.locator(".archive-detail-reason p").allTextContents(),
    ).toEqual(original.reasons.map((item: any) => item.body));
    await page.getByRole("button", { name: "Close details" }).click();
  }
});

for (const width of [1440, 390])
  test(`ten videos retain arc layout and scroll animation at ${width}px`, async ({
    page,
  }) => {
    const content = localContent();
    content.accountMedia.videos = Array.from({ length: 10 }, (_, i) => ({
      ...content.accountMedia.videos[i % 2],
      id: `clip-${i}`,
      title: `作品 ${i + 1}`,
    }));
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/content.json", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(content),
      }),
    );
    await page.goto("/");
    await enterModule(page, "fragments");
    await expect(page.locator(".account-video-poster")).toHaveCount(10);
    const first = page.locator(".account-video-poster").first();
    await expect(first).toHaveCSS("opacity", "1");
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const { ScrollTrigger } =
            await import("/components/archive/AccountShowcase.tsx");
          const trigger = ScrollTrigger.getById("account-video-scroll");
          return !!trigger && trigger.end > trigger.start;
        }),
      )
      .toBe(true);
    await page.locator(".archive-account-dialog").evaluate((el) => {
      el.scrollTop = el.scrollHeight - el.clientHeight - 4;
    });
    await expect(page.locator(".account-video-header>span")).toHaveText(
      "10 / 10",
    );
    await expect(
      page.locator(".account-video-poster[aria-current=true]"),
    ).toHaveAttribute("aria-label", "播放 作品 10");
    expect(
      await page
        .locator(".archive-account-dialog")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.screenshot({ path: `test-results/ten-videos-${width}.png` });
  });
