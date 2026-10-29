import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowUpRight, Mail } from 'lucide-react';
import { contactEmail, contactPhone, portfolioWorks, screenText, templateProfile, titleSizes } from './content';
import type { ArchiveDetail } from './ArchiveDialog';
import type { ModuleId } from './timeline';
import HomepageSticker from './HomepageSticker';
import './mobile-portfolio.css';

const ArchiveDialog = lazy(() => import('./ArchiveDialog'));

export default function MobilePortfolio() {
  const [detail, setDetail] = useState<ArchiveDetail | null>(null);
  const [dialogLoaded, setDialogLoaded] = useState(false);
  const scroller = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const scrollTop = useRef(0);
  useEffect(() => {
    document.body.classList.add('archive-page-open', 'mobile-portfolio-open');
    const title = document.title;
    document.title = templateProfile.pageTitle;
    return () => { document.body.classList.remove('archive-page-open', 'mobile-portfolio-open'); document.title = title; };
  }, []);
  function open(id: ModuleId) {
    opener.current = document.activeElement as HTMLElement | null;
    scrollTop.current = scroller.current?.scrollTop ?? 0;
    setDialogLoaded(true);
    setDetail({ type: 'module', id });
  }
  function close() {
    setDetail(null);
    requestAnimationFrame(() => {
      if (scroller.current) scroller.current.scrollTop = scrollTop.current;
      opener.current?.focus({ preventScroll: true });
    });
  }
  const cards = [
    { id: 'about', title: [screenText.about.titleLine1, screenText.about.titleLine2], copy: screenText.about.description },
    { id: 'fragments', title: [screenText.fragments.title], copy: screenText.fragments.subtitle },
    { id: 'craft', title: [screenText.craft.titleLine1, screenText.craft.titleLine2], copy: screenText.craft.description },
    { id: 'perspective', title: [screenText.perspective.titleLine1, screenText.perspective.titleLine2], copy: screenText.perspective.description },
    { id: 'works', title: [screenText.gallery.titleLine1, screenText.gallery.titleLine2], copy: '' },
    { id: 'collaboration', title: [screenText.collaboration.titleLine1, screenText.collaboration.titleLine2], copy: '' },
  ] as const;
  return <div className="archive-page mobile-portfolio">
    <header className="mobile-header">
      <button type="button" className="mobile-brand" onClick={() => scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })}>{templateProfile.brand}</button>
      <button type="button" aria-label="Say hello" title="Say hello" onClick={() => open('collaboration')}><Mail size={19} /></button>
    </header>
    <main ref={scroller} className="mobile-scroll" id="mobile-top" aria-label="个人作品集" inert={detail !== null}>
      <div className="mobile-modules">
        {cards.map((card, index) => <button key={card.id} type="button" className={`mobile-module mobile-module-${card.id}`} data-module={card.id} onClick={() => open(card.id)} aria-label={card.title.filter(Boolean).join(' ')}>
          <span className="mobile-module-number">{String(index + 1).padStart(2, '0')}</span><ArrowUpRight size={20} className="mobile-module-arrow" aria-hidden="true" />
          <h2 style={{ '--mobile-title-size': `${Math.min(32, titleSizes[card.id === 'works' ? 'gallery' : card.id])}px` } as CSSProperties}>{card.title.map((line, i) => <span key={i}>{line}</span>)}</h2>
          {card.copy && <p>{card.copy}</p>}
          {card.id === 'works' && portfolioWorks[0] && <img src={portfolioWorks[0].thumbnail} alt={portfolioWorks[0].alt} loading="lazy" decoding="async" width="300" height="220" />}
          {card.id === 'collaboration' && <div className="mobile-contact-copy"><span>{contactEmail}</span><span>{contactPhone}</span></div>}
        </button>)}
      </div>
    </main>
    <HomepageSticker visible={!detail} rails />
    {dialogLoaded && <Suspense fallback={detail ? <div className="mobile-detail-loading" role="status">正在打开…</div> : null}>
      <ArchiveDialog detail={detail} onClose={close} onView={id => setDetail({ type: 'work', id })} mobile />
    </Suspense>}
  </div>;
}
