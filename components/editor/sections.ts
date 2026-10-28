import type { SiteContent } from '../archive/content';
export const sections = ['about', 'fragments', 'craft', 'perspective', 'works', 'collaboration', 'intro', 'stickers'] as const;
export type EditorSection = typeof sections[number];
export function sectionTitle(data: SiteContent, section: EditorSection) {
  const text = data.screenText;
  const join = (first: string, second: string) => `${first} ${second}`.trim();
  return ({ intro: '展示页', about: join(text.about.titleLine1, text.about.titleLine2), fragments: text.fragments.title, craft: join(text.craft.titleLine1, text.craft.titleLine2), perspective: join(text.perspective.titleLine1, text.perspective.titleLine2), works: join(text.gallery.titleLine1, text.gallery.titleLine2), collaboration: join(text.collaboration.titleLine1, text.collaboration.titleLine2), profile: data.templateProfile.name, stickers: '贴纸' })[section];
}
export function sectionForPath(path: Array<string | number>): EditorSection | null {
  const root = String(path[0]);
  if (root === 'titleSizes') return path[1] === 'gallery' ? 'works' : String(path[1]) as EditorSection;
  if (root === 'introMedia' || (root === 'templateProfile' && ['brand', 'discipline'].includes(String(path[1])))) return 'intro';
  if (root === 'screenText') return ({ intro: 'intro', about: 'about', fragments: 'fragments', craft: 'craft', perspective: 'perspective', gallery: 'works', collaboration: 'collaboration', profile: 'about' } as Record<string, EditorSection>)[String(path[1])] ?? null;
  if (root === 'moduleCopy') return String(path[1]) as EditorSection;
  return ({ aboutPhotos: 'craft', accountMedia: 'fragments', portfolioWorks: 'works', templateProfile: 'about', contactEmail: 'collaboration', contactPhone: 'collaboration', stickers: 'stickers' } as Record<string, EditorSection>)[root] ?? null;
}
