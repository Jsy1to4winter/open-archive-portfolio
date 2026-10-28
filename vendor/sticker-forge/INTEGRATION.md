# Sticker Forge Integration

Source: https://github.com/CatsJuice/sticker-forge
Commit: 068caa49eef69745564a5debbc01bab3fcd31042
License: MIT, retained in LICENSE and licenses/sticker-forge.txt.

Only the runtime renderer and its dependencies are vendored. The original
Three.js geometry, peel shaders, back-face shading and shadow rendering are
used without replacing the user's artwork. Local compatibility changes:

- peel-audio.ts resolves audio-source with a relative import.
- material-preview.ts explicitly supplies its cache-entry generic for TS 5.8.

The application adapter separates gestures at pointer-down: the image edge
controls setPeelProgress without translating the sticker, while its central
handle uses GSAP Draggable without curling. Hovering an edge lifts it slightly;
release or pointer-leave smoothly returns progress to zero. Drag positions,
editor size controls, normalized placement and keyboard movement remain owned
by HomepageSticker. Native sound and native detachment are disabled: only the
existing user-supplied placement sound plays on drop. The original holographic
material stays visible after return. Static HTML/image artwork is retained as
the fallback when WebGL is unavailable or reduced motion is preferred.
Renderer initialization is lazy on hover, press or focus,
and all Three.js resources are disposed when the sticker unmounts.
