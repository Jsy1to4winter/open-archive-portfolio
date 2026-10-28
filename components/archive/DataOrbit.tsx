import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import gsap from 'gsap';
import { portfolioWorks } from './content';
import './data-orbit.css';

type Props = {
  index: number;
  suspended: boolean;
  reducedMotion: boolean;
  onView: (id: string) => void;
  onSeek: (index: number) => void;
  onIndexChange: (index: number) => void;
};

export default function DataOrbit({ index, suspended, reducedMotion, onView, onSeek, onIndexChange }: Props) {
  const [systemReduced, setSystemReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  reducedMotion = reducedMotion || systemReduced;
  const root = useRef<HTMLElement>(null);
  const phase = useRef({ value: index });
  const target = useRef(index);
  const targetVersion = useRef(0);
  const [current, setCurrent] = useState(index);
  const currentRef = useRef(index);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const blocked = useRef(false);
  blocked.current = suspended || paused || hovered || focused || reducedMotion;
  const count = portfolioWorks.length;
  useEffect(() => { onIndexChange(current); }, [current, onIndexChange]);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const cards = [...element.querySelectorAll<HTMLElement>('.data-orbit-card')];
    const setters = cards.map(card => ({
      transform: (value: string) => { card.style.transform = value; },
      opacity: gsap.quickSetter(card, 'opacity'),
      layer: (value: number) => { card.style.zIndex = String(value); },
    }));
    let radius = 0;
    const render = () => {
      setters.forEach((set, i) => {
        const angle = (i - phase.current.value) * 360 / count;
        const depth = Math.cos(angle * Math.PI / 180);
        set.transform(`translate3d(-50%, -50%, ${-radius}px) rotateY(${angle}deg) translateZ(${radius}px)`);
        set.opacity(0.24 + 0.76 * Math.max(0, depth));
        set.layer(Math.round((depth + 1) * 100));
      });
      const next = ((Math.round(phase.current.value) % count) + count) % count;
      if (currentRef.current !== next) {
        currentRef.current = next;
        setCurrent(next);
      }
    };
    const resize = () => {
      const stage = element.querySelector<HTMLElement>('.data-orbit-stage')!;
      const height = Math.max(100, Math.min(390, stage.clientHeight * 0.75, stage.clientWidth * 0.86));
      const ratio = Math.max(...portfolioWorks.map(work => work.width / work.height));
      const width = Math.min(360, height * ratio);
      radius = count > 2 ? (width + 36) / (2 * Math.tan(Math.PI / count)) : width * 0.7;
      element.style.setProperty('--orbit-width', `${width}px`);
      element.style.setProperty('--orbit-height', `${height}px`);
      render();
    };
    let previousVersion = targetVersion.current;
    let settle: gsap.core.Tween | undefined;
    let idleUntil = performance.now() + 1800;
    const tick = (_time: number, delta: number) => {
      if (targetVersion.current !== previousVersion) {
        previousVersion = targetVersion.current;
        settle?.kill();
        const wrapped = ((phase.current.value % count) + count) % count;
        let distance = target.current - wrapped;
        if (distance > count / 2) distance -= count;
        if (distance < -count / 2) distance += count;
        if (reducedMotion) phase.current.value += distance;
        else settle = gsap.to(phase.current, { value: phase.current.value + distance, duration: 0.75, ease: 'power3.inOut' });
        idleUntil = performance.now() + 2500;
      }
      if (!blocked.current && !document.hidden && !settle?.isActive() && performance.now() > idleUntil && count > 1) {
        phase.current.value += Math.min(delta, 50) / 5000;
      }
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    gsap.ticker.add(tick);
    return () => { observer.disconnect(); gsap.ticker.remove(tick); settle?.kill(); };
  }, [count, reducedMotion]);

  useLayoutEffect(() => { target.current = index; targetVersion.current++; }, [index]);

  const move = (direction: number) => {
    const next = (currentRef.current + direction + count) % count;
    target.current = next;
    targetVersion.current++;
    onSeek(next);
  };
  const work = portfolioWorks[current];
  return (
    <section ref={root} className="data-orbit" aria-label="运营数据展示" data-paused={paused || reducedMotion}
      onFocusCapture={event => setFocused(Boolean((event.target as HTMLElement).closest('.data-orbit-card')))} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
      onKeyDown={event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1);
        }
      }}>
      <header className="archive-gallery-header"><span className="archive-gallery-counter">{String(current + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}</span></header>
      <div className="data-orbit-stage">
        {portfolioWorks.map((item, i) => (
          <button key={item.id} className="data-orbit-card archive-gallery-slide" type="button"
            onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }} onPointerLeave={event => { if (event.pointerType === 'mouse') setHovered(false); }}
            aria-label={`View ${item.title}`} aria-current={i === current ? 'true' : undefined}
            onClick={() => onView(item.id)}>
            <img src={item.image} alt={item.alt} width={item.width} height={item.height} decoding="async" />
          </button>
        ))}
      </div>
      <div className="data-orbit-caption">
        <strong>{work.title}</strong>
        <span>{work.caption}</span>
      </div>
      <footer className="data-orbit-controls">
        <button className="archive-gallery-prev" type="button" aria-label="Previous image" title="上一张" onClick={() => move(-1)} disabled={count < 2}><ChevronLeft size={18} /></button>
        {!reducedMotion && <button type="button" aria-label={paused ? 'Resume rotation' : 'Pause rotation'} title={paused ? '继续旋转' : '暂停旋转'} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play size={16} /> : <Pause size={16} />}</button>}
        <button className="archive-gallery-next" type="button" aria-label="Next image" title="下一张" onClick={() => move(1)} disabled={count < 2}><ChevronRight size={18} /></button>
      </footer>
    </section>
  );
}
