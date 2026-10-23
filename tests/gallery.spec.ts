import { test, expect } from "@playwright/test";
import fs from "node:fs";

const content = JSON.parse(fs.readFileSync("public/content.json", "utf8"));
for (const width of [1440, 390])
  test(`operations gallery and highest-view cover at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator(".archive-gallery-slide")).toHaveCount(5);
    expect(content.portfolioWorks[0].id).toBe("douyin-1042k");
    const seek = async (progress: number) => {
      await page
        .locator(".archive-scroll-track")
        .evaluate(async (el, value) => {
          const timeline = await import("/components/archive/timeline.ts");
          const data = await import("/components/archive/content.ts");
          const target =
            value < 0
              ? 1
              : timeline.progressForGalleryProgress(
                  value,
                  data.portfolioWorks.length,
                );
          el.scrollTop = target * (el.scrollHeight - el.clientHeight);
        }, progress);
    };
    await seek(0);
    await expect(page.locator(".archive-gallery-content")).toHaveAttribute(
      "aria-hidden",
      "false",
    );
    await expect(page.locator(".archive-gallery-counter")).toHaveText(
      "01 / 05",
    );
    const first = page.locator(".archive-gallery-slide").first().locator("img");
    await expect(first).toHaveAttribute(
      "src",
      "./assets/operations/douyin-data-3.jpg",
    );
    await expect(first).toHaveJSProperty("naturalWidth", 724);
    await page.screenshot({ path: `test-results/operations-${width}.png` });
    for (let i = 1; i < 5; i++) {
      await page.locator(".archive-gallery-next").click();
      await expect(page.locator(".archive-gallery-counter")).toHaveText(
        `0${i + 1} / 05`,
      );
      await expect(
        page.locator(".archive-gallery-slide").nth(i).locator("img"),
      ).toHaveJSProperty("naturalWidth", content.portfolioWorks[i].width);
    }
    await expect(page.locator(".archive-gallery-next")).toBeDisabled();
    await page
      .locator(".archive-gallery-slide")
      .last()
      .locator("button")
      .click();
    await expect(
      page.locator(".archive-archive-dialog[open] .archive-lightbox img"),
    ).toHaveAttribute("src", "./assets/operations/xhs-data-2.jpg");
    await page.getByRole("button", { name: "Close details" }).click();
    await seek(-1);
    await expect(page.locator(".archive-gallery-counter")).toHaveText(
      "01 / 05",
    );
    await expect(
      page.locator(".archive-gallery-slide").first().locator("img"),
    ).toHaveAttribute("src", "./assets/operations/douyin-data-3.jpg");
  });
