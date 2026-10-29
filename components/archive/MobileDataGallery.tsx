import { useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, Keyboard } from 'swiper/modules';
import type { Swiper as SwiperInstance } from 'swiper';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { portfolioWorks } from './content';
import 'swiper/css';

export default function MobileDataGallery() {
  const swiper = useRef<SwiperInstance | null>(null);
  const [index, setIndex] = useState(0);
  const current = portfolioWorks[index];
  return <section className="mobile-data-gallery" aria-label="运营数据图片轮播">
    <Swiper modules={[A11y, Keyboard]} slidesPerView={1} speed={250} keyboard={{ enabled: true, onlyInViewport: true }} onSwiper={value => { swiper.current = value; }} onSlideChange={value => setIndex(value.activeIndex)}>
      {portfolioWorks.map(item => <SwiperSlide key={item.id}><img src={item.image} alt={item.alt} width={item.width} height={item.height} loading="lazy" decoding="async" /></SwiperSlide>)}
    </Swiper>
    <div className="mobile-data-caption" aria-live="polite"><h3>{current.title}</h3><p>{current.caption}</p></div>
    <nav className="mobile-data-controls" aria-label="切换运营数据图片">
      <button type="button" title="上一张" aria-label="上一张数据图片" disabled={index === 0} onClick={() => swiper.current?.slidePrev()}><ChevronLeft size={20} /></button>
      <span>{index + 1} / {portfolioWorks.length}</span>
      <button type="button" title="下一张" aria-label="下一张数据图片" disabled={index === portfolioWorks.length - 1} onClick={() => swiper.current?.slideNext()}><ChevronRight size={20} /></button>
    </nav>
  </section>;
}
