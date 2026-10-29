import { useEffect, useId, useRef, useState } from 'react';
import { createArtistParticles } from './artist-particles';

export default function ArtistPortrait({ src, name }: { src: string; name: string }) {
  const base = src.replace(/artist-portrait\.png$/, 'artist-portrait-base.png');
  const id = useId().replace(/:/g, '');
  const canvas = useRef<HTMLCanvasElement>(null);
  const [interactive, setInteractive] = useState(false);
  useEffect(() => {
    if (!canvas.current || matchMedia('(pointer: coarse)').matches) return;
    let cancelled = false;
    const setup = createArtistParticles(canvas.current, src, base, active => { if (!cancelled) setInteractive(active); });
    return () => { cancelled = true; void setup.then(cleanup => cleanup()); };
  }, [src, base]);
  const image = <image href={src} width="1416" height="1111" preserveAspectRatio="xMidYMid meet" />;
  return <div className="artist-interactive" data-interactive={interactive}>
    <svg className="artist-portrait" viewBox="0 0 1416 1111" role="img" aria-label={`${name}，Artist 人像拼贴`}>
      <defs>
        <filter id={`${id}-erase`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 16 -8 -8 0 0" />
        </filter>
        <clipPath id={`${id}-letters`}><rect width="1416" height="390" /><rect x="0" y="390" width="430" height="300" /><rect x="430" y="390" width="410" height="140" /><rect x="840" y="390" width="576" height="180" /></clipPath>
        <mask id={`${id}-base`} maskUnits="userSpaceOnUse" x="0" y="0" width="1416" height="1111">
          <rect width="1416" height="1111" fill="white" />
          <g clipPath={`url(#${id}-letters)`}><g filter={`url(#${id}-erase)`}>{image}</g></g>
        </mask>
      </defs>
      {interactive ? <>
        <g className="artist-static-layer">
          <g clipPath={`url(#${id}-letters)`}><image href={base} width="1416" height="1111" preserveAspectRatio="none" /></g>
          <g mask={`url(#${id}-base)`}>{image}</g>
        </g>
        <g className="artist-motion-fallback">{image}</g>
      </> : image}
    </svg>
    <canvas ref={canvas} className="artist-particles" aria-hidden="true" style={{ opacity: interactive ? 1 : 0, pointerEvents: interactive ? 'auto' : 'none' }} />
  </div>;
}
