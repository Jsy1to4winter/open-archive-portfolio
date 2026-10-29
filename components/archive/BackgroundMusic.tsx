import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { hasAudioFocus, holdAudioFocus, subscribeAudioFocus } from './audio-focus';
import './background-music.css';

export default function BackgroundMusic() {
  const media = useRef<HTMLAudioElement>(null);
  const enabled = useRef(true);
  const sync = useRef(() => {});
  const [wanted, setWanted] = useState(true);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const audio = media.current!;
    audio.volume = 0.3;
    let disposed = false;
    const update = () => {
      if (disposed) return;
      if (!enabled.current || hasAudioFocus() || document.hidden) audio.pause();
      else if (audio.paused) void audio.play().then(() => {
        if (disposed || !enabled.current || hasAudioFocus() || document.hidden) audio.pause();
      }).catch(() => {});
    };
    sync.current = update;
    const releases = new Map<HTMLMediaElement, () => void>();
    const scan = () => {
      const elements = new Set(document.querySelectorAll<HTMLMediaElement>('audio,video'));
      for (const [element, release] of releases) {
        if (!elements.has(element) || element.paused || element.ended || element.muted || !element.volume) { if (!elements.has(element)) element.pause(); releases.delete(element); release(); }
      }
      for (const element of elements) {
        if (element !== audio && !element.paused && !element.ended && !element.muted && element.volume && !releases.has(element)) releases.set(element, holdAudioFocus());
      }
    };
    const unsubscribe = subscribeAudioFocus(update);
    const events = ['play', 'pause', 'ended', 'volumechange', 'emptied'];
    events.forEach(name => document.addEventListener(name, scan, true));
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    const interaction = (event: Event) => { if (!(event.target instanceof Element && event.target.closest('.portfolio-music-toggle'))) update(); };
    document.addEventListener('pointerdown', interaction, true);
    document.addEventListener('keydown', interaction, true);
    document.addEventListener('visibilitychange', update);
    scan(); update();
    return () => {
      disposed = true;
      sync.current = () => {};
      unsubscribe(); observer.disconnect();
      events.forEach(name => document.removeEventListener(name, scan, true));
      document.removeEventListener('pointerdown', interaction, true);
      document.removeEventListener('keydown', interaction, true);
      document.removeEventListener('visibilitychange', update);
      releases.forEach(release => release());
      audio.pause();
    };
  }, []);
  const canPause = wanted && (playing || hasAudioFocus());
  return <>
    <audio ref={media} data-background-music src={`${import.meta.env.BASE_URL}assets/portfolio-background.mp3`} loop preload="metadata" onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)} />
    <button type="button" className="portfolio-music-toggle" aria-label={canPause ? '暂停背景音乐' : '播放背景音乐'} title={canPause ? (playing ? '暂停背景音乐' : '背景音乐已暂停，作品播放结束后续播') : '播放背景音乐'} aria-pressed={wanted} onClick={() => { enabled.current = !canPause; setWanted(enabled.current); sync.current(); }}>
      {playing ? <Volume2 size={16} /> : <VolumeX size={16} />}
    </button>
  </>;
}
