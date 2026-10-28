import { useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Mousewheel, Keyboard, A11y } from 'swiper/modules';
import type { Swiper as SwiperInstance } from 'swiper';
import { ChevronLeft, ChevronRight, Image } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { aboutPhotos } from './content';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import './about-photos.css';

export default function AboutPhotos() {
  const first = aboutPhotos.length > 2 ? 1 : 0;
  const [index, setIndex] = useState(first);
  const swiper = useRef<SwiperInstance | null>(null);
  const reduced = useReducedMotion();
  if (!aboutPhotos.length) return <section className="about-photo-empty"><Image size={36} strokeWidth={1} /><h3>运营过的账号主页</h3></section>;
  return <section className="about-photo-gallery" aria-label="运营过的账号主页">
    <Swiper modules={[EffectCoverflow, Mousewheel, Keyboard, A11y]} effect="coverflow" centeredSlides slidesPerView="auto" initialSlide={first}
      speed={reduced ? 0 : 650} grabCursor preventInteractionOnTransition keyboard={{ enabled: true, onlyInViewport: true }}
      mousewheel={{ thresholdDelta: 25, releaseOnEdges: true }}
      coverflowEffect={{ rotate: 22, stretch: 25, depth: 160, modifier: 1, slideShadows: false }}
      onSwiper={instance => { swiper.current = instance; }} onSlideChange={instance => setIndex(instance.activeIndex)}>
      {aboutPhotos.map((photo, i) => <SwiperSlide key={photo.id}>
        <button type="button" className="about-photo-select" aria-label={`查看${photo.title || `照片 ${i + 1}`}`} onClick={() => swiper.current?.slideTo(i)}>
          <img src={photo.image} alt={photo.title || `个人照片 ${i + 1}`} draggable={false} decoding="async" />
        </button>
      </SwiperSlide>)}
    </Swiper>
    <div className="about-photo-caption" aria-live="polite"><h3>{aboutPhotos[index]?.title}</h3><p>{aboutPhotos[index]?.caption}</p></div>
    <nav className="about-photo-controls" aria-label="切换运营账号主页">
      <button type="button" aria-label="上一个账号主页" title="上一张" disabled={index === 0} onClick={() => swiper.current?.slidePrev()}><ChevronLeft size={20} /></button>
      <span aria-live="polite">{String(index + 1).padStart(2, '0')} / {String(aboutPhotos.length).padStart(2, '0')}</span>
      <button type="button" aria-label="下一个账号主页" title="下一张" disabled={index === aboutPhotos.length - 1} onClick={() => swiper.current?.slideNext()}><ChevronRight size={20} /></button>
    </nav>
  </section>;
}
