export type AccountVideo = {
  id: string;
  title: string;
  src: string;
  poster: string;
};
export const MAX_ACCOUNT_VIDEOS = 10;
export type AccountMedia = {
  image: string;
  alt: string;
  caption: string;
  videos: AccountVideo[];
};
export const defaultAccountMedia: AccountMedia = {
  image: "",
  alt: "白兜兜学姐的小红书账号主页截图",
  caption: "白兜兜学姐",
  videos: [],
};
