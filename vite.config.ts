import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "./",
  plugins: [react()],
  optimizeDeps: { exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/core"] },
  server: { host: "127.0.0.1" },
  build: { target: "es2022", sourcemap: false, rollupOptions: { output: { manualChunks: { swiper: ['swiper/react', 'swiper/modules'], three: ['three'] } } } },
});
