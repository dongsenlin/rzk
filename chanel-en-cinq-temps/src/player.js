/* EN CINQ TEMPS - player
 * The picture is slaved to the audio clock: film time is read from the
 * AudioContext, so every cut lands on the beat you hear.
 *
 * URL: ?t=12.5 (open paused at a time)  ?guides=1  ?hud=0  ?credit=Name
 *      ?synth=1 (compose the score live instead of the embedded render)
 *      ?mode=still (tools: no UI, exposes FILM.still / FILM.sheet)
 * Keys: space play/pause, <- -> frame, shift+<- -> beat, up/down bar,
 *       0-6 chapters, G grid, H hud, M mute, F fullscreen, L loop
 */
(function () {
  'use strict';
  const K = window.CINQ;
  const FILM = window.FILM;
  const q = new URLSearchParams(location.search);
  const MODE = q.get('mode') || 'player';
  if (q.get('credit')) window.FILM_CREDIT = q.get('credit');

  const canvas = document.getElementById('film');
  const ctx = canvas.getContext('2d');

  window.FILM_READY = K.loadFonts().then(() => {
    if (MODE === 'still') {
      document.documentElement.classList.add('still');
      canvas.width = K.W / 2;
      canvas.height = K.H / 2;
      FILM.render(ctx, parseFloat(q.get('t') || '0'), {});
      return true;
    }
    startPlayer();
    return true;
  });

  // ------------------------------------------------------------ audio --
  let actx = null, buffer = null, source = null, gainNode = null;
  let playing = false, t0 = 0, ctxStart = 0, muted = false, loop = false;
  let audioState = 'idle'; // idle | loading | ready | failed

  function b64ToArrayBuffer(b64) {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8.buffer;
  }
  async function prepareAudio(onStatus) {
    if (buffer || audioState === 'loading') return;
    audioState = 'loading';
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' });
      gainNode = actx.createGain();
      gainNode.connect(actx.destination);
      if (window.SCORE_AUDIO && q.get('synth') !== '1') {
        onStatus('LECTURE DE LA PARTITION');
        buffer = await actx.decodeAudioData(b64ToArrayBuffer(window.SCORE_AUDIO.data));
      } else {
        onStatus('COMPOSITION EN DIRECT — PATIENCE');
        buffer = await window.SCORE.renderScore();
      }
      audioState = 'ready';
    } catch (e) {
      console.error(e);
      audioState = 'failed';
    }
  }
  const latency = () => (actx ? actx.outputLatency || actx.baseLatency || 0 : 0);
  function now() {
    if (!playing) return t0;
    if (!actx || !buffer) return t0 + (performance.now() - ctxStart) / 1000;
    return t0 + (actx.currentTime - ctxStart) - latency();
  }
  function startSource(at) {
    stopSource();
    if (actx && buffer) {
      source = actx.createBufferSource();
      source.buffer = buffer;
      source.connect(gainNode);
      const when = actx.currentTime + 0.03;
      source.start(when, Math.max(0, at));
      ctxStart = when;
    } else {
      ctxStart = performance.now();
    }
    t0 = at;
  }
  function stopSource() {
    if (source) {
      try { source.stop(); } catch (_) {}
      source.disconnect();
      source = null;
    }
  }

  // ------------------------------------------------------------ player --
  let t = 0, guides = q.get('guides') === '1', hud = q.get('hud') !== '0', dirty = true;
  const el = (id) => document.getElementById(id);

  function startPlayer() {
    document.documentElement.classList.add('ready');
    t = clampT(parseFloat(q.get('t') || '0'));
    t0 = t;
    buildTimeline();
    resize();
    window.addEventListener('resize', resize);
    // poster behind the cover: the count-in, dimmed
    if (!q.get('t')) {
      FILM.render(ctx, 5.9, { hud: false });
    } else {
      el('cover').classList.add('hidden');
    }
    el('cover-play').addEventListener('click', () => play());
    el('play').addEventListener('click', () => (playing ? pause() : play()));
    el('guides').addEventListener('click', () => toggleGuides());
    el('mute').addEventListener('click', () => toggleMute());
    el('fs').addEventListener('click', () => toggleFullscreen());
    bindScrub();
    bindKeys();
    bindIdle();
    updateButtons();
    requestAnimationFrame(loopFrame);
  }

  function clampT(x) {
    return Math.max(0, Math.min(K.DURATION - 1 / K.FPS, isFinite(x) ? x : 0));
  }

  async function play() {
    el('cover').classList.add('hidden');
    if (t >= K.DURATION - 0.05) t = 0;
    if (audioState !== 'ready') {
      el('status').textContent = '';
      await prepareAudio((s) => (el('status').textContent = s));
      el('status').textContent = audioState === 'failed' ? 'AUDIO INDISPONIBLE' : '';
    }
    if (actx && actx.state === 'suspended') await actx.resume();
    playing = true;
    startSource(t);
    updateButtons();
  }
  function pause() {
    t = now();
    playing = false;
    stopSource();
    t0 = t;
    dirty = true;
    updateButtons();
  }
  function seek(x) {
    t = clampT(x);
    if (playing) startSource(t);
    else t0 = t;
    dirty = true;
  }
  function toggleGuides() {
    guides = !guides;
    dirty = true;
    updateButtons();
  }
  function toggleMute() {
    muted = !muted;
    if (gainNode) gainNode.gain.setTargetAtTime(muted ? 0 : 1, actx.currentTime, 0.02);
    updateButtons();
  }
  function toggleFullscreen() {
    const d = document;
    if (!d.fullscreenElement) (d.documentElement.requestFullscreen || d.documentElement.webkitRequestFullscreen).call(d.documentElement);
    else (d.exitFullscreen || d.webkitExitFullscreen).call(d);
  }

  function updateButtons() {
    el('play').textContent = playing ? 'PAUSE' : 'LECTURE';
    el('guides').classList.toggle('on', guides);
    el('mute').textContent = muted ? 'SON  —' : 'SON';
    el('loop').classList.toggle('on', loop);
  }

  // canvas backing store follows the displayed size (capped)
  function resize() {
    const box = el('stage').getBoundingClientRect();
    const w = Math.min(box.width, (box.height * 16) / 9);
    const dpr = window.devicePixelRatio || 1;
    const scale = Math.min(1.5, Math.max(0.5, (w * dpr) / K.W));
    canvas.style.width = `${Math.round(w)}px`;
    canvas.style.height = `${Math.round((w * 9) / 16)}px`;
    const pw = Math.round(K.W * scale), ph = Math.round(K.H * scale);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    dirty = true;
  }

  // ------------------------------------------------------- timeline --
  function buildTimeline() {
    const chapters = el('chapters');
    chapters.innerHTML = '';
    const secs = FILM.sections();
    secs.forEach((s, i) => {
      const d = document.createElement('div');
      d.className = 'chapter';
      d.style.left = `${(s.start / K.DURATION) * 100}%`;
      d.style.width = `${((Math.min(s.end, K.DURATION) - s.start) / K.DURATION) * 100}%`;
      d.innerHTML = `<span>${s.label}</span>`;
      d.dataset.i = i;
      chapters.appendChild(d);
    });
    // bar ticks: 32 bars, a taller tick on each movement
    const ticks = el('ticks');
    ticks.innerHTML = '';
    for (let b = 1; b < K.BARS; b++) {
      const d = document.createElement('i');
      d.style.left = `${((b * K.BAR) / K.DURATION) * 100}%`;
      ticks.appendChild(d);
    }
  }
  function bindScrub() {
    const bar = el('bar');
    let drag = false, wasPlaying = false;
    const at = (e) => {
      const r = bar.getBoundingClientRect();
      return ((e.clientX - r.left) / r.width) * K.DURATION;
    };
    bar.addEventListener('pointerdown', (e) => {
      drag = true;
      wasPlaying = playing;
      if (playing) pause();
      bar.setPointerCapture(e.pointerId);
      seek(at(e));
    });
    bar.addEventListener('pointermove', (e) => {
      const x = at(e);
      el('hover').textContent = FILM.timecode(clampT(x));
      el('hover').style.left = `${(clampT(x) / K.DURATION) * 100}%`;
      if (drag) seek(x);
    });
    bar.addEventListener('pointerup', () => {
      drag = false;
      if (wasPlaying) play();
    });
  }
  function bindKeys() {
    window.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      const step = (d) => {
        if (playing) pause();
        seek(Math.round((now() + d) * K.FPS) / K.FPS);
      };
      if (k === ' ' || k === 'k') { e.preventDefault(); playing ? pause() : play(); }
      else if (k === 'ArrowRight') { e.preventDefault(); step(e.shiftKey ? K.BEAT : 1 / K.FPS); }
      else if (k === 'ArrowLeft') { e.preventDefault(); step(e.shiftKey ? -K.BEAT : -1 / K.FPS); }
      else if (k === 'ArrowUp') { e.preventDefault(); seek((Math.floor(now() / K.BAR + 1e-6) + 1) * K.BAR); }
      else if (k === 'ArrowDown') { e.preventDefault(); seek((Math.ceil(now() / K.BAR - 1e-6) - 1) * K.BAR); }
      else if (/^[0-6]$/.test(k)) { const s = FILM.sections()[+k]; if (s) seek(s.start); }
      else if (k === 'g' || k === 'G') toggleGuides();
      else if (k === 'h' || k === 'H') { hud = !hud; dirty = true; }
      else if (k === 'm' || k === 'M') toggleMute();
      else if (k === 'f' || k === 'F') toggleFullscreen();
      else if (k === 'l' || k === 'L') { loop = !loop; updateButtons(); }
      poke();
    });
    el('loop').addEventListener('click', () => { loop = !loop; updateButtons(); });
  }
  let idleTimer = 0;
  function poke() {
    document.documentElement.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (playing) document.documentElement.classList.add('idle'); }, 2600);
  }
  function bindIdle() {
    window.addEventListener('pointermove', poke);
    window.addEventListener('pointerdown', poke);
    poke();
  }

  // ------------------------------------------------------------ frame --
  let lastUI = -1;
  function loopFrame() {
    requestAnimationFrame(loopFrame);
    if (!document.getElementById('cover').classList.contains('hidden')) return;
    if (playing) {
      t = now();
      if (t >= K.DURATION) {
        if (loop) { seek(0); } else { t = K.DURATION - 1 / K.FPS; pause(); }
      }
      dirty = true;
    }
    if (!dirty) return;
    dirty = false;
    FILM.render(ctx, Math.max(0, t), { guides, hud });
    const u = t / K.DURATION;
    el('head').style.left = `${u * 100}%`;
    el('fill').style.width = `${u * 100}%`;
    const fr = Math.floor(t * K.FPS);
    if (fr !== lastUI) {
      lastUI = fr;
      el('tc').textContent = FILM.timecode(t);
      const s = FILM.sceneAt(t);
      el('chap').textContent = s.label;
      const m = K.musical(t);
      el('meter').textContent = `MESURE ${String(m.bar).padStart(2, '0')} · TEMPS ${m.beat}/5`;
      document.querySelectorAll('.chapter').forEach((c) => c.classList.toggle('active', FILM.sections()[+c.dataset.i].id === s.id));
    }
  }
})();
