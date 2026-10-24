import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";

const original = JSON.parse(fs.readFileSync("public/content.json", "utf8"));
const fixture = {
  ...original,
  accountMedia: {
    image: "./assets/operations/douyin-data-3.jpg",
    alt: "测试账号截图",
    caption: "测试账号",
    videos: Array.from({ length: 5 }, (_, i) => ({
      id: `video-${i}`,
      title: `测试视频 ${i + 1}`,
      src: "./assets/template/intro-loop.mp4",
      poster: `./assets/operations/${["douyin-data-3.jpg", "douyin-data-1.jpg", "douyin-data-2.jpg", "xhs-data-1.jpg", "xhs-data-2.jpg"][i]}`,
    })),
  },
};
async function openAccount(page: Page) {
  await page.goto("/");
  await page.locator(".archive-scroll-track").evaluate(async (el) => {
    const timeline = await import("/components/archive/timeline.ts");
    const content = await import("/components/archive/content.ts");
    el.scrollTop =
      timeline.progressForModule("fragments", content.portfolioWorks.length) *
      (el.scrollHeight - el.clientHeight);
  });
  await page.locator(".archive-desk-fragments").click();
  await expect(page.locator(".archive-account-dialog[open]")).toBeVisible();
}

for (const width of [1440, 390])
  test(`account image, scroll animation and playback at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/content.json", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(fixture),
      }),
    );
    await openAccount(page);
    const image = page.locator(".account-profile>img");
    await expect(image).toHaveJSProperty("naturalWidth", 724);
    const rect = (await image.boundingBox())!;
    expect(rect.width).toBeLessThanOrEqual(320);
    expect(rect.height).toBeLessThanOrEqual(420);
    await expect(
      page.locator(".archive-account-dialog .archive-detail-reason"),
    ).toHaveCount(0);
    const poster = page.locator(".account-video-poster").first();
    await expect(poster).toHaveCSS("opacity", "1");
    const before = await poster.evaluate(
      (el) => getComputedStyle(el).transform,
    );
    await page.locator(".archive-account-dialog").evaluate((el) => {
      el.scrollTop = (el.scrollHeight - el.clientHeight) * 0.7;
    });
    await expect
      .poll(() => poster.evaluate((el) => getComputedStyle(el).transform))
      .not.toBe(before);
    await page.screenshot({ path: `test-results/account-${width}.png` });
    await expect(
      page.getByRole("button", { name: "Close details" }),
    ).toBeInViewport();
    expect(
      await page.evaluate(async () => {
        const { ScrollTrigger } =
          await import("/components/archive/AccountShowcase.tsx");
        return ScrollTrigger.getAll().filter(
          (item) => item.vars.id === "account-video-scroll",
        ).length;
      }),
    ).toBe(1);
    const active = page.locator(".account-video-poster[aria-current=true]");
    await active.click();
    await expect(
      page.locator(".account-video-player[open] video"),
    ).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator(".account-video-player video")
          .evaluate((el: HTMLVideoElement) => el.currentTime),
      )
      .toBeGreaterThan(0);
    await page.getByRole("button", { name: "关闭视频", exact: true }).click();
    await expect(page.locator(".account-video-player[open]")).toHaveCount(0);
    await expect(page.locator(".account-video-player video")).toHaveCount(0);
    await expect(page.locator(".archive-account-dialog[open]")).toBeVisible();
    const arc = (await page.locator(".account-video-arc").boundingBox())!;
    await page.mouse.move(arc.x + arc.width / 2 + 45, arc.y + 100);
    await page.mouse.down();
    await page.mouse.move(arc.x + arc.width / 2 - 80, arc.y + 100, {
      steps: 8,
    });
    await page.mouse.up();
    await expect(page.locator(".account-video-player[open]")).toHaveCount(0);
    expect(
      await page.evaluate(async () => {
        const { ScrollTrigger } =
          await import("/components/archive/AccountShowcase.tsx");
        return ScrollTrigger.getAll().filter(
          (item) => item.vars.id === "account-video-scroll",
        ).length;
      }),
    ).toBe(1);
    await page.getByRole("button", { name: "Close details" }).click();
    expect(
      await page.evaluate(async () => {
        const { ScrollTrigger } =
          await import("/components/archive/AccountShowcase.tsx");
        return ScrollTrigger.getAll().filter(
          (t: any) => t.vars.id === "account-video-scroll",
        ).length;
      }),
    ).toBe(0);
  });

test("reduced motion disables scroll trigger and manual controls still work", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/content.json", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(fixture),
    }),
  );
  await openAccount(page);
  await page.getByRole("button", { name: "下一个视频", exact: true }).click();
  await expect(
    page.locator(".account-video-poster[aria-current=true]"),
  ).toHaveAttribute("aria-label", "播放 测试视频 2");
  await expect(
    page.getByRole("button", { name: "暂停自动滑动", exact: true }),
  ).toBeDisabled();
});

test("owner can add, upload, publish and remove all account videos", async ({
  page,
}) => {
  const writes: Array<{ url: string; body: any }> = [];
  await page.route("https://api.github.com/**", (route) => {
    const request = route.request(),
      url = request.url();
    const reply = (value: unknown) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(value),
      });
    if (request.method() !== "GET") {
      writes.push({ url, body: request.postDataJSON() });
      return reply({ sha: "updated" });
    }
    if (url.endsWith("/user")) return reply({ login: "Jsy1to4winter" });
    if (url.endsWith("/open-archive-portfolio"))
      return reply({ default_branch: "main", permissions: { push: true } });
    if (url.includes("/git/ref/")) return reply({ object: { sha: "base" } });
    if (url.includes("/git/commits/")) return reply({ tree: { sha: "tree" } });
    if (url.includes("/git/trees/"))
      return reply({ tree: [{ path: "public/content.json", sha: "data" }] });
    return reply({
      content: Buffer.from(
        JSON.stringify({
          ...original,
          accountMedia: { ...original.accountMedia, videos: [] },
        }),
      ).toString("base64"),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "编辑作品集", exact: true }).click();
  await page
    .getByLabel("编辑凭证", { exact: true })
    .fill("test-only-not-a-token");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page.getByRole("tab", { name: "账号和视频", exact: true }).click();
  await page.getByRole("button", { name: "添加视频作品", exact: true }).click();
  await page
    .locator("#field-accountMedia-image")
    .locator("..")
    .locator("input[type=file]")
    .setInputFiles("public/assets/operations/douyin-data-3.jpg");
  await expect(page.locator("#field-accountMedia-image")).toHaveValue(
    /uploads/,
  );
  await page
    .locator("#field-accountMedia-videos-0-src")
    .locator("..")
    .locator("input[type=file]")
    .setInputFiles("public/assets/template/intro-loop.mp4");
  await expect(page.locator("#field-accountMedia-videos-0-src")).toHaveValue(
    /\.mp4$/,
    { timeout: 15000 },
  );
  await expect(page.locator("#field-accountMedia-videos-0-poster")).toHaveValue(
    /\.jpg$/,
  );
  await page.getByRole("button", { name: "保存发布", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("已保存到 GitHub");
  const jsonBlob = writes
    .filter((item) => item.url.endsWith("/git/blobs"))
    .at(-1)!;
  const saved = JSON.parse(
    Buffer.from(jsonBlob.body.content, "base64").toString("utf8"),
  );
  expect(saved.accountMedia.videos).toHaveLength(1);
  expect(saved.accountMedia.videos[0].src).toContain("uploads");
  expect(JSON.stringify(saved)).not.toContain("blob:");
  expect(saved.portfolioWorks).toEqual(original.portfolioWorks);
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await page.locator(".archive-scroll-track").evaluate(async (el) => {
    const timeline = await import("/components/archive/timeline.ts");
    const content = await import("/components/archive/content.ts");
    el.scrollTop =
      timeline.progressForModule("fragments", content.portfolioWorks.length) *
      (el.scrollHeight - el.clientHeight);
  });
  await page
    .locator(".archive-desk-fragments .archive-desk-card-arrow")
    .click();
  await page.locator(".account-video-poster").click();
  await expect(page.locator(".account-video-player[open] video")).toBeVisible();
  await expect(page.locator(".portfolio-editor[open]")).toHaveCount(0);
  await page.getByRole("button", { name: "关闭视频", exact: true }).click();
  await page
    .locator(".archive-account-dialog")
    .getByRole("button", { name: "编辑作品集", exact: true })
    .click();
  await page.getByRole("button", { name: "删除", exact: true }).click();
  await expect(page.locator("#field-accountMedia-videos-0-src")).toHaveCount(0);
});
