let context: AudioContext | undefined;
let buffer: AudioBuffer | undefined;
let loading: Promise<void> | undefined;
let source: AudioBufferSourceNode | undefined;

export function prepareStickerSound() {
  context ??= new AudioContext();
  if (!loading) loading = fetch(`${import.meta.env.BASE_URL}assets/sticker-place-v2.wav`)
    .then(response => { if (!response.ok) throw new Error('Sound unavailable'); return response.arrayBuffer(); })
    .then(bytes => context!.decodeAudioData(bytes))
    .then(decoded => { buffer = decoded; })
    .catch(() => { loading = undefined; });
  return loading;
}
export function stopStickerSound() {
  source?.stop();
  source = undefined;
}
export function unlockStickerSound() {
  prepareStickerSound();
  void context!.resume().catch(() => {});
  stopStickerSound();
}
export function playStickerSound() {
  if (!context || !buffer || context.state !== 'running') return;
  stopStickerSound();
  source = context.createBufferSource();
  source.buffer = buffer;
  const gain = context.createGain();
  gain.gain.value = 0.8;
  source.connect(gain).connect(context.destination);
  const playing = source;
  playing.onended = () => { playing.disconnect(); gain.disconnect(); if (source === playing) source = undefined; };
  playing.start();
}
