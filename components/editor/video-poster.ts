async function checkMp4(buffer: ArrayBuffer) {
  const { createFile, MP4BoxBuffer } = await import("mp4box");
  await new Promise<void>((resolve, reject) => {
    const parser = createFile();
    let done = false;
    const finish = (error?: Error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      parser.stop();
      if (error) reject(error);
      else resolve();
    };
    const timer = window.setTimeout(
      () => finish(new Error("未能读取视频编码，请使用 H.264 编码的 MP4。")),
      5000,
    );
    parser.onError = () =>
      finish(new Error("MP4 文件无法读取，请重新导出视频。"));
    parser.onReady = (info) => {
      if (!info.videoTracks.length) {
        finish(new Error("此文件不包含视频画面。"));
        return;
      }
      if (info.videoTracks.some((track) => /^(hvc1|hev1)/i.test(track.codec))) {
        finish(
          new Error(
            "此视频使用 HEVC/H.265 编码，部分浏览器无法播放。请转为 H.264 编码的 MP4 后上传。",
          ),
        );
        return;
      }
      if (info.videoTracks.some((track) => !/^avc[13]/i.test(track.codec))) {
        finish(new Error("为兼容手机和电脑，请使用 H.264 编码的 MP4。"));
        return;
      }
      finish();
    };
    try {
      parser.appendBuffer(MP4BoxBuffer.fromArrayBuffer(buffer, 0));
      parser.flush();
    } catch {
      finish(new Error("MP4 文件无法读取，请重新导出视频。"));
    }
  });
}
export async function videoPoster(
  url: string,
  mp4Buffer?: ArrayBuffer,
): Promise<Blob | null> {
  if (mp4Buffer) await checkMp4(mp4Buffer);
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    let finished = false;
    const finish = (blob: Blob | null, error?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      video.onloadeddata = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
      if (error) reject(error);
      else resolve(blob);
    };
    const timer = window.setTimeout(
      () =>
        finish(
          null,
          new Error("未能读取视频画面，请重新导出为 H.264 MP4 后上传。"),
        ),
      10000,
    );
    video.onerror = () =>
      finish(
        null,
        new Error(
          "浏览器无法解码此视频，请使用 H.264 MP4 或兼容的 WebM 视频。",
        ),
      );
    video.onloadeddata = () => {
      if (!video.videoWidth || !video.videoHeight) {
        finish(null, new Error("未能读取视频尺寸，请重新导出视频。"));
        return;
      }
      const scale = Math.min(
        1,
        480 / video.videoWidth,
        640 / video.videoHeight,
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const context = canvas.getContext("2d");
      if (!context) {
        finish(null);
        return;
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => finish(blob), "image/jpeg", 0.86);
    };
    video.src = url;
  });
}
