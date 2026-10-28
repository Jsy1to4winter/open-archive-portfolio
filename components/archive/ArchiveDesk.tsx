import React from 'react';
import { ArrowUpRight, Circle, Box, Pencil } from 'lucide-react';
import { contactEmail, contactPhone, templateProfile, screenText, titleSizes } from './content';
import type { ModuleId } from './timeline';
import { prepareAboutPhotos } from './prepare-about-photos';

type ArchiveDeskProps = {
  onSelect: (id: ModuleId) => void;
  onResume: () => void;
};

function CardArrow() {
  return (
    <span className="archive-desk-card-arrow" aria-hidden="true">
      <ArrowUpRight size={28} />
    </span>
  );
}

export default function ArchiveDesk({ onSelect, onResume }: ArchiveDeskProps) {
  const desk = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const fit = () => {
      desk.current?.querySelectorAll<HTMLElement>('.archive-desk-about-title, .archive-desk-stat, .archive-desk-module-title').forEach(title => {
        title.style.fontSize = '';
        const card = title.closest<HTMLElement>('button')!;
        let high = parseFloat(getComputedStyle(title).fontSize);
        const overflows = () => card.scrollHeight > card.clientHeight + 1 || title.scrollWidth > title.clientWidth + 1;
        if (!overflows()) return;
        let low = 12;
        while (high - low > 1) {
          const size = Math.floor((high + low) / 2);
          title.style.fontSize = `${size}px`;
          if (overflows()) high = size;
          else low = size;
        }
        title.style.fontSize = `${low}px`;
      });
    };
    fit();
    window.addEventListener('resize', fit);
    document.fonts.ready.then(() => { if (desk.current) fit(); });
    return () => window.removeEventListener('resize', fit);
  }, [titleSizes, screenText]);
  return (
    <div ref={desk} className="archive-desk" style={Object.fromEntries(Object.entries(titleSizes).map(([key, size]) => [`--title-${key}`, `${size}px`])) as React.CSSProperties}>
      <div className="archive-desk-module archive-desk-about" data-module="about">
        <button className="archive-desk-about-main" type="button" onPointerEnter={() => void prepareAboutPhotos()} onFocus={() => void prepareAboutPhotos()} onClick={() => onSelect('about')} aria-label="Read about this archive">
          <span className="archive-desk-about-sheet">
            <span className="archive-desk-eyebrow">01 / {templateProfile.brand}</span>
            <strong className="archive-desk-about-title"><span data-edit-path="screenText.about.titleLine1">{screenText.about.titleLine1}</span><br /><span data-edit-path="screenText.about.titleLine2" className="archive-desk-title-accent">{screenText.about.titleLine2}</span></strong>
            <span data-edit-path="screenText.about.description" className="archive-desk-about-description">{screenText.about.description}</span>
            <span className="archive-desk-about-copy"><span data-edit-path="screenText.about.bodyLine1">{screenText.about.bodyLine1}</span><br /><span data-edit-path="screenText.about.bodyLine2">{screenText.about.bodyLine2}</span></span>
          </span>
          <CardArrow />
        </button>
      </div>

      <button type="button" className="archive-desk-module archive-desk-fragments" data-module="fragments" onClick={() => onSelect('fragments')} aria-label="Open collected fragments">
        <span className="archive-desk-eyebrow">02</span>
        <strong data-edit-path="screenText.fragments.title" className="archive-desk-stat">{screenText.fragments.title}</strong>
        <span data-edit-path="screenText.fragments.subtitle" className="archive-desk-stat-label">{screenText.fragments.subtitle}</span>
        <span data-edit-path="screenText.fragments.description" className="archive-desk-fragment-facts">{screenText.fragments.description}</span>
        <CardArrow />
      </button>

      <button type="button" className="archive-desk-module archive-desk-craft" data-module="craft" onClick={() => onSelect('craft')} aria-label="Explore the creative practice">
        <span className="archive-desk-eyebrow">03</span>
        <strong className="archive-desk-module-title"><span data-edit-path="screenText.craft.titleLine1">{screenText.craft.titleLine1}</span><br /><span data-edit-path="screenText.craft.titleLine2">{screenText.craft.titleLine2}</span></strong>
        <span className="archive-desk-craft-marks" aria-hidden="true">
          <Pencil size={34} /><Circle size={34} /><Box size={34} />
        </span>
        <span data-edit-path="screenText.craft.description" className="archive-desk-craft-copy">{screenText.craft.description}</span>
        <span data-edit-path="screenText.craft.note" className="archive-desk-platforms">{screenText.craft.note}</span>
        <CardArrow />
      </button>

      <button type="button" className="archive-desk-module archive-desk-perspective" data-module="perspective" onClick={() => onSelect('perspective')} aria-label="Read notes on perspective">
        <span className="archive-desk-eyebrow">04</span>
        <strong className="archive-desk-module-title"><span data-edit-path="screenText.perspective.titleLine1">{screenText.perspective.titleLine1}</span><br /><span data-edit-path="screenText.perspective.titleLine2">{screenText.perspective.titleLine2}</span></strong>
        <span data-edit-path="screenText.perspective.tag" className="archive-desk-user-tag">{screenText.perspective.tag}</span>
        <span data-edit-path="screenText.perspective.description" className="archive-desk-user-fact">{screenText.perspective.description}</span>
        <CardArrow />
      </button>

      <button type="button" className="archive-desk-module archive-desk-collaboration" data-module="collaboration" onClick={() => onSelect('collaboration')} aria-label="Contact and collaboration">
        <span className="archive-desk-eyebrow">06</span>
        <strong className="archive-desk-module-title"><span data-edit-path="screenText.collaboration.titleLine1">{screenText.collaboration.titleLine1}</span><br /><span data-edit-path="screenText.collaboration.titleLine2">{screenText.collaboration.titleLine2}</span></strong>
        <span className="archive-desk-email"><span>{contactEmail}</span><span>{contactPhone}</span></span>
        <CardArrow />
      </button>
    </div>
  );
}
