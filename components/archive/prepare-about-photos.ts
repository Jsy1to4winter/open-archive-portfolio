import { aboutPhotos } from './content';

const images = new Map<string, Promise<void>>();
export function prepareAboutPhotos() {
  const center = aboutPhotos.length > 2 ? 1 : 0;
  return Promise.all(aboutPhotos.slice(Math.max(0, center - 1), center + 2).map(photo => {
    if (!images.has(photo.image)) {
      const image = new Image();
      image.fetchPriority = 'low';
      image.decoding = 'async';
      image.src = photo.image;
      const ready = image.decode().catch(() => { images.delete(photo.image); });
      images.set(photo.image, ready);
    }
    return images.get(photo.image);
  }));
}
