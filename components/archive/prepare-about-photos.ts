import { aboutPhotos, templateProfile } from './content';

const images = new Map<string, Promise<void>>();
export function prepareAboutPhotos() {
  const center = aboutPhotos.length > 2 ? 1 : 0;
  const sources = aboutPhotos.slice(Math.max(0, center - 1), center + 2).map(photo => photo.image);
  if (templateProfile.image) sources.push(templateProfile.image);
  if (templateProfile.image.endsWith('/artist-portrait.png')) sources.push(templateProfile.image.replace(/artist-portrait\.png$/, 'artist-portrait-base.png'));
  return Promise.all(sources.map(source => {
    if (!images.has(source)) {
      const image = new Image();
      image.fetchPriority = 'low';
      image.decoding = 'async';
      image.src = source;
      const ready = image.decode().catch(() => { images.delete(source); });
      images.set(source, ready);
    }
    return images.get(source);
  }));
}
