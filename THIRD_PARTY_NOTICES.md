# Third-party notices

The project license applies to the template's original code and placeholder SVGs. Third-party software and fonts retain their own licenses and copyright notices.

## Computer-screen video

The homepage sticker placement sound is a 0.22-second excerpt from the user's supplied reference recording, trimmed and faded for use after a drag ends. It is user-provided media, not part of the template's MIT-licensed assets.

The computer-screen video is an original work by KAKI (kakizzzzz), released with this template under its MIT license. Its extracted poster is covered by the same license. The web version removes the source's blank black tail, is cropped to the screen and compressed as H.264, and forms a roughly 40-second forward-and-reverse loop without repeating the endpoint frames. Color is retained in the media; a single GPU pass provides the monochrome appearance and a diffuse color reveal around the pointer, with native monochrome playback as the fallback. No third-party stock video is included.

## Runtime software

| Component | License text |
| --- | --- |
| React | [MIT — Meta Platforms](licenses/react.txt) |
| React DOM | [MIT — Meta Platforms](licenses/react-dom.txt) |
| Scheduler | [MIT — Meta Platforms](licenses/scheduler.txt) |
| Framer Motion | [MIT — Framer B.V.](licenses/framer-motion.txt) |
| GSAP / ScrollTrigger | [GSAP Standard License — Copyright 2008–2025, GreenSock](https://gsap.com/standard-license) |
| MP4Box.js | [BSD-3-Clause — GPAC contributors](licenses/mp4box.txt) |
| Motion DOM | [MIT — Motion B.V.](licenses/motion-dom.txt) |
| Motion Utils | [MIT — Motion B.V.](licenses/motion-utils.txt) |
| Lucide React / Feather | [ISC and MIT — complete original notices](licenses/lucide-react.txt) |
| tslib | [0BSD — Microsoft](licenses/tslib.txt) |
| Vite's module-preload runtime | [MIT and bundled third-party notices](licenses/vite.txt) |

The local license files linked above are included unmodified in the source repository and deployed static site. GSAP's standard license is linked separately; its original source license headers are retained. Dependency versions are pinned in package-lock.json. Development dependencies also carry their own licenses in their installed packages.

## Fonts

These fonts are licensed separately under SIL Open Font License 1.1. Their original license files are distributed with the font assets:

- [Inter](public/assets/template/fonts/inter-OFL.txt): Copyright 2016 The Inter Project Authors.
- [Space Grotesk](public/assets/template/fonts/space-grotesk-OFL.txt): Copyright 2020 The Space Grotesk Project Authors.
- [IBM Plex Mono](public/assets/template/fonts/ibm-plex-mono-OFL.txt): Copyright 2017 IBM Corp.; reserved font name Plex.

On the deployed site, the same font notices are available under assets/template/fonts/.

## Short poetry excerpts

The credited notes contain short excerpts from Walt Whitman's A Clear Midnight, William Blake's Auguries of Innocence, and Emily Dickinson's Hope is the thing with feathers. Author and source links remain beside these notes and in the README. These underlying poems are identified as public domain by the cited sources; they are not claimed as original template text or relicensed as such.

## Browser Video Conversion

The optional, lazily loaded converter uses [@ffmpeg/ffmpeg 0.12.15](https://www.npmjs.com/package/@ffmpeg/ffmpeg/v/0.12.15) ([MIT](licenses/ffmpeg-wasm.txt)) and the unmodified [@ffmpeg/core 0.12.10](https://www.npmjs.com/package/@ffmpeg/core/v/0.12.10) single-threaded WASM build (GPL-2.0-or-later). The core is a separate worker program, not included in the site's MIT license. Corresponding source and build recipes: [ffmpeg.wasm core v0.12.10](https://github.com/ffmpegwasm/ffmpeg.wasm/tree/v0.12.10), including its Dockerfile and build scripts. License: [GNU GPL v2](https://www.gnu.org/licenses/old-licenses/gpl-2.0.html).
