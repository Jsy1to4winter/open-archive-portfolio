import type { AccountVideo } from './account-media';

export const MAX_VIDEO_GROUPS = 4;
export const VIDEOS_PER_GROUP = 10;
export const MAX_GROUPED_VIDEOS = MAX_VIDEO_GROUPS * VIDEOS_PER_GROUP;
export type AccountVideoGroup = { id: string; title: string; videos: AccountVideo[] };
export const defaultAccountVideoGroups: AccountVideoGroup[] = [
  { id: 'story', title: '剧情类赛道视频', videos: [] },
  { id: 'ai-drama', title: 'AI漫剧类赛道视频', videos: [] },
  { id: 'life', title: '生活类赛道视频', videos: [] },
  { id: 'pets', title: '萌宠赛道视频', videos: [] },
];

export function normalizeAccountVideoGroups(value: unknown): unknown {
  if (value === undefined) return structuredClone(defaultAccountVideoGroups);
  const oldIds = ['pets', 'life', 'ai-drama'];
  if (Array.isArray(value) && value.length === 3 && oldIds.every(id => value.filter(group => group?.id === id).length === 1)) {
    // Match stable IDs so renamed tracks keep their names, videos and ordering within each track.
    return defaultAccountVideoGroups.map(group => value.find(previous => previous.id === group.id) ?? structuredClone(group));
  }
  return value;
}
