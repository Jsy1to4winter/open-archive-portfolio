import type { CSSProperties } from 'react';
import type { GalleryNotesLayout } from './galleryNotesLayout';
import { screenText } from './content';

export default function GalleryNotes({ layout }: { layout: GalleryNotesLayout }) {
  if (layout.level === 'hidden') return null;
  const rectStyle = (rect: GalleryNotesLayout['left']): CSSProperties => ({
    left: rect.left, top: rect.top, width: rect.width, height: rect.height,
    '--note-width': `${rect.width}px`,
  } as CSSProperties);
  const screenHeight = layout.left.height / layout.fontUnit;
  const tight = screenHeight < 320;
  const headingSize = Math.min(layout.headingSize,
    layout.level === 'full' && tight ? 30 : layout.level === 'compact' && screenHeight < 160 ? 22 : layout.headingSize,
  );

  return (
    <div className="archive-gallery-notes" data-density={layout.level} data-tight={tight} aria-hidden="true" style={{
      opacity: layout.opacity,
      '--note-unit': layout.fontUnit,
      '--note-heading': `${headingSize}px`,
    } as CSSProperties}>
      <div className="archive-gallery-note archive-gallery-note-left" style={rectStyle(layout.left)}>
        <span className="archive-gallery-note-label">{layout.level === 'minimal' ? '05' : 'ARCHIVE / 05'}</span>
        <h2>{layout.level === 'minimal' ? <span data-edit-path="screenText.gallery.minimalTitle">{screenText.gallery.minimalTitle}</span> : <><span data-edit-path="screenText.gallery.titleLine1">{screenText.gallery.titleLine1}</span><br /><em data-edit-path="screenText.gallery.titleLine2">{screenText.gallery.titleLine2}</em></>}</h2>
        {layout.level === 'full' && <div className="archive-gallery-note-copy">
          <p data-edit-path="screenText.gallery.bodyLine1">{screenText.gallery.bodyLine1}</p>
          <p data-edit-path="screenText.gallery.bodyLine2">{screenText.gallery.bodyLine2}</p>
        </div>}
        {layout.level === 'compact' && <p className="archive-gallery-note-copy"><span data-edit-path="screenText.gallery.compactLine1">{screenText.gallery.compactLine1}</span><br /><span data-edit-path="screenText.gallery.compactLine2">{screenText.gallery.compactLine2}</span></p>}
        {layout.level === 'full' && <span data-edit-path="screenText.gallery.footer" className="archive-gallery-note-foot">{screenText.gallery.footer}</span>}
      </div>
    </div>
  );
}
