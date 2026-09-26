// Boot: load fonts, build assets, then either expose renderAt() for frame
// capture (?capture) or run the in-browser preview player.
'use strict';

(async () => {
  const capture = new URLSearchParams(location.search).has('capture');
  document.body.classList.add(capture ? 'capture' : 'player');

  const faces = [
    [`300 28px ${FONT.serif}`, '携'],
    [`400 40px ${FONT.serif}`, '但愿人长久千里共婵娟朔上弦望下农历丙午年八月'],
    [`600 56px ${FONT.serif}`, '祝大家中秋佳节快乐栋森网络科技初一二三四五六七八九十'],
    [`900 60px ${FONT.serif}`, '花好月圓'],
    [`600 54px ${FONT.latin}`, 'Opus 5.5'],
    [`500 18px ${FONT.mono}`, 'MID-AUTUMN FESTIVAL 2026 ILLUMINATION%'],
  ];
  await Promise.all(faces.map(([f, s]) => document.fonts.load(f, s)));
  await document.fonts.ready;

  const cv = document.getElementById('stage');
  const assets = Assets.build();
  Scene.init(cv, assets);
  window.renderAt = t => Scene.renderAt(t);
  window.META = { W, H, FPS, DURATION, assetsMs: assets.buildMs };
  Scene.renderAt(0);
  window.READY = true;
  if (capture) return;

  // ---- preview player
  const play = document.getElementById('play'), scrub = document.getElementById('scrub');
  const time = document.getElementById('time'), music = document.getElementById('music');
  let playing = true, t = 0, last = performance.now();
  const setPlaying = on => {
    playing = on; play.textContent = on ? '❚❚' : '▶';
    if (on) { music.currentTime = t; music.play().catch(() => {}); } else music.pause();
  };
  play.onclick = () => setPlaying(!playing);
  scrub.oninput = () => { t = +scrub.value; if (playing) music.currentTime = t; };
  addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); }
    if (e.code === 'ArrowRight') { setPlaying(false); t = Math.min(DURATION, t + 1 / FPS); }
    if (e.code === 'ArrowLeft') { setPlaying(false); t = Math.max(0, t - 1 / FPS); }
  });
  const loop = now => {
    if (playing) {
      t += (now - last) / 1000;
      if (t >= DURATION) { t = 0; music.currentTime = 0; }
    }
    last = now;
    Scene.renderAt(t);
    scrub.value = t; time.textContent = `${t.toFixed(2)}s`;
    requestAnimationFrame(loop);
  };
  setPlaying(true);
  requestAnimationFrame(loop);
})();
