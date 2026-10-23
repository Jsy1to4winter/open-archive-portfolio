import * as defaults from "./default-content";
import { defaultScreenText } from "./screen-text";
export type { Reason, PortfolioWork } from "./default-content";

export const defaultContent = {
  screenText: defaultScreenText,
  templateProfile: defaults.templateProfile,
  contactEmail: defaults.contactEmail,
  contactPhone: defaults.contactPhone,
  introMedia: defaults.introMedia,
  reasons: defaults.reasons,
  portfolioWorks: defaults.portfolioWorks,
  workCategories: defaults.workCategories,
  templateResume: defaults.templateResume,
};
export type SiteContent = typeof defaultContent;
export function normalizeContent(value: unknown): SiteContent {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("内容格式不完整。");
  const source = value as Record<string, unknown>;
  const result = {
    ...source,
    screenText:
      source.screenText === undefined
        ? structuredClone(defaultScreenText)
        : source.screenText,
  };
  validateContent(result);
  return result;
}
function shape(value: unknown, example: unknown): boolean {
  if (example === null) return value === null || typeof value === "string";
  if (Array.isArray(example))
    return (
      Array.isArray(value) && value.every((item) => shape(item, example[0]))
    );
  if (typeof example === "object")
    return (
      !!value &&
      typeof value === "object" &&
      Object.entries(example).every(([key, entry]) =>
        ["author", "source"].includes(key)
          ? (value as Record<string, unknown>)[key] === undefined ||
            typeof (value as Record<string, unknown>)[key] === "string"
          : ["src", "poster"].includes(key)
            ? (value as Record<string, unknown>)[key] === null ||
              typeof (value as Record<string, unknown>)[key] === "string"
            : shape((value as Record<string, unknown>)[key], entry),
      )
    );
  return typeof value === typeof example;
}
export function validateContent(value: unknown): asserts value is SiteContent {
  if (!shape(value, defaultContent))
    throw new Error("内容格式不完整，请检查所有栏目。");
  const data = value as SiteContent;
  if (
    !data.portfolioWorks.length ||
    !data.reasons.length ||
    !data.workCategories.length
  )
    throw new Error("请至少保留一件作品、一个文字条目和一个分类。");
  if (
    data.portfolioWorks.some(
      (work) =>
        !Number.isFinite(work.width) ||
        !Number.isFinite(work.height) ||
        work.width <= 0 ||
        work.height <= 0,
    )
  )
    throw new Error("作品图片尺寸必须大于零。");
  if (
    new Set(data.portfolioWorks.map((work) => work.id)).size !==
    data.portfolioWorks.length
  )
    throw new Error("作品编号不能重复。");
  const urls = [
    data.templateProfile.website,
    ...data.reasons.map((item) => item.source),
    ...data.portfolioWorks.flatMap((item) => [item.image, item.thumbnail]),
    data.introMedia.src,
    data.introMedia.poster,
  ];
  for (const url of urls)
    if (
      url &&
      !["https:", "http:", "blob:"].includes(
        new URL(url, location.href).protocol,
      )
    )
      throw new Error("链接必须使用 http 或 https 地址。");
}
let loaded = defaultContent;
try {
  const response = await fetch(`${import.meta.env.BASE_URL}content.json`, {
    cache: "no-cache",
  });
  if (
    response.ok &&
    response.headers.get("content-type")?.includes("application/json")
  ) {
    loaded = normalizeContent(await response.json());
  }
} catch (error) {
  console.warn("Using bundled portfolio content.", error);
}
export let templateProfile = loaded.templateProfile;
export let screenText = loaded.screenText;
export let contactEmail = loaded.contactEmail;
export let contactPhone = loaded.contactPhone;
export let otherPortfolioUrl = loaded.templateProfile.website;
export let introMedia = loaded.introMedia;
export let reasons = loaded.reasons;
export let portfolioWorks = loaded.portfolioWorks;
export let workCategories = loaded.workCategories;
export let templateResume = loaded.templateResume;
export function currentContent(): SiteContent {
  return structuredClone({
    screenText,
    templateProfile,
    contactEmail,
    contactPhone,
    introMedia,
    reasons,
    portfolioWorks,
    workCategories,
    templateResume,
  });
}
export function applyContent(data: SiteContent) {
  validateContent(data);
  ({
    screenText,
    templateProfile,
    contactEmail,
    contactPhone,
    introMedia,
    reasons,
    portfolioWorks,
    workCategories,
    templateResume,
  } = structuredClone(data));
  otherPortfolioUrl = templateProfile.website;
  window.dispatchEvent(new Event("portfolio-content-change"));
}
