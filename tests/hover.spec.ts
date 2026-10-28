import { test, expect, type Page } from "@playwright/test";
import fs from 'node:fs';

async function openDesk(page: Page, module = "about") {
  const content = JSON.parse(fs.readFileSync('public/content.json', 'utf8'));
  content.stickers = [];
  await page.route('**/content.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(content) }));
  await page.goto("/");
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.locator(".archive-scroll-track").evaluate(async (el, module) => {
    const { progressForModule } = await import("/components/archive/timeline.ts");
    const { portfolioWorks } = await import("/components/archive/content.ts");
    el.scrollTop = progressForModule(module as any, portfolioWorks.length) * (el.scrollHeight - el.clientHeight);
  }, module);
  await expect(page.locator(".archive-desk-layer")).toHaveAttribute("aria-hidden", "false");
  await expect.poll(() => page.locator(".archive-desk-camera").evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThan(100);
  await page.waitForTimeout(700);
}

for (const width of [1440, 1072]) {
  test(`paper cards lift 12 screen pixels and restore at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openDesk(page);
    for (const selector of [".archive-desk-fragments", ".archive-desk-about", ".archive-desk-craft", ".archive-desk-perspective", ".archive-desk-collaboration", ".archive-resume-slip", ".archive-gallery-paper"]) {
      await page.mouse.move(0, 0);
      const card = page.locator(selector);
      const before = (await card.boundingBox())!;
      const transform = await card.evaluate(el => getComputedStyle(el).transform);
      const shadow = await card.evaluate(el => getComputedStyle(el).boxShadow);
      await card.hover();
      await expect.poll(async () => before.y - (await card.boundingBox())!.y).toBeCloseTo(12, 0);
      expect(await card.evaluate(el => getComputedStyle(el).transform)).toBe(transform);
      expect(await card.evaluate(el => getComputedStyle(el).boxShadow)).not.toBe(shadow);
      expect(await card.evaluate(el => getComputedStyle(el).transitionDuration)).toBe("0.2s, 0.2s");
      await page.screenshot({ path: `test-results/hover-${width}-${selector.slice(1)}.png` });
      await page.mouse.move(0, 0);
      await expect.poll(async () => (await card.boundingBox())!.y).toBeCloseTo(before.y, 0);
    }
    await page.locator(".archive-desk-fragments .archive-desk-card-arrow").click();
    await expect(page.locator(".archive-account-dialog[open]")).toBeVisible();
  });
}

test("reduced motion keeps cards still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openDesk(page);
  const card = page.locator(".archive-desk-fragments");
  const before = (await card.boundingBox())!;
  await card.hover();
  await expect(card).toHaveCSS("translate", "none");
  expect((await card.boundingBox())!.y).toBeCloseTo(before.y, 0);
});

test("touch cards remain still and open on the first tap", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await openDesk(page, "fragments");
  const card = page.locator(".archive-desk-fragments");
  await expect(card).toHaveCSS("translate", "none");
  await page.screenshot({ path: "test-results/hover-touch.png" });
  await card.tap();
  await expect(page.locator(".archive-account-dialog[open]")).toBeVisible();
  await context.close();
});
