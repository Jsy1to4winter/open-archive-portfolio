import { useEffect, useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, FreeMode, Mousewheel } from 'swiper/modules';
import type { Swiper as SwiperInstance } from 'swiper';
import { ChevronLeft, ChevronRight, Film, Play, X } from 'lucide-react';
import { accountVideoGroups } from './content';
import type { AccountVideoGroup } from './account-video-groups';
import type { AccountVideo } from './account-media';
import { holdAudioFocus } from './audio-focus';
import 'swiper/css';
import 'swiper/css/free-mode';
import './account-video-groups.css';

type Selection = { video: AccountVideo; label: string };

function VideoRow({ group, onOpen }: { group: AccountVideoGroup; onOpen: (selection: Selection, opener: HTMLButtonElement) => void }) {
  const slider = useRef<SwiperInstance | null>(null);
  const [edges, setEdges] = useState({ start: true, end: group.videos.length < 2 });
  const sync = (swiper: SwiperInstance) => setEdges(previous => previous.start === swiper.isBeginning && previous.end === swiper.isEnd ? previous : { start: swiper.isBeginning, end: swiper.isEnd });
  return <section className="account-video-group" aria-label={group.title}>
    <header>
      <h3 data-edit-path={`accountVideoGroups.${accountVideoGroups.indexOf(group)}.title`}>{group.title}</h3>
      <span className="account-group-count">{group.videos.length} / 10</span>
      <div className="account-group-arrows">
        <button type="button" aria-label={`${group.title} 上一页`} title="向左翻看" disabled={edges.start} onClick={() => slider.current?.slidePrev()}><ChevronLeft size={20} /></button>
        <button type="button" aria-label={`${group.title} 下一页`} title="向右翻看" disabled={edges.end} onClick={() => slider.current?.slideNext()}><ChevronRight size={20} /></button>
      </div>
    </header>
    {group.videos.length ? <Swiper modules={[A11y, FreeMode, Mousewheel]} slidesPerView="auto" spaceBetween={16} freeMode={{ enabled: true, sticky: true }} mousewheel={{ forceToAxis: true, releaseOnEdges: true }} grabCursor
      onSwiper={swiper => { slider.current = swiper; sync(swiper); }} onProgress={sync} onResize={sync} onSlideChange={sync}
      onKeyDown={event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault(); event.stopPropagation();
          if (event.key === 'ArrowRight') slider.current?.slideNext(); else slider.current?.slidePrev();
        }
      }}>
      {group.videos.map((video, index) => {
        const label = `${group.title} · 视频 ${String(index + 1).padStart(2, '0')}`;
        return <SwiperSlide key={video.id}>
          <button className="account-group-video" type="button" aria-label={`播放 ${label}`} onClick={event => onOpen({ video, label }, event.currentTarget)}>
            {video.poster ? <img src={video.poster} alt={label} loading="lazy" decoding="async" draggable={false} /> : <Film size={36} aria-hidden="true" />}
            <span className="account-group-play"><Play size={23} fill="currentColor" /></span>
            <span className="account-group-number">{String(index + 1).padStart(2, '0')}</span>
          </button>
        </SwiperSlide>;
      })}
    </Swiper> : <p className="account-group-empty">暂无视频</p>}
  </section>;
}

export default function AccountVideoGroups() {
  const [selected, setSelected] = useState<Selection | null>(null);
  const [error, setError] = useState('');
  const player = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!selected) return;
    const release = holdAudioFocus();
    const media = video.current;
    player.current?.showModal();
    void media?.play().catch(() => {});
    return () => { media?.pause(); release(); };
  }, [selected]);
  const close = () => {
    video.current?.pause();
    if (player.current?.open) player.current.close();
    setSelected(null);
    opener.current?.focus({ preventScroll: true });
  };
  const groups = accountVideoGroups;
  return <div className="account-video-groups">
    {groups.map(group => <VideoRow group={group} key={group.id} onOpen={(selection, element) => { opener.current = element; setError(''); setSelected(selection); }} />)}
    <dialog ref={player} className="group-video-player" aria-label={selected?.label || '赛道视频播放'}
      onCancel={event => { event.preventDefault(); event.stopPropagation(); close(); }}
      onClose={event => { event.stopPropagation(); if (!event.currentTarget.open) close(); }}
      onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <button type="button" className="group-player-close" title="关闭视频" aria-label="关闭赛道视频" onClick={close}><X size={22} /></button>
      {selected && <><video ref={video} src={selected.video.src} poster={selected.video.poster || undefined} controls autoPlay playsInline preload="metadata" onError={() => setError('视频加载失败，请检查网络，或替换为 H.264 编码的 MP4。')} /><p>{selected.label}</p>{error && <p role="alert">{error}</p>}</>}
    </dialog>
  </div>;
}
