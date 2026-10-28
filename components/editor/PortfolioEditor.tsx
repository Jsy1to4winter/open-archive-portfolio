import { useEffect, useRef, useState } from "react";
import {
  Pencil,
  X,
  LogOut,
  Upload as UploadIcon,
  Save,
  Eye,
  Plus,
  Trash2,
  Download,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  applyContent,
  currentContent,
  validateContent,
  normalizeContent,
  type SiteContent,
} from "../archive/content";
import {
  OWNER,
  REPO,
  login,
  publish,
  encodeBase64,
  type Upload,
} from "./github";
import "./editor.css";
import { videoPoster } from "./video-poster";
import { MAX_ACCOUNT_VIDEOS } from "../archive/account-media";
import { sections, sectionTitle, sectionForPath, type EditorSection } from './sections';
import { profileBiography } from '../archive/profile-copy';

const labels: Record<string, string> = {
  aboutPhotos: '运营过的账号主页',
  stickers: "贴纸",
  accountMedia: "账号和视频",
  videos: "视频作品",
  screenText: "页面文字",
  about: "01 关于我卡片",
  fragments: "02 灵感卡片",
  craft: "03 创作卡片",
  perspective: "04 观点卡片",
  gallery: "05 作品卡片",
  collaboration: "06 联系卡片",
  intro: "电脑开场",
  profile: "简历纸条",
  titleLine1: "标题第一行",
  titleLine2: "标题第二行",
  description: "说明文字",
  bodyLine1: "正文第一段",
  bodyLine2: "正文第二段",
  subtitle: "副标题",
  minimalTitle: "缩小状态标题",
  compactLine1: "简版说明第一行",
  compactLine2: "简版说明第二行",
  footer: "底部文字",
  status: "右上角文字",
  selectedWork: "屏幕上方文字",
  scrollHint: "滚动提示",
  openButton: "进入按钮文字",
  templateProfile: "个人资料",
  contactEmail: "联系邮箱",
  contactPhone: "联系电话",
  introMedia: "开场视频",
  reasons: "纸条文字",
  portfolioWorks: "作品",
  workCategories: "作品分类",
  templateResume: "履历",
  brand: "品牌名称",
  name: "姓名",
  slipIntroduction: '姓名下方简介',
  role: "身份",
  discipline: "专业标题",
  disciplines: "专业方向",
  pageTitle: "网页标题",
  website: "网站链接",
  location: "所在地",
  introduction: "简短介绍",
  biography: "个人简介",
  src: "视频地址",
  poster: "视频封面",
  id: "编号",
  title: "标题",
  shortTitle: "短标题",
  body: "正文",
  note: "备注",
  tag: "标签",
  author: "作者",
  source: "来源链接",
  category: "分类",
  caption: "作品说明",
  image: "作品图片",
  thumbnail: "缩略图",
  alt: "图片描述",
  width: "图片宽度",
  height: "图片高度",
  label: "名称",
  experience: "工作经历",
  education: "教育经历",
  period: "时间",
  bullets: "经历要点",
  practice: "个人实践",
  tools: "技能与工具",
};
const tabs = sections;
type Path = Array<string | number>;
const clone = <T,>(value: T): T => structuredClone(value);
const get = (data: unknown, path: Path): unknown =>
  path.reduce<unknown>(
    (node, key) => (node as Record<string | number, unknown>)[key],
    data,
  );
function replace(data: SiteContent, path: Path, value: unknown) {
  const next = clone(data);
  const parent = get(next, path.slice(0, -1)) as Record<
    string | number,
    unknown
  >;
  parent[path[path.length - 1]] = value;
  return next;
}

export default function PortfolioEditor() {
  const [open, setOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const token = useRef("");
  const [auth, setAuth] = useState<Awaited<ReturnType<typeof login>> | null>(
    null,
  );
  const [draft, setDraft] = useState(currentContent);
  const [baseline, setBaseline] = useState(currentContent);
  const [tab, setTab] = useState<EditorSection>('about');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const urls = useRef(new Map<string, string>());
  const dialog = useRef<HTMLDialogElement>(null);
  const [closeAction, setCloseAction] = useState("");
  const focusPath = useRef<Path | null>(null);
  const backupInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!auth || busy) return;
    const move = (event: Event) => {
      const { id, x, y } = (event as CustomEvent).detail;
      if (typeof id !== 'string' || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) return;
      setDraft(previous => ({ ...previous, stickers: previous.stickers.map(item => item.id === id ? { ...item, x, y } : item) }));
      setDirty(true);
      setMessage('贴纸位置已加入草稿，保存发布后访客可见。');
    };
    window.addEventListener('portfolio-sticker-move', move);
    return () => window.removeEventListener('portfolio-sticker-move', move);
  }, [auth, busy]);
  useEffect(() => {
    const show = (event: Event) => {
      const section = (event as CustomEvent).detail?.section ?? document.querySelector<HTMLElement>('.archive-archive-dialog[open]')?.dataset.editorSection;
      if (sections.includes(section)) setTab(section);
      focusPath.current = null;
      setOpen(true);
    };
    window.addEventListener("portfolio-open-editor", show);
    return () => window.removeEventListener("portfolio-open-editor", show);
  }, []);

  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
    if (open && focusPath.current) {
      const path = focusPath.current;
      const frame = requestAnimationFrame(() => {
        const input = document.getElementById(`field-${path.join("-")}`);
        input?.scrollIntoView({ block: "center" });
        input?.focus({ preventScroll: true });
        focusPath.current = null;
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [open]);
  useEffect(() => {
    if (!auth || open) return;
    document.documentElement.classList.add("portfolio-owner-editing");
    const fields: Array<{ text: string; path: Path }> = [];
    function collect(value: unknown, path: Path) {
      if (
        typeof value === "string" &&
        sectionForPath(path) &&
        value.trim() &&
        !["id", "image", "thumbnail", "src", "poster"].includes(
          String(path.at(-1)),
        )
      )
        fields.push({ text: value.trim().replace(/\s+/g, " "), path });
      else if (value && typeof value === "object")
        for (const [key, child] of Object.entries(value))
          collect(child, [...path, Array.isArray(value) ? Number(key) : key]);
    }
    collect(draft, []);
    function match(target: EventTarget | null): Path | null {
      if (
        !(target instanceof Element) ||
        target.closest(
          ".portfolio-editor,.portfolio-edit-trigger,.account-video-poster,.account-video-controls,.account-video-player,.homepage-sticker,.archive-reason-interactive,.about-photo-gallery,.archive-name-slip",
        )
      )
        return null;
      const annotated = target
        .closest("[data-edit-path]")
        ?.getAttribute("data-edit-path");
      if (annotated) {
        const path = annotated.split(".");
        if (typeof get(draft, path) === "string") return path;
      }
      if (target instanceof HTMLImageElement) {
        const index = draft.portfolioWorks.findIndex((work) =>
          [work.image, work.thumbnail].some(
            (url) =>
              new URL(urls.current.get(url) ?? url, location.href).href ===
              target.src,
          ),
        );
        if (index >= 0) return ["portfolioWorks", index, "image"];
      }
      let element: Element | null = target;
      for (let i = 0; element && i < 3; i++, element = element.parentElement) {
        const text = element.textContent?.trim().replace(/\s+/g, " ");
        const found = fields.find((field) => field.text === text);
        if (found) return found.path;
      }
      return null;
    }
    let highlighted: Element | null = null;
    const hover = (e: MouseEvent) => {
      highlighted?.classList.remove("portfolio-inline-target");
      highlighted = match(e.target) ? (e.target as Element) : null;
      highlighted?.classList.add("portfolio-inline-target");
    };
    const select = (e: MouseEvent) => {
      const path = match(e.target);
      if (!path) return;
      const section = sectionForPath(path);
      if (!section) return;
      e.preventDefault();
      e.stopPropagation();
      focusPath.current = path;
      setTab(section);
      setOpen(true);
    };
    document.addEventListener("mouseover", hover, true);
    document.addEventListener("click", select, true);
    return () => {
      document.documentElement.classList.remove("portfolio-owner-editing");
      highlighted?.classList.remove("portfolio-inline-target");
      document.removeEventListener("mouseover", hover, true);
      document.removeEventListener("click", select, true);
    };
  }, [auth, open, draft]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(
    () => () => {
      for (const url of urls.current.values()) URL.revokeObjectURL(url);
    },
    [],
  );
  function update(path: Path, value: unknown) {
    setDraft((previous) => replace(previous, path, value));
    setDirty(true);
    setMessage("");
  }
  async function authenticate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const value = tokenInput.trim();
      const session = await login(value);
      const content = normalizeContent(session.content ?? currentContent());
      token.current = value;
      setTokenInput("");
      setAuth(session);
      setDraft(clone(content));
      setBaseline(clone(content));
      setDirty(false);
      setUploads([]);
      applyContent(content);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function visibleContent(content: SiteContent) {
    const data = clone(content);
    data.templateProfile.image = urls.current.get(data.templateProfile.image) ?? data.templateProfile.image;
    data.aboutPhotos.forEach(item => { item.image = urls.current.get(item.image) ?? item.image; });
    data.stickers.forEach(item => { item.image = urls.current.get(item.image) ?? item.image; });
    data.accountMedia.image =
      urls.current.get(data.accountMedia.image) ?? data.accountMedia.image;
    for (const item of data.accountMedia.videos) {
      item.src = urls.current.get(item.src) ?? item.src;
      item.poster = urls.current.get(item.poster) ?? item.poster;
    }
    for (const work of data.portfolioWorks) {
      work.image = urls.current.get(work.image) ?? work.image;
      work.thumbnail = urls.current.get(work.thumbnail) ?? work.thumbnail;
    }
    data.introMedia.src =
      urls.current.get(data.introMedia.src ?? "") ?? data.introMedia.src;
    data.introMedia.poster =
      urls.current.get(data.introMedia.poster ?? "") ?? data.introMedia.poster;
    return data;
  }
  function preview() {
    try {
      validateContent(draft);
      applyContent(visibleContent(draft));
      setOpen(false);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }
  async function save() {
    if (!auth) return;
    setBusy(true);
    setMessage("");
    try {
      validateContent(draft);
      const next = await publish(token.current, auth, draft, uploads);
      setAuth(next);
      setBaseline(clone(draft));
      applyContent(visibleContent(draft));
      setUploads([]);
      setDirty(false);
      setMessage("已保存到 GitHub。网站部署完成后，所有访客会看到更新。");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function logout() {
    token.current = "";
    setAuth(null);
    setTokenInput("");
    setDraft(clone(baseline));
    setUploads([]);
    setDirty(false);
    applyContent(visibleContent(baseline));
    setMessage("");
    setCloseAction("");
  }
  function discard() {
    setDraft(clone(baseline));
    setUploads([]);
    setDirty(false);
    applyContent(visibleContent(baseline));
    setCloseAction("");
    setMessage("已取消未发布的修改。");
  }
  function backup() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ content: draft, uploads }, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "portfolio-draft.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function restore(file: File) {
    setBusy(true);
    setMessage("");
    try {
      if (file.size > 80 * 1024 * 1024) throw new Error("备份文件过大。");
      const value = JSON.parse(await file.text());
      value.content = normalizeContent(value.content);
      if (
        !Array.isArray(value.uploads) ||
        !value.uploads.every(
          (entry: Upload) =>
            typeof entry.path === "string" &&
            /^public\/assets\/uploads\/[a-f0-9-]+\.(jpg|png|webp|gif|avif|mp4|webm)$/.test(
              entry.path,
            ) &&
            typeof entry.base64 === "string" &&
            /^[A-Za-z0-9+/]*={0,2}$/.test(entry.base64),
        )
      )
        throw new Error("备份中的媒体格式无效。");
      for (const entry of value.uploads as Upload[]) {
        const type = entry.path.endsWith(".mp4")
          ? "video/mp4"
          : entry.path.endsWith(".webm")
            ? "video/webm"
            : entry.path.endsWith(".jpg")
              ? "image/jpeg"
              : `image/${entry.path.split(".").pop()}`;
        const bytes = Uint8Array.from(atob(entry.base64), (c) =>
          c.charCodeAt(0),
        );
        const address = `${import.meta.env.BASE_URL}${entry.path.slice("public/".length)}`;
        urls.current.set(
          address,
          URL.createObjectURL(new Blob([bytes], { type })),
        );
      }
      setDraft(clone(value.content));
      setUploads(value.uploads);
      setDirty(true);
      setMessage("草稿已恢复，尚未发布。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "无法读取备份。");
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File, path: Path) {
    setBusy(true);
    setMessage("正在检查并读取文件…");
    let temporaryAddress: string | undefined;
    try {
      const video = path.at(-1) === "src";
      const allowed = video
        ? ["video/mp4", "video/webm"]
        : ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
      if (!allowed.includes(file.type))
        throw new Error(
          video
            ? "请选择 MP4 或 WebM 视频。"
            : "请选择 JPG、PNG、WebP、GIF 或 AVIF 图片。",
        );
      if (file.size > (video ? 20 : 8) * 1024 * 1024)
        throw new Error(
          video ? "视频请控制在 20 MB 以内。" : "图片请控制在 8 MB 以内。",
        );
      const ext = (
        {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
          "image/gif": "gif",
          "image/avif": "avif",
          "video/mp4": "mp4",
          "video/webm": "webm",
        } as Record<string, string>
      )[file.type];
      const relative = `assets/uploads/${crypto.randomUUID()}.${ext}`;
      const address = `${import.meta.env.BASE_URL}${relative}`;
      let objectUrl = URL.createObjectURL(file);
      urls.current.set(address, objectUrl);
      temporaryAddress = address;
      let dimensions: { width: number; height: number } | null = null;
      if (!video) {
        const image = new Image();
        image.src = objectUrl;
        await image.decode();
        dimensions = { width: image.naturalWidth, height: image.naturalHeight };
      }
      let bytes = new Uint8Array(await file.arrayBuffer());
      let generatedPoster: { address: string; upload: Upload } | null = null;
      if (video && path[0] === "accountMedia") {
        let poster: Blob | null;
        try {
          poster = await videoPoster(
            objectUrl,
            file.type === "video/mp4"
              ? (bytes.buffer as ArrayBuffer)
              : undefined,
          );
        } catch (error) {
          if (
            file.type !== "video/mp4" ||
            !(error instanceof Error) ||
            !error.message.includes("HEVC/H.265")
          )
            throw error;
          const { convertVideo } = await import("./convert-video");
          file = await convertVideo(file, setMessage);
          if (file.size > 20 * 1024 * 1024)
            throw new Error("转换后视频超过 20 MB，请压缩或缩短后重试。");
          URL.revokeObjectURL(objectUrl);
          objectUrl = URL.createObjectURL(file);
          urls.current.set(address, objectUrl);
          bytes = new Uint8Array(await file.arrayBuffer());
          poster = await videoPoster(objectUrl, bytes.buffer as ArrayBuffer);
        }
        if (poster) {
          const relativePoster = `assets/uploads/${crypto.randomUUID()}.jpg`;
          const posterAddress = `${import.meta.env.BASE_URL}${relativePoster}`;
          urls.current.set(posterAddress, URL.createObjectURL(poster));
          generatedPoster = {
            address: posterAddress,
            upload: {
              path: `public/${relativePoster}`,
              base64: encodeBase64(new Uint8Array(await poster.arrayBuffer())),
            },
          };
        }
      }
      setUploads((previous) => [
        ...previous,
        { path: `public/${relative}`, base64: encodeBase64(bytes) },
        ...(generatedPoster ? [generatedPoster.upload] : []),
      ]);
      setDraft((previous) => {
        let next = replace(previous, path, address);
        if (video && path[0] === "accountMedia") {
          const titlePath = [...path.slice(0, -1), "title"];
          if (!get(next, titlePath))
            next = replace(next, titlePath, file.name.replace(/\.[^.]+$/, ""));
          if (generatedPoster)
            next = replace(
              next,
              [...path.slice(0, -1), "poster"],
              generatedPoster.address,
            );
        }
        if (path[0] === "portfolioWorks" && path[2] === "image" && dimensions) {
          next = replace(next, [...path.slice(0, -1), "thumbnail"], address);
          next = replace(
            next,
            [...path.slice(0, -1), "width"],
            dimensions.width,
          );
          next = replace(
            next,
            [...path.slice(0, -1), "height"],
            dimensions.height,
          );
        }
        return next;
      });
      setDirty(true);
      setMessage("文件已加入草稿。可预览检查，点击保存发布后才会更新网站。");
    } catch (error) {
      if (temporaryAddress) {
        const url = urls.current.get(temporaryAddress);
        if (url) URL.revokeObjectURL(url);
        urls.current.delete(temporaryAddress);
      }
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function field(value: unknown, path: Path): React.ReactNode {
    const key = String(path[path.length - 1]);
    const name =
      path[0] === 'templateProfile' && key === 'image' ? '个人图片' :
      path[0] === "accountMedia" && key === "image"
        ? "账号截图"
        : (labels[key] ?? key);
    if (key === "id") return null;
    if (path[0] === 'titleSizes') return <div className="editor-field" key={path.join('.')}>
      <label htmlFor={`field-${path.join('-')}`}>首页标题字号：{String(value)} px</label>
      <input id={`field-${path.join('-')}`} type="range" min="12" max="120" step="1" value={Number(value)} onChange={event => update(path, Number(event.target.value))} />
    </div>;
    if (path[0] === 'portfolioWorks' && ['width', 'height', 'thumbnail', 'category', 'alt'].includes(key)) return null;
    if (path[0] === 'accountMedia' && path[1] === 'videos' && path.length === 3 && value && typeof value === 'object') {
      const item = value as { src: string; poster: string };
      const source = urls.current.get(item.src) ?? item.src;
      return <div className="editor-video-upload" key={path.join('.')}>
        {source && <video controls playsInline preload="metadata" src={source} poster={urls.current.get(item.poster) ?? (item.poster || undefined)} />}
        <label className="editor-upload"><UploadIcon size={15} />{source ? '替换视频' : '上传视频'}
          <input type="file" accept="video/mp4,video/webm" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file, [...path, 'src']); event.target.value = ''; }} />
        </label>
      </div>;
    }
    if (path[0] === 'stickers' && ['x', 'y'].includes(key)) return null;
    if (path[0] === 'stickers' && key === 'width') return (
      <div className="editor-field" key={path.join('.')}>
        <label htmlFor={`field-${path.join('-')}`}>贴纸宽度：{String(value)} px</label>
        <input id={`field-${path.join('-')}`} type="range" min="64" max="600" step="1" value={Number(value)} onChange={e => update(path, Number(e.target.value))} />
      </div>
    );
    if (Array.isArray(value))
      return (
        <div className="editor-list" key={path.join(".")}>
          <div className="editor-list-heading">
            <h3>
              {name}
              {path[0] === "accountMedia" && key === "videos" && (
                <small className="editor-video-count">
                  {value.length} / {MAX_ACCOUNT_VIDEOS}
                </small>
              )}
            </h3>
            <button
              type="button"
              title={`添加${name}`}
              aria-label={`添加${name}`}
              disabled={
                path[0] === "accountMedia" &&
                key === "videos" &&
                value.length >= MAX_ACCOUNT_VIDEOS
              }
              onClick={() => {
                if (
                  path[0] === "accountMedia" &&
                  key === "videos" &&
                  value.length >= MAX_ACCOUNT_VIDEOS
                )
                  return;
                const sample =
                  path[0] === 'aboutPhotos' ? { id: '', title: '', image: '', caption: '' } :
                  path[0] === 'stickers'
                    ? { id: '', name: '新贴纸', image: '', width: 220, x: 0.5, y: 0.05 }
                    :
                  path[0] === "accountMedia" && key === "videos"
                    ? { id: "", title: "", src: "", poster: "" }
                    : (value[0] ?? "");
                const item =
                  typeof sample === "object"
                    ? {
                        ...clone(sample),
                        ...(Object.hasOwn(sample, "id")
                          ? { id: `item-${crypto.randomUUID().slice(0, 8)}` }
                          : {}),
                      }
                    : "";
                update(path, [...value, item]);
              }}
            >
              <Plus size={16} />
            </button>
          </div>
          {value.map((item, index) => (
            <div className="editor-entry" key={index}>
              <div className="editor-entry-heading">
                <span>
                  {name} {index + 1}
                </span>
                <div>
                  <button
                    type="button"
                    title="上移"
                    aria-label="上移"
                    disabled={index === 0}
                    onClick={() => {
                      const next = [...value];
                      [next[index - 1], next[index]] = [
                        next[index],
                        next[index - 1],
                      ];
                      update(path, next);
                    }}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    title="下移"
                    aria-label="下移"
                    disabled={index === value.length - 1}
                    onClick={() => {
                      const next = [...value];
                      [next[index + 1], next[index]] = [
                        next[index],
                        next[index + 1],
                      ];
                      update(path, next);
                    }}
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    title="删除"
                    aria-label="删除"
                    disabled={
                      value.length <= 1 &&
                      path[0] !== 'aboutPhotos' &&
                      path[0] !== 'stickers' &&
                      !(path[0] === "accountMedia" && key === "videos")
                    }
                    onClick={() =>
                      update(
                        path,
                        value.filter((_, i) => i !== index),
                      )
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {field(item, [...path, index])}
            </div>
          ))}
        </div>
      );
    if (value !== null && typeof value === "object")
      return (
        <div key={path.join(".")} className="editor-fields">
          {path[0] === "screenText" && path.length === 2 && (
            <h3 className="editor-screen-group-title">{name}</h3>
          )}
          {Object.entries(value).map(([child, entry]) =>
            field(entry, [...path, child]),
          )}
        </div>
      );
    const media = ["image", "thumbnail", "poster", "src"].includes(key);
    const multiline =
      [
        "body",
        "biography",
        "introduction",
        "practice",
        "caption",
        "bodyLine1",
        "bodyLine2",
      ].includes(key) || typeof path[path.length - 1] === "number";
    return (
      <div className="editor-field" key={path.join(".")}>
        <label htmlFor={`field-${path.join("-")}`}>{name}</label>
        {multiline ? (
          <textarea
            id={`field-${path.join("-")}`}
            rows={3}
            value={String(value ?? "")}
            onChange={(e) => update(path, e.target.value)}
          />
        ) : (
          <input
            id={`field-${path.join("-")}`}
            type={typeof value === "number" ? "number" : "text"}
            min={typeof value === "number" ? 1 : undefined}
            value={String(value ?? "")}
            onChange={(e) =>
              update(
                path,
                typeof value === "number"
                  ? Number(e.target.value)
                  : e.target.value,
              )
            }
          />
        )}{" "}
        {media && (
          <div className="editor-media">
            {Boolean(value) && key !== "src" && (
              <img
                src={urls.current.get(String(value)) ?? String(value)}
                alt="当前图片"
              />
            )}
            <label className="editor-upload">
              <UploadIcon size={15} />
              {key === "src" ? "上传视频" : "上传图片"}
              <input
                type="file"
                accept={
                  key === "src"
                    ? "video/mp4,video/webm"
                    : "image/jpeg,image/png,image/webp,image/gif,image/avif"
                }
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file, path);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        )}
      </div>
    );
  }
  function renderCopy(section: keyof SiteContent['moduleCopy']) {
    return draft.moduleCopy[section].map((item, index) => <div className="editor-entry" key={item.id}>
      {field(item.title, ['moduleCopy', section, index, 'title'])}
      {field(item.body, ['moduleCopy', section, index, 'body'])}
    </div>);
  }
  function renderSection() {
    const textSection = { about: 'about', fragments: 'fragments', craft: 'craft', perspective: 'perspective', works: 'gallery', collaboration: 'collaboration' } as const;
    if (tab === 'stickers') return field(draft.stickers, ['stickers']);
    const group = textSection[tab];
    const text = draft.screenText[group];
    return <>
      {field(draft.titleSizes[group], ['titleSizes', group])}
      {Object.entries(text).filter(([key]) => tab !== 'works' || ['titleLine1', 'titleLine2', 'bodyLine1', 'bodyLine2'].includes(key)).map(([key, value]) => field(value, ['screenText', group, key]))}
      {tab === 'about' && <>{(['name', 'image', 'biography', 'disciplines', 'location'] as const).map(key => field(key === 'biography' ? profileBiography(draft.templateProfile[key]) : draft.templateProfile[key], ['templateProfile', key]))}{renderCopy('about')}</>}
      {tab === 'fragments' && <>{field(draft.accountMedia.image, ['accountMedia', 'image'])}{field(draft.accountMedia.caption, ['accountMedia', 'caption'])}{field(draft.accountMedia.videos, ['accountMedia', 'videos'])}</>}
      {tab === 'craft' && field(draft.aboutPhotos, ['aboutPhotos'])}
      {tab === 'perspective' && renderCopy('perspective')}
      {tab === 'works' && field(draft.portfolioWorks, ['portfolioWorks'])}
      {tab === 'collaboration' && <>{field(draft.contactEmail, ['contactEmail'])}{field(draft.contactPhone, ['contactPhone'])}</>}
    </>;
  }
  return (
    <>
      <button
        className="portfolio-edit-trigger"
        aria-label="编辑作品集"
        title="编辑作品集"
        onClick={() => setOpen(true)}
      >
        <Pencil size={14} />
        {dirty && <span className="editor-dirty" />}
      </button>
      <dialog
        className="portfolio-editor"
        ref={dialog}
        onCancel={(e) => {
          e.preventDefault();
          if (!busy) setOpen(false);
        }}
        aria-labelledby="editor-title"
      >
        <header>
          <div>
            <span className="editor-eyebrow">
              {auth ? "OWNER ACCESS" : "PORTFOLIO"}
            </span>
            <h2 id="editor-title">{auth ? sectionTitle(draft, tab) : "所有者登录"}</h2>
          </div>
          <button
            title="关闭"
            aria-label="关闭编辑器"
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            <X size={19} />
          </button>
        </header>
        {!auth ? (
          <form onSubmit={authenticate} className="editor-login">
            <p>使用你的 GitHub 编辑凭证登录。</p>
            <label htmlFor="editor-token">编辑凭证</label>
            <input
              id="editor-token"
              type="password"
              autoComplete="off"
              spellCheck={false}
              required
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
            />
            <p className="editor-muted">
              凭证仅在当前页面内存中使用，刷新或退出后清除。
            </p>
            <button
              className="editor-primary"
              disabled={busy || !tokenInput.trim()}
            >
              {busy ? "正在验证…" : "登录"}
            </button>
            <a
              href={`https://github.com/settings/personal-access-tokens/new?name=Portfolio-editor&description=Edit+my+portfolio&target_name=${OWNER}`}
              target="_blank"
              rel="noreferrer"
            >
              创建 GitHub 编辑凭证 ↗
            </a>
            <details>
              <summary>第一次使用？</summary>
              <ol>
                <li>选择资源所有者 {OWNER}。</li>
                <li>选择 Only select repositories，仅勾选 {REPO}。</li>
                <li>
                  Repository permissions → Contents，设为 Read and write。
                </li>
                <li>
                  设置有效期并生成凭证，粘贴到上方登录。不要将凭证发给别人。
                </li>
              </ol>
            </details>
          </form>
        ) : (
          <>
            <nav className="editor-tabs" role="tablist" aria-label="编辑栏目">
              {tabs.map((item) => (
                <button
                  key={item}
                  id={`editor-section-${item}`}
                  role="tab"
                  aria-controls="editor-section-content"
                  aria-selected={tab === item}
                  disabled={busy}
                  onClick={() => setTab(item)}
                >
                  {sectionTitle(draft, item)}
                </button>
              ))}
            </nav>
            <fieldset id="editor-section-content" className="editor-body" role="tabpanel" aria-labelledby={`editor-section-${tab}`} inert={busy} aria-busy={busy}>
              {renderSection()}
            </fieldset>
            <footer>
              <div className="editor-status" role="status">
                {message ||
                  (busy
                    ? "正在处理，请稍候…"
                    : dirty
                      ? "有未发布的修改"
                      : "所有修改已保存")}
              </div>
              {closeAction && (
                <div className="editor-confirm">
                  <p>退出会丢弃未发布的修改。</p>
                  <button onClick={logout}>丢弃并退出</button>
                  <button onClick={() => setCloseAction("")}>继续编辑</button>
                </div>
              )}
              <div className="editor-commands">
                <button disabled={busy} title="预览当前修改" onClick={preview}>
                  <Eye size={16} />
                  预览
                </button>
                <button
                  className="editor-primary"
                  disabled={busy || !dirty}
                  onClick={() => void save()}
                >
                  <Save size={16} />
                  {busy ? "处理中…" : "保存发布"}
                </button>
              </div>
              <div className="editor-secondary">
                <button disabled={busy || !dirty} onClick={discard}>
                  取消修改
                </button>
                <button title="下载草稿备份" disabled={busy} onClick={backup}>
                  <Download size={14} />
                  备份
                </button>
                <button
                  title="恢复草稿备份"
                  disabled={busy}
                  onClick={() => backupInput.current?.click()}
                >
                  <UploadIcon size={14} />
                  恢复
                </button>
                <input
                  ref={backupInput}
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void restore(file);
                    e.target.value = "";
                  }}
                />
                <button
                  disabled={busy}
                  onClick={() => (dirty ? setCloseAction("logout") : logout())}
                >
                  <LogOut size={14} />
                  退出
                </button>
              </div>
            </footer>
          </>
        )}
        {!auth && message && (
          <p className="editor-error" role="alert">
            {message}
          </p>
        )}
      </dialog>
    </>
  );
}
