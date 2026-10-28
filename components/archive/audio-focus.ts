const holders = new Set<symbol>();
const listeners = new Set<() => void>();
export const hasAudioFocus = () => holders.size > 0;
export function subscribeAudioFocus(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function holdAudioFocus() {
  const token = Symbol();
  holders.add(token);
  listeners.forEach(listener => listener());
  return () => { if (holders.delete(token)) listeners.forEach(listener => listener()); };
}
