import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import type { Reason } from './content';

export default function ReasonEntry({ reason, animated, large, editPath, children }: { reason: Reason; animated: boolean; large: boolean; editPath?: string; children?: ReactNode }) {
  const text = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  function reveal() {
    if (!text.current || !animated || reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(text.current, { x: 36, opacity: 0 }, { x: 0, opacity: 1, duration: 0.65, ease: 'power3.out', overwrite: true });
  }
  useEffect(() => {
    const element = text.current;
    if (!animated || reduced || !element) return;
    gsap.set(element, { x: 36, opacity: 0 });
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        reveal();
        observer.disconnect();
      }
    }, { root: element.closest('.archive-archive-dialog'), threshold: 0.05 });
    observer.observe(element);
    return () => { observer.disconnect(); gsap.killTweensOf(element); gsap.set(element, { clearProps: 'transform,opacity' }); };
  }, [animated, reduced]);
  return <article className={`archive-detail-reason${animated ? ' archive-reason-interactive' : ''}`}>
    <span>{reason.id}</span>
    <div ref={text} role={animated ? 'button' : undefined} tabIndex={animated ? 0 : undefined}
      aria-label={animated ? reason.title : undefined}
      aria-describedby={animated ? `reason-copy-${reason.id}` : undefined}
      onClick={animated ? event => { if (!(event.target as Element).closest('a') && !window.getSelection()?.toString()) reveal(); } : undefined}
      onKeyDown={animated ? event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); reveal(); } } : undefined}>
      <h3 data-edit-path={editPath ? `${editPath}.title` : undefined}>{reason.title}</h3>
      <p data-edit-path={editPath ? `${editPath}.body` : undefined} id={`reason-copy-${reason.id}`} className={large ? 'archive-about-copy' : reason.author ? 'archive-poem' : undefined}>{reason.body}</p>
      {reason.author && <a className="archive-poem-credit" href={reason.source} target="_blank" rel="noopener noreferrer">— {reason.author} <ArrowUpRight size={12} aria-hidden="true" /></a>}
      {children}
    </div>
  </article>;
}
