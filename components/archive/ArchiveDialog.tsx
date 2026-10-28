import { useLayoutEffect, useRef, lazy, Suspense } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, X, Pencil } from 'lucide-react';
import { contactEmail, contactPhone, otherPortfolioUrl, portfolioWorks, reasons, screenText } from './content';
import AccountShowcase from './AccountShowcase';
import { portfolioModules } from './modules';
import type { ModuleId } from './timeline';
import ResumeDetails from './ResumeDetails';
import ReasonEntry from './ReasonEntry';
import './about-photos.css';
const AboutPhotos = lazy(() => import('./AboutPhotos'));

export type ArchiveDetail =
  | { type: 'module'; id: ModuleId }
  | { type: 'work'; id: string }
  | { type: 'resume' };

type ArchiveDialogProps = {
  detail: ArchiveDetail | null;
  onClose: () => void;
  onView: (id: string) => void;
};

export default function ArchiveDialog({ detail, onClose, onView }: ArchiveDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const module = detail?.type === 'module' ? portfolioModules.find(item => item.id === detail.id) : undefined;
  const workIndex = detail?.type === 'work' ? portfolioWorks.findIndex(work => work.id === detail.id) : -1;
  const work = portfolioWorks[workIndex];
  const selectedReasons = module?.id === 'about' ? reasons : reasons.filter(reason => module?.reasonIds.includes(reason.id));
  const isResume = detail?.type === 'resume';

  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (detail && !element.open) {
      element.showModal();
      closeButton.current?.focus({ preventScroll: true });
    }
    if (!detail && element.open) element.close();
    element.scrollTop = 0;
  }, [detail]);

  const requestClose = () => {
    // Close the native top layer before the parent restores focus and scrolling.
    if (dialog.current?.open) dialog.current.close();
    onClose();
  };

  return (
    <dialog
      ref={dialog}
      className={`archive-archive-dialog${module?.id === 'about' ? ' archive-about-dialog' : ''}${isResume ? ' archive-resume-dialog' : ''}${work ? ' archive-image-dialog' : ''}${module?.id === 'fragments' ? ' archive-account-dialog' : ''}`}
      onClose={event => { if (!event.currentTarget.open) onClose(); }}
      onCancel={event => { event.preventDefault(); requestClose(); }}
      onClick={event => { if (event.target === event.currentTarget) requestClose(); }}
      aria-labelledby={isResume ? undefined : 'archive-detail-title'}
      aria-label={isResume ? 'Profile' : undefined}
    >
      {detail && <div className="archive-detail-paper">
        <button className="portfolio-edit-trigger" type="button" aria-label="编辑作品集" title="编辑作品集" onClick={() => window.dispatchEvent(new Event('portfolio-open-editor'))}><Pencil size={14}/></button>
        <button ref={closeButton} type="button" className="archive-detail-close" onClick={requestClose} aria-label="Close details"><X size={20} /></button>
        {isResume ? <ResumeDetails /> : <h2 id="archive-detail-title">{work?.title || (module?.id === 'about' ? '关于我' : module?.id === 'fragments' ? screenText.fragments.title : module?.id === 'perspective' ? screenText.perspective.titleLine1 : module?.label)}</h2>}
        {module?.id === 'fragments' && <AccountShowcase/>}
        {module?.id === 'about' && <><Suspense fallback={<div className="about-photo-empty" role="status">加载中…</div>}><AboutPhotos /></Suspense><section className="about-photo-introduction" aria-label="关于我介绍">{reasons.slice(0, 2).map(reason => <ReasonEntry key={reason.id} reason={reason} animated={false} large />)}</section></>}
        {module && module.id !== 'fragments' && module.id !== 'about' && selectedReasons.map(reason => <ReasonEntry key={`${module.id}-${reason.id}`} reason={reason} animated={module.id === 'perspective'} large={module.id === 'perspective'} />)}
        {module?.id === 'works' && <div className="archive-detail-works">
          {portfolioWorks.map(item => <article key={item.id}>
            <button className="archive-detail-work-button" type="button" onClick={() => onView(item.id)} aria-label={`View ${item.title}`}>
              <img src={item.thumbnail} alt={item.alt} loading="lazy" decoding="async" />
            </button>
            <h3>{item.title}</h3>
          </article>)}
        </div>}
        {work && <>
          <figure className="archive-lightbox">
            <div className="archive-lightbox-image">
              <img src={work.image} alt={work.alt} width={work.width} height={work.height} decoding="async" />
            </div>
            <figcaption>{work.caption}</figcaption>
          </figure>
          <nav className="archive-lightbox-actions" aria-label="Browse enlarged images">
            <button type="button" disabled={workIndex === 0} onClick={() => onView(portfolioWorks[workIndex - 1].id)}><ChevronLeft size={17} />Previous</button>
            <span>{workIndex + 1} / {portfolioWorks.length}</span>
            <button type="button" disabled={workIndex === portfolioWorks.length - 1} onClick={() => onView(portfolioWorks[workIndex + 1].id)}>Next<ChevronRight size={17} /></button>
          </nav>
        </>}
        {module?.id === 'collaboration' && <div>
          <a className="archive-detail-contact" href={`mailto:${contactEmail}`}>{contactEmail}<ArrowUpRight size={18} /></a>
          <a className="archive-detail-contact" href={`tel:${contactPhone}`}>{contactPhone}<ArrowUpRight size={18} /></a>
        </div>}
        {module?.id === 'works' && <a className="archive-detail-other-works" href={otherPortfolioUrl} target="_blank" rel="noopener noreferrer">Elsewhere<ArrowUpRight size={15} /></a>}
      </div>}
    </dialog>
  );
}
