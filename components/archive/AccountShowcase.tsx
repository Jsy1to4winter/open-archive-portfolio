import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronLeft, ChevronRight, Play, Pause, X, Film } from "lucide-react";
import { accountMedia } from "./content";
import type { AccountVideo } from "./account-media";
import "./account-showcase.css";

gsap.registerPlugin(ScrollTrigger);
export { ScrollTrigger };
function clipTitle(item: AccountVideo, index: number) {
  const title = item.title.trim();
  return title && !/^[a-f0-9]{24,}$/i.test(title)
    ? title
    : `视频作品 ${String(index + 1).padStart(2, "0")}`;
}

export default function AccountShowcase() {
  const videos = accountMedia.videos;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [selected, setSelected] = useState<AccountVideo | null>(null);
  const [error, setError] = useState("");
  const selectedTitle = selected
    ? clipTitle(
        selected,
        Math.max(
          0,
          videos.findIndex((item) => item.id === selected.id),
        ),
      )
    : "视频播放";
  const reduced = useReducedMotion();
  const runway = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const posters = useRef<Array<HTMLButtonElement | null>>([]);
  const player = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const suppressClickUntil = useRef(0);
  const model = useRef({ position: 0 });
  const activeRef = useRef(0);
  const trigger = useRef<ScrollTrigger | null>(null);
  const manualTween = useRef<gsap.core.Tween | null>(null);
  const draw = useRef<() => void>(() => {});
  const drag = useRef<{
    x: number;
    y: number;
    position: number;
    horizontal: boolean;
  } | null>(null);
  const stepRef = useRef<(direction: number) => void>(() => {});

  useLayoutEffect(() => {
    const root = runway.current;
    const scroller = root?.closest<HTMLDialogElement>(
      ".archive-archive-dialog",
    );
    if (!root || !scroller || !videos.length) return;
    let context: gsap.Context | undefined;
    const frame = requestAnimationFrame(() => {
      context = gsap.context(() => {
        const render = () => {
          const count = videos.length;
          const current =
            ((Math.round(model.current.position) % count) + count) % count;
          if (activeRef.current !== current) {
            activeRef.current = current;
            setActive(current);
          }
          posters.current.forEach((element, index) => {
            if (!element) return;
            const offset =
              count === 1
                ? 0
                : gsap.utils.wrap(
                    -count / 2,
                    count / 2,
                    index - model.current.position,
                  );
            const distance = Math.abs(offset);
            gsap.set(element, {
              xPercent: offset * 87,
              y: distance * distance * 20,
              rotation: offset * 11,
              scale: 1 - Math.min(distance, 1) * 0.06,
              autoAlpha: distance > 2.4 ? 0 : 1,
              zIndex: count - Math.round(distance),
              pointerEvents: distance > 2.4 ? "none" : "auto",
            });
          });
        };
        draw.current = render;
        render();
        if (!reduced && videos.length > 1) {
          // Scroll only inside this account dialog; animate children of the sticky section.
          const tween = gsap.to(model.current, {
            position: videos.length - 1,
            ease: "none",
            onUpdate: render,
            scrollTrigger: {
              id: "account-video-scroll",
              trigger: root,
              scroller,
              start: "top top+=12",
              end: "bottom bottom",
              scrub: 0.45,
              invalidateOnRefresh: true,
              onToggle: (self) => {
                if (self.isActive) manualTween.current?.kill();
              },
            },
          });
          trigger.current = tween.scrollTrigger ?? null;
          ScrollTrigger.refresh();
        }
      }, root);
    });
    return () => {
      cancelAnimationFrame(frame);
      gsap.killTweensOf(model.current);
      gsap.killTweensOf(scroller);
      context?.revert();
      trigger.current = null;
      draw.current = () => {};
    };
  }, [videos, reduced]);

  function moveTo(position: number) {
    const count = videos.length;
    if (!count) return;
    const index = ((Math.round(position) % count) + count) % count;
    const scroll = trigger.current;
    if (scroll?.isActive) {
      gsap.to(scroll.scroller, {
        scrollTop:
          scroll.start + (index / (count - 1)) * (scroll.end - scroll.start),
        duration: 0.65,
        ease: "power2.inOut",
        overwrite: "auto",
      });
    } else {
      manualTween.current?.kill();
      manualTween.current = gsap.to(model.current, {
        position,
        duration: reduced ? 0 : 0.7,
        ease: "power2.inOut",
        onUpdate: () => draw.current(),
        overwrite: false,
      });
    }
  }
  stepRef.current = (direction) =>
    moveTo(Math.round(model.current.position) + direction);

  useEffect(() => {
    if (videos.length < 2 || paused || hovered || selected || reduced) return;
    const interval = window.setInterval(() => {
      const bounds = stage.current?.getBoundingClientRect();
      const container = stage.current
        ?.closest(".archive-archive-dialog")
        ?.getBoundingClientRect();
      if (
        !document.hidden &&
        (!trigger.current ||
          trigger.current.scroll() < trigger.current.start) &&
        bounds &&
        container &&
        bounds.bottom > container.top &&
        bounds.top < container.bottom
      )
        stepRef.current(1);
    }, 3000);
    return () => clearInterval(interval);
  }, [videos.length, paused, hovered, selected, reduced]);

  useEffect(() => {
    if (selected) {
      player.current?.showModal();
      setError("");
      void video.current?.play().catch(() => {});
    } else player.current?.close();
  }, [selected]);

  function open(
    item: AccountVideo,
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    if (performance.now() < suppressClickUntil.current) return;
    opener.current = event.currentTarget;
    setSelected(item);
  }
  function close() {
    video.current?.pause();
    player.current?.close();
    setSelected(null);
    opener.current?.focus({ preventScroll: true });
  }

  return (
    <section className="account-showcase" aria-label="AI短视频账号">
      <figure className="account-profile">
        {accountMedia.image && (
          <img
            src={accountMedia.image}
            alt={accountMedia.alt}
            decoding="async"
            onLoad={() => ScrollTrigger.refresh()}
          />
        )}
        <figcaption>{accountMedia.caption}</figcaption>
      </figure>
      {videos.length > 0 && (
        <div
          ref={runway}
          className="account-video-runway"
          style={{
            height:
              reduced || videos.length < 2
                ? "auto"
                : "calc(90dvh + " + (videos.length - 1) * 230 + "px)",
          }}
        >
          <section className="account-videos" aria-label="视频作品">
            <header className="account-video-header">
              <h3>视频作品</h3>
              <span aria-live="polite">
                {String(active + 1).padStart(2, "0")} /{" "}
                {String(videos.length).padStart(2, "0")}
              </span>
            </header>
            <div
              className="account-video-window"
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              onFocusCapture={() => setHovered(true)}
              onBlurCapture={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget))
                  setHovered(false);
              }}
            >
              <div
                ref={stage}
                className="account-video-arc"
                onPointerDown={(e) => {
                  if (e.button === 0)
                    drag.current = {
                      x: e.clientX,
                      y: e.clientY,
                      position: model.current.position,
                      horizontal: false,
                    };
                }}
                onPointerMove={(e) => {
                  const start = drag.current;
                  if (!start || videos.length < 2) return;
                  const dx = e.clientX - start.x,
                    dy = e.clientY - start.y;
                  if (
                    !start.horizontal &&
                    Math.abs(dx) > 12 &&
                    Math.abs(dx) > Math.abs(dy)
                  ) {
                    start.horizontal = true;
                    suppressClickUntil.current = Infinity;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    manualTween.current?.kill();
                  }
                  if (start.horizontal) {
                    model.current.position = start.position - dx / 160;
                    draw.current();
                  }
                }}
                onPointerUp={() => {
                  if (drag.current?.horizontal) {
                    suppressClickUntil.current = performance.now() + 300;
                    moveTo(Math.round(model.current.position));
                  }
                  drag.current = null;
                }}
                onPointerCancel={() => {
                  if (drag.current?.horizontal) {
                    suppressClickUntil.current = performance.now() + 300;
                    moveTo(Math.round(model.current.position));
                  }
                  drag.current = null;
                }}
              >
                {videos.map((item, index) => (
                  <button
                    key={item.id}
                    ref={(element) => {
                      posters.current[index] = element;
                    }}
                    className="account-video-poster"
                    type="button"
                    aria-label={"播放 " + clipTitle(item, index)}
                    title={clipTitle(item, index)}
                    aria-current={index === active ? "true" : undefined}
                    tabIndex={index === active ? 0 : -1}
                    onClick={(event) => open(item, event)}
                  >
                    {item.poster ? (
                      <img
                        src={item.poster}
                        alt={clipTitle(item, index)}
                        draggable={false}
                      />
                    ) : (
                      <span className="account-video-no-poster">
                        <Film size={40} />
                      </span>
                    )}
                    <span className="account-video-play">
                      <Play size={20} fill="currentColor" />
                    </span>
                    <span className="account-video-title">
                      {clipTitle(item, index)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <nav className="account-video-controls" aria-label="视频切换">
              <button
                type="button"
                aria-label="上一个视频"
                title="上一个视频"
                disabled={videos.length < 2}
                onClick={() => stepRef.current(-1)}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                aria-label={paused ? "开始自动滑动" : "暂停自动滑动"}
                title={paused ? "开始自动滑动" : "暂停自动滑动"}
                disabled={videos.length < 2 || !!reduced}
                onClick={() => setPaused((value) => !value)}
              >
                {paused || reduced ? <Play size={15} /> : <Pause size={15} />}
              </button>
              <button
                type="button"
                aria-label="下一个视频"
                title="下一个视频"
                disabled={videos.length < 2}
                onClick={() => stepRef.current(1)}
              >
                <ChevronRight size={18} />
              </button>
            </nav>
          </section>
        </div>
      )}
      <dialog
        ref={player}
        className="account-video-player"
        aria-label={selectedTitle}
        onCancel={(e) => {
          e.preventDefault();
          e.stopPropagation();
          close();
        }}
        onClose={(e) => {
          e.stopPropagation();
          if (!e.currentTarget.open) {
            video.current?.pause();
            setSelected(null);
          }
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <button
          type="button"
          className="account-player-close"
          aria-label="关闭视频"
          title="关闭视频"
          onClick={close}
        >
          <X size={22} />
        </button>
        {selected && (
          <>
            <video
              ref={video}
              src={selected.src}
              poster={selected.poster || undefined}
              controls
              autoPlay
              playsInline
              preload="metadata"
              onError={() =>
                setError(
                  video.current?.error?.code === 4
                    ? "浏览器不支持此视频编码，请上传 H.264 编码的 MP4。"
                    : "视频加载失败，请检查网络或视频地址。",
                )
              }
            />
            <p>{selectedTitle}</p>
            {error && <p role="alert">{error}</p>}
          </>
        )}
      </dialog>
    </section>
  );
}
