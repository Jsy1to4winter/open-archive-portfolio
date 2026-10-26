import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import './homepage-sticker.css';
import { stickers } from './content';
import type { HomepageStickerData } from './stickers';
import { prepareStickerSound, unlockStickerSound, stopStickerSound, playStickerSound } from './sticker-sound';

gsap.registerPlugin(Draggable);

export default function HomepageSticker({ visible }: { visible: boolean }) {
  return <>{stickers.map((item, index) => <Sticker key={item.id} visible={visible} item={item} index={index} />)}</>;
}

function Sticker({ visible, item, index }: { visible: boolean; item: HomepageStickerData; index: number }) {
  const bounds = useRef<HTMLDivElement>(null);
  const sticker = useRef<HTMLButtonElement>(null);
  const drag = useRef<Draggable | null>(null);

  useLayoutEffect(() => {
    if (!visible || !sticker.current || !bounds.current) return;
    void prepareStickerSound();
    const [instance] = Draggable.create(sticker.current, {
      type: 'x,y',
      bounds: bounds.current,
      edgeResistance: 1,
      dragClickables: true,
      onPress() { unlockStickerSound(); },
      onDragStart() {
        stopStickerSound();
        sticker.current?.setAttribute('data-dragging', 'true');
      },
      onDragEnd(event: Event) {
        sticker.current?.removeAttribute('data-dragging');
        if (event.type.includes('cancel') || document.visibilityState === 'hidden') return;
        playStickerSound();
      },
    });
    drag.current = instance;
    const resize = new ResizeObserver(() => instance.applyBounds(bounds.current!));
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
        style={{ width: `min(${item.width}px, calc(100vw - 48px))`, height: 'auto', aspectRatio: item.image ? '3 / 2' : '30 / 11', left: `max(0px, calc(50% - ${item.width / 2}px))`, top: `${12 + (index % 4) * 34}px` }}
        type="button"
        aria-label={`拖动 ${item.name} 贴纸`}
        title="拖动贴纸；方向键也可移动"
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
        }}
      >
        {item.image ? <img src={item.image} alt={item.name} draggable={false} /> : <div className="homepage-sticker-art"><span className="homepage-sticker-name">suiyixuan</span><span className="homepage-sticker-handle">@jsy_1to4</span></div>}
      </button>
    </div>
  );
}
