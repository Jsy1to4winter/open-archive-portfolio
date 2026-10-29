import * as defaults from "./default-content";
import { splitModuleCopy } from './module-copy';
import { defaultStickers } from './stickers';
import { defaultScreenText } from "./screen-text";
import { defaultAccountMedia, MAX_ACCOUNT_VIDEOS } from "./account-media";
import { defaultAccountVideoGroups, normalizeAccountVideoGroups, MAX_VIDEO_GROUPS, VIDEOS_PER_GROUP, MAX_GROUPED_VIDEOS } from './account-video-groups';
export type { Reason, PortfolioWork } from "./default-content";

export const defaultContent = {
  titleSizes: { about: 76, fragments: 72, craft: 37, perspective: 39, gallery: 34, collaboration: 26 },
  moduleCopy: splitModuleCopy(defaults.reasons),
  aboutPhotos: [] as Array<{ id: string; title: string; image: string; caption: string }>,
  stickers: defaultStickers,
  accountMedia: defaultAccountMedia,
  accountVideoGroups: defaultAccountVideoGroups,
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
  const profile = source.templateProfile as Record<string, unknown>;
  const result = {
    ...source,
    titleSizes: source.titleSizes === undefined ? structuredClone(defaultContent.titleSizes) : source.titleSizes,
    moduleCopy: source.moduleCopy === undefined ? splitModuleCopy(Array.isArray(source.reasons) ? source.reasons : defaults.reasons) : source.moduleCopy,
    templateProfile: { image: '', slipIntroduction: '', ...profile },
    aboutPhotos: source.aboutPhotos === undefined ? [] : source.aboutPhotos,
    stickers: source.stickers === undefined ? structuredClone(defaultStickers) : Array.isArray(source.stickers) ? source.stickers.map((item, index) => ({ x: (index % 3) / 2, y: Math.min(0.8, Math.floor(index / 3) * 0.25), ...item })) : source.stickers,
    accountMedia:
      source.accountMedia === undefined
        ? structuredClone(defaultAccountMedia)
        : source.accountMedia,
    accountVideoGroups: normalizeAccountVideoGroups(source.accountVideoGroups),
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
      Array.isArray(value) &&
      (example.length === 0 || value.every((item) => shape(item, example[0])))
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
  if (!Object.values(data.titleSizes).every(size => Number.isFinite(size) && size >= 12 && size <= 120))
    throw new Error('首页标题字号须在 12 至 120 像素之间。');
  if (!data.aboutPhotos.every(item => item && ['id', 'title', 'image', 'caption'].every(key => typeof (item as Record<string, unknown>)[key] === 'string') && item.id && item.image.trim()) || new Set(data.aboutPhotos.map(item => item.id)).size !== data.aboutPhotos.length)
    throw new Error('请为每张关于我图片上传文件，并保留唯一编号。');
  if (!data.stickers.every(item => Number.isFinite(item.x) && Number.isFinite(item.y) && item.x >= 0 && item.x <= 1 && item.y >= 0 && item.y <= 1))
    throw new Error('贴纸位置无效。');
  if (!data.stickers.every(item => item && typeof item.id === 'string' && item.id && typeof item.name === 'string' && typeof item.image === 'string' && Number.isFinite(item.width) && item.width >= 64 && item.width <= 600) || new Set(data.stickers.map(item => item.id)).size !== data.stickers.length)
    throw new Error('贴纸名称、图片或尺寸无效，宽度须在 64 至 600 像素之间。');
  if (data.accountMedia.videos.length > MAX_ACCOUNT_VIDEOS)
    throw new Error(`视频作品最多可以放 ${MAX_ACCOUNT_VIDEOS} 个。`);
  const groups = data.accountVideoGroups;
  if (groups.length !== MAX_VIDEO_GROUPS || new Set(groups.map(group => group.id)).size !== groups.length || groups.some(group => !group.id || !group.title.trim() || group.videos.length > VIDEOS_PER_GROUP))
    throw new Error(`账号展示须保留 ${MAX_VIDEO_GROUPS} 个赛道并填写名称，每个赛道最多 ${VIDEOS_PER_GROUP} 个视频。`);
  const groupedVideos = groups.flatMap(group => group.videos);
  if (groupedVideos.length > MAX_GROUPED_VIDEOS || !groupedVideos.every(video => video && ['id', 'title', 'src', 'poster'].every(key => typeof (video as Record<string, unknown>)[key] === 'string') && video.id && video.src.trim()) || new Set(groupedVideos.map(video => video.id)).size !== groupedVideos.length)
    throw new Error(`请为每个赛道视频上传文件，并保留唯一编号，总计最多 ${MAX_GROUPED_VIDEOS} 个。`);
  if (
    !data.accountMedia.videos.every(
      (video) =>
        video &&
        typeof video === "object" &&
        ["id", "title", "src", "poster"].every(
          (key) => typeof (video as Record<string, unknown>)[key] === "string",
        ) &&
        video.id &&
        video.src.trim(),
    )
  )
    throw new Error("请为每个视频上传文件或填写视频地址。");
  if (
    new Set(data.accountMedia.videos.map((video) => video.id)).size !==
    data.accountMedia.videos.length
  )
    throw new Error("视频编号不能重复。");
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
    data.templateProfile.image,
    ...Object.values(data.moduleCopy).flatMap(items => items.map(item => item.source)),
    ...data.aboutPhotos.map(item => item.image),
    ...data.stickers.map(item => item.image),
    data.accountMedia.image,
    ...data.accountMedia.videos.flatMap((video) => [video.src, video.poster]),
    ...groupedVideos.flatMap(video => [video.src, video.poster]),
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
  const fresh = import.meta.env.PROD ? `?v=${Date.now()}` : '';
  const response = await fetch(`${import.meta.env.BASE_URL}content.json${fresh}`, {
    cache: "no-store",
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
export let titleSizes = loaded.titleSizes;
export let moduleCopy = loaded.moduleCopy;
export let aboutPhotos = loaded.aboutPhotos;
export let stickers = loaded.stickers;
export let accountMedia = loaded.accountMedia;
export let accountVideoGroups = loaded.accountVideoGroups;
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
    titleSizes,
    moduleCopy,
    aboutPhotos,
    stickers,
    accountMedia,
    accountVideoGroups,
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
    titleSizes,
    moduleCopy,
    aboutPhotos,
    stickers,
    accountMedia,
    accountVideoGroups,
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
