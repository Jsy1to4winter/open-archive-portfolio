import type { AccountVideo } from './account-media';

export const MAX_VIDEO_GROUPS = 3;
export const VIDEOS_PER_GROUP = 10;
export const MAX_GROUPED_VIDEOS = MAX_VIDEO_GROUPS * VIDEOS_PER_GROUP;
export type AccountVideoGroup = { id: string; title: string; videos: AccountVideo[] };
export const defaultAccountVideoGroups: AccountVideoGroup[] = [
  { id: 'pets', title: '萌宠赛道视频', videos: [] },
  { id: 'life', title: '生活类赛道视频', videos: [] },
  { id: 'ai-drama', title: 'AI漫剧类赛道视频', videos: [] },
];
