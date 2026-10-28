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
  const edgePress = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  useEffect(() => () => { peel.current?.destroy(); peel.current = null; }, []);
  useEffect(() => {
    const cancel = () => {
      edgePress.current = null;
      if (sticker.current) delete sticker.current.dataset.interaction;
      peel.current?.reset();
    };
    const visibility = () => { if (document.hidden) cancel(); };
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('blur', cancel); document.removeEventListener('visibilitychange', visibility); };
  }, []);
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
    if (!visible || !sticker.current || !bounds.current) { edgePress.current = null; peel.current?.reset(); return; }
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) void prepareStickerPeel().catch(() => {});
    void prepareStickerSound();
    const [instance] = Draggable.create(sticker.current, {
      type: 'x,y',
      bounds: bounds.current,
      edgeResistance: 1,
      dragClickables: true,
      onPress() { preparePeel(); unlockStickerSound(); peel.current?.reset(); },
      onDragStart() {
        stopStickerSound();
        sticker.current?.setAttribute('data-dragging', 'true');
      },
      onDragEnd(event: Event) {
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
        title="按住边缘拖动撕开，松手回贴；中间拖动；方向键移动"
        onPointerEnter={preparePeel}
        onFocus={preparePeel}
        onPointerDownCapture={event => {
          if (!event.isPrimary || event.button !== 0) return;
          preparePeel(); unlockStickerSound();
          const hit = peel.current?.hit(event.clientX, event.clientY);
          if (!hit?.edge) { peel.current?.reset(); return; }
          event.preventDefault(); event.stopPropagation();
          stopStickerSound();
          edgePress.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
          event.currentTarget.setPointerCapture(event.pointerId);
          peel.current?.begin(hit.x, hit.y);
          event.currentTarget.dataset.interaction = 'peel';
        }}
        onMouseDownCapture={event => { if (edgePress.current) { event.preventDefault(); event.stopPropagation(); } }}
        onTouchStartCapture={event => { if (edgePress.current) event.stopPropagation(); }}
        onPointerMove={event => {
          const press = edgePress.current;
          if (press) {
            if (press.id === event.pointerId) {
              const dx = event.clientX - press.x, dy = event.clientY - press.y;
              if (Math.hypot(dx, dy) >= 4) press.moved = true;
              peel.current?.drag(dx, dy);
            }
            return;
          }
          if (drag.current?.isPressed || event.buttons || event.pointerType === 'touch') return;
          preparePeel();
          const hit = peel.current?.hit(event.clientX, event.clientY);
          event.currentTarget.dataset.interaction = hit?.edge ? 'edge' : 'move';
        }}
        onPointerUp={event => {
          if (edgePress.current?.id !== event.pointerId) return;
          const moved = edgePress.current.moved;
          edgePress.current = null;
          peel.current?.release(); delete event.currentTarget.dataset.interaction;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          if (moved) playStickerSound();
        }}
        onPointerCancel={() => { edgePress.current = null; peel.current?.release(); }}
        onLostPointerCapture={() => { if (edgePress.current) { edgePress.current = null; peel.current?.release(); } }}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); preparePeel(); peel.current?.preview(); return; }
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
