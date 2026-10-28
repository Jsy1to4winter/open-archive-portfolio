import { useId, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

export default function ArtistPortrait({ src, name }: { src: string; name: string }) {
  const base = src.replace(/artist-portrait\.png$/, 'artist-portrait-base.png');
  const id = useId().replace(/:/g, '');
  const root = useRef<SVGSVGElement>(null);
  const reveal = useRef<SVGRectElement>(null);
  useLayoutEffect(() => {
    const element = root.current;
    const stroke = reveal.current;
    if (!element || !stroke) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const ctx = gsap.context(() => {
      let disposed = false;
      const preload = new Image();
      preload.src = src;
      const background = new Image();
      background.src = base;
      const tween = gsap.fromTo(stroke, { attr: { width: 0 } }, { attr: { width: 1416 }, duration: 2.8, ease: 'none', paused: true });
      if (media.matches) tween.progress(1);
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          void Promise.all([preload.decode(), background.decode()]).catch(() => {}).then(() => { if (!disposed && !media.matches) tween.play(); });
          observer.disconnect();
        }
      }, { root: element.closest('dialog'), threshold: 0.15 });
      observer.observe(element);
      const update = () => { if (media.matches) tween.progress(1); };
      media.addEventListener('change', update);
      return () => { disposed = true; observer.disconnect(); media.removeEventListener('change', update); };
    }, element);
    return () => ctx.revert();
  }, [src, base]);
  const image = <image href={src} width="1416" height="1111" preserveAspectRatio="xMidYMid meet" />;
  return <svg ref={root} className="artist-portrait" viewBox="0 0 1416 1111" role="img" aria-label={`${name}，Artist 人像拼贴`}>
    <defs>
      {/* Red-only masks leave all grayscale portrait pixels stationary. */}
      {[['ink', 1], ['erase', 0]].map(([suffix, color]) => <filter key={suffix} id={`${id}-${suffix}`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values={`0 0 0 0 ${color} 0 0 0 0 ${color} 0 0 0 0 ${color} 16 -8 -8 0 0`} />
      </filter>)}
      <clipPath id={`${id}-letters`}><rect width="1416" height="390" /><rect x="0" y="390" width="430" height="300" /><rect x="430" y="390" width="410" height="140" /><rect x="840" y="390" width="576" height="180" /></clipPath>
      <mask id={`${id}-base`} maskUnits="userSpaceOnUse" x="0" y="0" width="1416" height="1111">
        <rect width="1416" height="1111" fill="white" />
        <g clipPath={`url(#${id}-letters)`}><g filter={`url(#${id}-erase)`}>{image}</g></g>
      </mask>
      <mask id={`${id}-inkmask`} maskUnits="userSpaceOnUse" x="0" y="0" width="1416" height="1111"><g filter={`url(#${id}-ink)`}>{image}</g></mask>
      <clipPath id={`${id}-writing`}><rect ref={reveal} width="0" height="1111" /></clipPath>
    </defs>
    <g clipPath={`url(#${id}-letters)`}><image href={base} width="1416" height="1111" preserveAspectRatio="none" /></g>
    <g mask={`url(#${id}-base)`}>{image}</g>
    <g clipPath={`url(#${id}-letters)`}><g clipPath={`url(#${id}-writing)`}><g mask={`url(#${id}-inkmask)`}>{image}</g></g></g>
  </svg>;
}
