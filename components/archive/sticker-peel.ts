import gsap from 'gsap';
import type { StickerInstance, StickerPlaybackMotion } from '../../vendor/sticker-forge/types';
import type { HomepageStickerData } from './stickers';

let forge: Promise<typeof import('../../vendor/sticker-forge/sticker-forge')> | undefined;
export function prepareStickerPeel() { return forge ??= import('../../vendor/sticker-forge/sticker-forge'); }

export function createStickerPeel(button: HTMLButtonElement, host: HTMLDivElement, item: HomepageStickerData) {
  let instance: StickerInstance | undefined;
  let disposed = false;
  let pendingPreview = false;
  let tween: gsap.core.Tween | undefined;
  let ratio = 30 / 11;
  let alpha: ImageData | undefined;
  host.dataset.progress = '0';
  const pose = { value: 0 };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let motion: StickerPlaybackMotion = { origin: { x: 0, y: .5 }, target: { x: 1, y: .5 } };
  const padding = () => {
    const style = getComputedStyle(button);
    return { x: parseFloat(style.paddingLeft) + parseFloat(style.paddingRight), y: parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) };
  };
  const paint = () => {
    if (!instance || disposed || reduced.matches) return;
    try {
      instance.setPeelProgress(pose.value, motion);
      host.dataset.progress = pose.value.toFixed(3);
      if (pose.value > 0) button.dataset.peelActive = 'true';
    } catch { reset(); }
  };
  const resize = () => {
    const inset = padding();
    const width = Math.max(1, button.clientWidth - inset.x), height = Math.max(1, button.clientHeight - inset.y);
    const artWidth = Math.min(width, height * ratio);
    instance?.setOptions({ display: { width: artWidth, height: artWidth / ratio } });
    instance?.resize();
  };
  function reset() {
    pendingPreview = false;
    tween?.kill(); pose.value = 0;
    instance?.reset();
    delete button.dataset.peelActive;
    host.dataset.progress = '0';
  }
  function release() {
    tween?.kill();
    if (!instance || !pose.value || reduced.matches) { reset(); return; }
    tween = gsap.to(pose, { value: 0, duration: .55, ease: 'power3.out', onUpdate: paint, onComplete: reset });
  }
  const observer = new ResizeObserver(resize);
  const visibility = () => { if (document.hidden) reset(); };
  observer.observe(button);
  reduced.addEventListener('change', reset);
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', visibility);
  void (async () => {
    const { createSticker } = await prepareStickerPeel();
    let src = item.image;
    if (!src) {
      await document.fonts.ready;
      const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 190;
      const ctx = canvas.getContext('2d')!;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      for (const [text, y, size, stroke] of [['suiyixuan', 59, 108, 42], ['@jsy_1to4', 147, 51, 36]] as const) {
        ctx.save(); ctx.translate(300, y); ctx.rotate(3 * Math.PI / 180);
        ctx.font = `900 ${size}px Inter, Arial, sans-serif`; ctx.strokeStyle = '#fff'; ctx.lineWidth = stroke;
        ctx.strokeText(text, 0, 0); ctx.fillStyle = '#171717'; ctx.fillText(text, 0, 0); ctx.restore();
      }
      src = canvas.toDataURL();
    }
    const image = new Image(); image.src = src; await image.decode();
    ratio = image.naturalWidth / image.naturalHeight;
    const mask = document.createElement('canvas');
    mask.width = 256; mask.height = Math.max(1, Math.round(256 / ratio));
    const maskContext = mask.getContext('2d', { willReadFrequently: true })!;
    maskContext.drawImage(image, 0, 0, mask.width, mask.height);
    alpha = maskContext.getImageData(0, 0, mask.width, mask.height);
    if (disposed) return;
    instance = await createSticker(host, {
      source: { type: 'image', src, padding: 0, textureMaxEdge: 1024 },
      outline: { width: 0, color: '#ffffff' },
      edge: { width: 2.4, strength: .7 },
      peel: { radius: .12, stiffness: .72, grabWidth: 22, maxAngle: 3.55, release: 'reset', residue: false },
      shadow: { opacity: .22, blur: 22, distance: 16, angle: 42, color: '#191823' },
      back: { color: '#f7f5f2', gloss: .7, roughness: .3 },
      material: { type: 'original' },
      sound: { enabled: false }, wind: 0, tilt: 0, quality: 'low',
    });
    if (disposed) { instance.destroy(); return; }
    const canvas = host.querySelector('canvas')!;
    canvas.tabIndex = -1; canvas.removeAttribute('role'); canvas.setAttribute('aria-hidden', 'true');
    resize(); host.dataset.ready = 'true'; host.dataset.material = 'original';
    if (pendingPreview) { pendingPreview = false; pose.value = .45; paint(); release(); }
    else if (pose.value) paint();
  })().catch(() => { if (!disposed) host.dataset.ready = 'false'; });
  return {
    hit(clientX: number, clientY: number) {
      const rect = button.getBoundingClientRect();
      const inset = padding();
      const width = Math.min(rect.width - inset.x, (rect.height - inset.y) * ratio);
      const height = width / ratio;
      const x = (clientX - rect.x - (rect.width - width) / 2) / width;
      const y = (clientY - rect.y - (rect.height - height) / 2) / height;
      const band = Math.min(22, Math.min(width, height) * .24);
      const solid = (px: number, py: number) => !alpha
        ? px >= 0 && px <= 1 && py >= 0 && py <= 1
        : px >= 0 && px < 1 && py >= 0 && py < 1 && alpha.data[(Math.floor(py * alpha.height) * alpha.width + Math.floor(px * alpha.width)) * 4 + 3] > 40;
      // Keep a generous central handle; elsewhere follow the actual PNG silhouette.
      let edge = !(x > .27 && x < .73 && y > .27 && y < .73);
      if (edge && solid(x, y)) {
        edge = false;
        for (let a = 0; a < 16; a++) {
          const angle = a * Math.PI / 8;
          if (!solid(x + Math.cos(angle) * band / width, y + Math.sin(angle) * band / height)) { edge = true; break; }
        }
      }
      return { edge, x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
    },
    begin(x: number, y: number) {
      reset();
      motion = { origin: { x, y }, target: { x: 1 - x, y: 1 - y } };
    },
    drag(dx: number, dy: number) {
      const distance = Math.hypot(dx, dy);
      if (distance < 4 && !pose.value) return;
      tween?.kill();
      pose.value = Math.min(.95, distance / Math.max(80, button.clientWidth * .8)); paint();
    },
    preview() { if (reduced.matches) return; if (!instance) { pendingPreview = true; return; } pose.value = .45; paint(); release(); },
    release,
    reset,
    destroy() { disposed = true; tween?.kill(); observer.disconnect(); reduced.removeEventListener('change', reset); window.removeEventListener('blur', reset); document.removeEventListener('visibilitychange', visibility); instance?.destroy(); delete button.dataset.peelActive; },
  };
}
