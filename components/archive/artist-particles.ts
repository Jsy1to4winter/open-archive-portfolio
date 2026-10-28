// Adapted from Da0Mine/text-particleization, commit 7236ba6 (MIT).
// Keep its repulsion/spring/damping model; sample the original ink instead of a system font.
export async function createArtistParticles(canvas: HTMLCanvasElement, src: string, base: string, ready: (active: boolean) => void) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  let disposed = false;
  let raf = 0;
  let visible = true;
  let width = 1;
  let height = 1;
  let last = 0;
  let idle = 0;
  let settleAt = Infinity;
  const mouse = { x: -9999, y: -9999, active: false };
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const image = new Image(); image.src = src;
  const background = new Image(); background.src = base;
  type Particle = { hx: number; hy: number; x: number; y: number; vx: number; vy: number };
  let particles: Particle[] = [];
  let homes: Array<{ x: number; y: number }> = [];
  function stop() { cancelAnimationFrame(raf); raf = 0; last = 0; }
  function wake() { if (!disposed && visible && !document.hidden && !media.matches && !raf) raf = requestAnimationFrame(render); }
  function render(time: number) {
    raf = 0;
    if (disposed || !visible || document.hidden || media.matches) return;
    const delta = last ? Math.min(2, (time - last) / (1000 / 60)) : 1;
    last = time;
    ctx!.clearRect(0, 0, width, height);
    const radius = Math.max(30, Math.min(64, width * .14));
    const dot = Math.max(.55, width / 1416 * 3.1);
    let displacement = 0;
    ctx!.fillStyle = '#ff0000';
    for (const p of particles) {
      if (!mouse.active && time >= settleAt) { p.x = p.hx; p.y = p.hy; p.vx = p.vy = 0; }
      const dx = p.x - mouse.x, dy = p.y - mouse.y;
      const distance = Math.hypot(dx, dy);
      if (mouse.active && distance < radius && distance > .0001) {
        const force = (radius - distance) / radius * 1.1 * delta;
        p.vx += dx / distance * force;
        p.vy += dy / distance * force;
      }
      p.vx = (p.vx + (p.hx - p.x) * .02 * delta) * Math.pow(.86, delta);
      p.vy = (p.vy + (p.hy - p.y) * .02 * delta) * Math.pow(.86, delta);
      p.x += p.vx * delta; p.y += p.vy * delta;
      const movement = Math.hypot(p.x - p.hx, p.y - p.hy);
      displacement = Math.max(displacement, movement);
      ctx!.beginPath(); ctx!.arc(p.x, p.y, dot + Math.min(.5, movement / 60), 0, Math.PI * 2); ctx!.fill();
    }
    canvas.dataset.displacement = displacement.toFixed(3);
    idle = !mouse.active && displacement < .04 ? idle + 1 : 0;
    if (idle < 8) wake();
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width; height = rect.height;
    if (!width || !height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    particles = homes.map(home => { const x = home.x / 1416 * width, y = home.y / 690 * height; return { hx: x, hy: y, x, y, vx: 0, vy: 0 }; });
    canvas.dataset.particles = String(particles.length);
    idle = 0; stop(); wake();
  }
  function move(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left; mouse.y = event.clientY - rect.top; mouse.active = true;
    settleAt = Infinity;
    idle = 0; wake();
  }
  function leave() { mouse.active = false; settleAt = performance.now() + 2500; idle = 0; wake(); }
  function visibility() { if (document.hidden) { leave(); stop(); } else wake(); }
  function preference() { ready(!media.matches); if (media.matches) stop(); else { idle = 0; wake(); } }
  const resizeObserver = new ResizeObserver(resize);
  const intersection = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); if (visible) wake(); else stop(); });
  const cleanup = () => {
    disposed = true; stop(); resizeObserver.disconnect(); intersection.disconnect();
    canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerdown', move);
    canvas.removeEventListener('pointerleave', leave); canvas.removeEventListener('pointerup', leave); canvas.removeEventListener('pointercancel', leave);
    document.removeEventListener('visibilitychange', visibility); media.removeEventListener('change', preference);
    window.removeEventListener('blur', leave);
  };
  try {
    await Promise.all([image.decode(), background.decode()]);
    // Subtract the static red frame from the ink sample so only lettering becomes particles.
    const sample = document.createElement('canvas'); sample.width = 1416; sample.height = 690;
    const context = sample.getContext('2d')!;
    context.drawImage(image, 0, 0, 1416, 1111);
    const ink = context.getImageData(0, 0, 1416, 690).data;
    context.clearRect(0, 0, 1416, 690); context.drawImage(background, 0, 0, 1416, 1111);
    const frame = context.getImageData(0, 0, 1416, 690).data;
    const red = (pixels: Uint8ClampedArray, x: number, y: number) => {
      const i = (y * 1416 + x) * 4;
      return pixels[i + 3] > 90 && pixels[i] > 140 && pixels[i] - pixels[i + 1] > 80 && pixels[i] - pixels[i + 2] > 80;
    };
    for (let y = 0; y < 690; y += 6) for (let x = 0; x < 1416; x += 6) {
      if (!red(ink, x, y)) continue;
      let staticInk = false;
      for (const dy of [-4, 0, 4]) for (const dx of [-4, 0, 4]) {
        if (x + dx >= 0 && x + dx < 1416 && y + dy >= 0 && y + dy < 690 && red(frame, x + dx, y + dy)) staticInk = true;
      }
      if (!staticInk) homes.push({ x, y });
    }
    if (disposed || !homes.length) return cleanup;
    canvas.addEventListener('pointermove', move, { passive: true }); canvas.addEventListener('pointerdown', move, { passive: true });
    canvas.addEventListener('pointerleave', leave); canvas.addEventListener('pointerup', leave); canvas.addEventListener('pointercancel', leave);
    document.addEventListener('visibilitychange', visibility); media.addEventListener('change', preference);
    window.addEventListener('blur', leave);
    resizeObserver.observe(canvas); intersection.observe(canvas);
    resize(); preference();
  } catch { ready(false); }
  return cleanup;
}
