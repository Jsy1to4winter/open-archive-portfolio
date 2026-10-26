import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import './homepage-sticker.css';

gsap.registerPlugin(Draggable);

export default function HomepageSticker({ visible }: { visible: boolean }) {
  const bounds = useRef<HTMLDivElement>(null);
  const sticker = useRef<HTMLButtonElement>(null);
  const drag = useRef<Draggable | null>(null);

  useLayoutEffect(() => {
    if (!visible || !sticker.current || !bounds.current) return;
    const sound = new Audio(`${import.meta.env.BASE_URL}assets/sticker-place.wav`);
    sound.preload = 'auto';
    sound.volume = 0.55;
    const stopSound = () => {
      sound.pause();
      sound.currentTime = 0;
    };
    const [instance] = Draggable.create(sticker.current, {
      type: 'x,y',
      bounds: bounds.current,
      edgeResistance: 1,
      dragClickables: true,
      onDragStart() {
        stopSound();
        sticker.current?.setAttribute('data-dragging', 'true');
      },
      onDragEnd(event: Event) {
        sticker.current?.removeAttribute('data-dragging');
        if (event.type.includes('cancel') || document.visibilityState === 'hidden') return;
        stopSound();
        void sound.play().catch(() => {});
      },
    });
    drag.current = instance;
    const resize = new ResizeObserver(() => instance.applyBounds(bounds.current!));
    resize.observe(bounds.current);
    return () => {
      resize.disconnect();
      instance.kill();
      stopSound();
      sound.removeAttribute('src');
      sound.load();
      drag.current = null;
      sticker.current?.removeAttribute('data-dragging');
    };
  }, [visible]);

  return (
    <div ref={bounds} className="homepage-sticker-bounds" hidden={!visible}>
      <button
        ref={sticker}
        className="homepage-sticker"
        type="button"
        aria-label="拖动 suiyixuan 贴纸"
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
        <span className="homepage-sticker-name">suiyixuan</span>
        <span className="homepage-sticker-handle">@jsy_1to4</span>
      </button>
    </div>
  );
}
