import coreURL from "@ffmpeg/core?url";
import wasmURL from "@ffmpeg/core/wasm?url";

// Single-threaded WASM works on GitHub Pages without cross-origin isolation.
export async function convertVideo(file: File, status: (text: string) => void) {
  status("正在加载视频转换器，首次使用需要下载约 32 MB，请稍候…");
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const ffmpeg = new FFmpeg();
  const timeout = window.setTimeout(() => ffmpeg.terminate(), 180000);
  try {
    await ffmpeg.load({ coreURL, wasmURL });
    status("正在转换为兼容的 MP4… 0%");
    ffmpeg.on("progress", ({ progress }) => {
      status(
        `正在转换为兼容的 MP4… ${Math.min(99, Math.max(0, Math.round(progress * 100)))}%`,
      );
    });
    await ffmpeg.writeFile(
      "input.mp4",
      new Uint8Array(await file.arrayBuffer()),
    );
    const result = await ffmpeg.exec(
      [
        "-i",
        "input.mp4",
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-vf",
        "scale='min(1280,iw)':-2",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "24",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        "output.mp4",
      ],
      150000,
    );
    if (result !== 0) throw new Error("conversion failed");
    const bytes = await ffmpeg.readFile("output.mp4");
    if (typeof bytes === "string") throw new Error("invalid output");
    return new File(
      [bytes as Uint8Array<ArrayBuffer>],
      file.name.replace(/\.[^.]+$/, ".mp4"),
      { type: "video/mp4" },
    );
  } catch {
    throw new Error(
      "视频自动转换未完成。请使用剪映等工具导出 H.264 编码的 MP4 后重试；原有视频和草稿未被替换。",
    );
  } finally {
    clearTimeout(timeout);
    ffmpeg.terminate();
  }
}
