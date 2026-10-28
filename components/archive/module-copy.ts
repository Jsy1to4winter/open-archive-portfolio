import type { Reason } from './default-content';
export function splitModuleCopy(reasons: Reason[]) {
  const pick = (ids: string[]) => structuredClone(reasons.filter(reason => ids.includes(reason.id)));
  return { about: structuredClone(reasons.slice(0, 2)), craft: pick(['02', '04', '05']), perspective: structuredClone(reasons), collaboration: pick(['06']) };
}
