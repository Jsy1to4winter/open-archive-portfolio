import { useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import './homepage-sticker.css';
import { stickers } from './content';
import type { HomepageStickerData } from './stickers';
import { prepareStickerSound, unlockStickerSound, stopStickerSound, playStickerSound } from './sticker-sound';
import { createStickerPeel, prepareStickerPeel } from './sticker-peel';

gsap.registerPlugin(Draggable);

export default function HomepageSticker({ visible }: { visible: boolean }) {
  return <>{stickers.map((item, index) => <Sticker key={item.id} visible={visible} item={item} index={index} />)}</>;
}

function Sticker({ visible, item, index }: { visible: boolean; item: HomepageStickerData; index: number }) {
  const bounds = useRef<HTMLDivElement>(null);
  const sticker = useRef<HTMLButtonElement>(null);
  const drag = useRef<Draggable | null>(null);
  const position = useRef({ x: item.x, y: item.y });
  const surface = useRef<HTMLDivElement>(null);
  const peel = useRef<ReturnType<typeof createStickerPeel> | null>(null);
  const dragOrigin = useRef({ x: 0, y: 0 });
  const lastDragEnd = useRef(-Infinity);
  useEffect(() => () => peel.current?.destroy(), []);
  function preparePeel() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!peel.current && visible && sticker.current && surface.current) peel.current = createStickerPeel(sticker.current, surface.current, item);
  }
  function recordPosition() {
    if (!bounds.current || !sticker.current || !drag.current) return;
    const width = Math.max(0, bounds.current.clientWidth - sticker.current.offsetWidth);
    const height = Math.max(0, bounds.current.clientHeight - sticker.current.offsetHeight);
    position.current = {
      x: width ? Math.min(1, Math.max(0, drag.current.x / width)) : 0,
      y: height ? Math.min(1, Math.max(0, drag.current.y / height)) : 0,
    };
    window.dispatchEvent(new CustomEvent('portfolio-sticker-move', { detail: { id: item.id, ...position.current } }));
  }

  useLayoutEffect(() => {
    if (!visible || !sticker.current || !bounds.current) { peel.current?.reset(); return; }
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) void prepareStickerPeel().catch(() => {});
    void prepareStickerSound();
    const [instance] = Draggable.create(sticker.current, {
      type: 'x,y',
      bounds: bounds.current,
      edgeResistance: 1,
      dragClickables: true,
      onPress() { preparePeel(); unlockStickerSound(); dragOrigin.current = { x: this.x, y: this.y }; },
      onDragStart() {
        stopStickerSound();
        sticker.current?.setAttribute('data-dragging', 'true');
      },
      onDrag() { peel.current?.drag(this.x - dragOrigin.current.x, this.y - dragOrigin.current.y); },
      onDragEnd(event: Event) {
        lastDragEnd.current = performance.now();
        peel.current?.release();
        sticker.current?.removeAttribute('data-dragging');
        if (event.type.includes('cancel') || document.visibilityState === 'hidden') return;
        recordPosition();
        playStickerSound();
      },
    });
    drag.current = instance;
    const place = () => {
      const root = bounds.current!, element = sticker.current!;
      gsap.set(element, { x: position.current.x * Math.max(0, root.clientWidth - element.offsetWidth), y: position.current.y * Math.max(0, root.clientHeight - element.offsetHeight) });
      instance.update(true);
      instance.applyBounds(root);
    };
    place();
    const resize = new ResizeObserver(place);
    resize.observe(bounds.current);
    return () => {
      resize.disconnect();
      instance.kill();
      stopStickerSound();
      drag.current = null;
      sticker.current?.removeAttribute('data-dragging');
    };
  }, [visible]);

  return (
    <div ref={bounds} className="homepage-sticker-bounds" hidden={!visible}>
      <button
        ref={sticker}
        className="homepage-sticker"
        style={{ width: `min(${item.width}px, calc(100vw - 48px))`, height: 'auto', aspectRatio: item.image ? '3 / 2' : '30 / 11', left: 0, top: 0 }}
        type="button"
        aria-label={`拖动 ${item.name} 贴纸`}
        title="拖动撕开，松手贴回；方向键也可移动"
        onPointerEnter={preparePeel}
        onFocus={preparePeel}
        onClick={() => { preparePeel(); if (performance.now() - lastDragEnd.current > 200) peel.current?.preview(); }}
        onKeyDown={event => {
          const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
          const instance = drag.current;
          if (!direction || !instance || !sticker.current) return;
          event.preventDefault();
          event.stopPropagation();
          const step = event.shiftKey ? 24 : 8;
          gsap.set(sticker.current, { x: instance.x + direction[0] * step, y: instance.y + direction[1] * step });
          instance.update(true);
          instance.applyBounds(bounds.current!);
          recordPosition();
        }}
      >
        <div className="homepage-sticker-face">{item.image ? <img src={item.image} alt={item.name} draggable={false} /> : <div className="homepage-sticker-art"><span className="homepage-sticker-name">suiyixuan</span><span className="homepage-sticker-handle">@jsy_1to4</span></div>}</div>
        <div ref={surface} className="homepage-sticker-peel" aria-hidden="true" />
      </button>
    </div>
  );
}
