/* EN CINQ TEMPS - the score
 * Synthesised with Web Audio into an OfflineAudioContext, so the film and
 * its music come from one timeline and render to one buffer (played back
 * in the player, written to WAV for the export). Deterministic: every
 * random choice comes from a seeded generator.
 *
 * Harmony: the bass holds one pedal per movement - D, E, F, G, A - so the
 * film's five movements spell the five-note motif D E F G A that the
 * count-in plays one per beat. The whole film is one cadence; it resolves
 * to D major (the F becomes F#) on CHANEL.
 */
(function () {
  'use strict';
  const K = window.CINQ;
  const { T } = K;

  const SR = 48000;
  const TAIL = 2.5;
  const LENGTH = K.DURATION + TAIL;

  const SEMI = { C: -9, 'C#': -8, Db: -8, D: -7, 'D#': -6, Eb: -6, E: -5, F: -4, 'F#': -3, Gb: -3, G: -2, 'G#': -1, Ab: -1, A: 0, 'A#': 1, Bb: 1, B: 2 };
  function hz(n) {
    const m = /^([A-G](?:#|b)?)(-?\d)$/.exec(n);
    return 440 * Math.pow(2, (SEMI[m[1]] + (parseInt(m[2], 10) - 4) * 12) / 12);
  }

  // ------------------------------------------------------------ engine --
  function Engine(ctx) {
    const rnd = K.rng(1955);
    const E = { ctx, rnd };

    // shared white noise, 4 s stereo
    const nb = ctx.createBuffer(2, SR * 4, SR);
    for (let c = 0; c < 2; c++) {
      const d = nb.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1;
    }
    E.noiseBuf = nb;

    // impulse responses: exponential noise tails, darkening over time
    function impulse(seconds, decay, bright) {
      const n = Math.floor(SR * seconds);
      const b = ctx.createBuffer(2, n, SR);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        let lp = 0;
        for (let i = 0; i < n; i++) {
          const tt = i / SR;
          const k = Math.min(0.98, bright + tt * 0.35); // one-pole lowpass, closing
          lp = lp * k + (rnd() * 2 - 1) * (1 - k);
          const pre = tt < 0.012 ? 0 : 1;
          d[i] = lp * Math.exp(-tt * decay) * pre * 3.2;
        }
      }
      return b;
    }

    E.master = ctx.createGain();
    E.master.gain.value = 0.72;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 12;
    comp.ratio.value = 2.4;
    comp.attack.value = 0.012;
    comp.release.value = 0.3;
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -4;
    lim.knee.value = 0;
    lim.ratio.value = 20;
    lim.attack.value = 0.002;
    lim.release.value = 0.09;
    // nothing below 30 Hz: the subs stay felt, the rumble goes
    const hp1 = ctx.createBiquadFilter(), hp2 = ctx.createBiquadFilter();
    hp1.type = hp2.type = 'highpass';
    hp1.frequency.value = hp2.frequency.value = 30;
    hp1.Q.value = 0.54;
    hp2.Q.value = 1.31;
    E.master.connect(hp1);
    hp1.connect(hp2);
    hp2.connect(comp);
    comp.connect(lim);
    lim.connect(ctx.destination);

    const hall = ctx.createConvolver();
    hall.buffer = impulse(4.2, 1.35, 0.55);
    E.hall = ctx.createGain();
    E.hall.gain.value = 1;
    const hallOut = ctx.createGain();
    hallOut.gain.value = 0.42;
    E.hall.connect(hall);
    hall.connect(hallOut);
    hallOut.connect(E.master);
    E.hallOut = hallOut;

    const room = ctx.createConvolver();
    room.buffer = impulse(1.1, 5.5, 0.35);
    E.room = ctx.createGain();
    const roomOut = ctx.createGain();
    roomOut.gain.value = 0.5;
    E.room.connect(room);
    room.connect(roomOut);
    roomOut.connect(E.master);
    E.roomOut = roomOut;

    // ping-pong delay, dotted-eighth feel (3 sixteenths)
    const dl = ctx.createDelay(2), dr = ctx.createDelay(2);
    dl.delayTime.value = (K.BEAT * 3) / 4;
    dr.delayTime.value = (K.BEAT * 3) / 4;
    const fb = ctx.createGain();
    fb.gain.value = 0.42;
    const dtone = ctx.createBiquadFilter();
    dtone.type = 'lowpass';
    dtone.frequency.value = 4200;
    const merge = ctx.createChannelMerger(2);
    E.echo = ctx.createGain();
    E.echo.connect(dl);
    dl.connect(dtone);
    dtone.connect(dr);
    dr.connect(fb);
    fb.connect(dl);
    const echoOut = ctx.createGain();
    echoOut.gain.value = 0.5;
    dl.connect(merge, 0, 0);
    dr.connect(merge, 0, 1);
    merge.connect(echoOut);
    echoOut.connect(E.master);
    echoOut.connect(E.hall);
    E.echoOut = echoOut;

    // --- node helpers
    E.gain = (v = 1) => {
      const g = ctx.createGain();
      g.gain.value = v;
      return g;
    };
    E.pan = (p) => {
      const n = ctx.createStereoPanner();
      n.pan.value = Math.max(-1, Math.min(1, p));
      return n;
    };
    // output stage with sends: dry into master, sends to hall/room/echo
    E.out = (node, { pan = 0, dry = 1, hall = 0, room = 0, echo = 0 } = {}) => {
      const p = E.pan(pan);
      node.connect(p);
      if (dry) p.connect(E.gain(dry)).connect(E.master);
      if (hall) p.connect(E.gain(hall)).connect(E.hall);
      if (room) p.connect(E.gain(room)).connect(E.room);
      if (echo) p.connect(E.gain(echo)).connect(E.echo);
      return p;
    };
    E.noise = (t, dur) => {
      const s = ctx.createBufferSource();
      s.buffer = nb;
      const off = rnd() * (4 - dur - 0.1);
      s.start(t, Math.max(0, off), dur + 0.05);
      return s;
    };
    E.osc = (type, f, t, dur) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.start(t);
      o.stop(t + dur + 0.05);
      return o;
    };
    E.filter = (type, f, q = 0.7) => {
      const b = ctx.createBiquadFilter();
      b.type = type;
      b.frequency.value = f;
      b.Q.value = q;
      return b;
    };
    // percussive envelope: instant-ish attack, exponential decay
    E.perc = (g, t, peak, decay, attack = 0.001) => {
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + attack);
      g.gain.setTargetAtTime(0, t + attack, decay / 4.6);
    };

    // Karplus-Strong plucks, cached per pitch/brightness
    const ks = new Map();
    E.ksBuffer = (f, bright = 0.5, seconds = 2.2, damp = 0.996) => {
      const key = f.toFixed(2) + '|' + bright + '|' + damp;
      if (ks.has(key)) return ks.get(key);
      const n = Math.floor(SR * seconds);
      const b = ctx.createBuffer(1, n, SR);
      const d = b.getChannelData(0);
      const P = Math.max(2, Math.round(SR / f));
      const r2 = K.rng(Math.round(f * 100));
      let lp = 0;
      for (let i = 0; i < P; i++) {
        lp = lp * (1 - bright) + (r2() * 2 - 1) * bright;
        d[i] = lp;
      }
      for (let i = P; i < n; i++) d[i] = damp * 0.5 * (d[i - P] + d[i - P - 1 < 0 ? 0 : i - P - 1]);
      // fade the last 50 ms
      for (let i = n - 2400; i < n; i++) d[i] *= (n - i) / 2400;
      ks.set(key, b);
      return b;
    };
    return E;
  }

  // ------------------------------------------------------- instruments --
  function Instruments(E) {
    const { ctx, rnd } = E;
    const I = {};

    I.kick = (t, amp = 0.8) => {
      const o = E.osc('sine', 120, t, 0.6);
      o.frequency.setValueAtTime(128, t);
      o.frequency.exponentialRampToValueAtTime(44, t + 0.1);
      const g = E.gain(0);
      E.perc(g, t, amp, 0.42, 0.002);
      o.connect(g);
      E.out(g, { hall: 0.04 });
      const n = E.noise(t, 0.02);
      const hp = E.filter('highpass', 2500);
      const gn = E.gain(0);
      E.perc(gn, t, amp * 0.12, 0.008);
      n.connect(hp).connect(gn);
      E.out(gn);
    };

    I.sub = (t, f, dur, amp = 0.45, attack = 0.02) => {
      const o = E.osc('sine', f, t, dur + 1.2);
      const o2 = E.osc('sine', f * 2, t, dur + 1.2);
      const g = E.gain(0), g2 = E.gain(0.18);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp, t + attack);
      g.gain.setValueAtTime(amp, t + dur);
      g.gain.setTargetAtTime(0, t + dur, 0.25);
      o.connect(g);
      o2.connect(g2).connect(g);
      E.out(g);
    };

    // a stiletto on a hard floor
    I.heel = (t, amp = 0.26, pan = 0) => {
      const n = E.noise(t, 0.06);
      const bp = E.filter('bandpass', 3100 + rnd() * 400, 2.4);
      const g = E.gain(0);
      E.perc(g, t, amp, 0.028);
      n.connect(bp).connect(g);
      const o = E.osc('sine', 1850 + rnd() * 120, t, 0.05);
      const go = E.gain(0);
      E.perc(go, t, amp * 0.28, 0.018);
      o.connect(go);
      const th = E.osc('sine', 230, t, 0.08);
      th.frequency.setValueAtTime(240, t);
      th.frequency.exponentialRampToValueAtTime(150, t + 0.05);
      const gt = E.gain(0);
      E.perc(gt, t, amp * 0.55, 0.045);
      th.connect(gt);
      const sum = E.gain(1);
      g.connect(sum);
      go.connect(sum);
      gt.connect(sum);
      E.out(sum, { pan, room: 0.55, hall: 0.12 });
    };

    I.hat = (t, amp = 0.045, pan = 0, open = false) => {
      const n = E.noise(t, open ? 0.2 : 0.05);
      const hp = E.filter('highpass', 7600);
      const g = E.gain(0);
      E.perc(g, t, amp, open ? 0.13 : 0.028);
      n.connect(hp).connect(g);
      E.out(g, { pan, hall: 0.08 });
    };

    I.tick = (t, amp = 0.05, f = 5200, pan = 0) => {
      const o = E.osc('sine', f, t, 0.03);
      const g = E.gain(0);
      E.perc(g, t, amp, 0.008);
      o.connect(g);
      E.out(g, { pan, hall: 0.1 });
    };

    // FM bell: modulator brightness decays faster than the tone
    I.bell = (t, f, amp = 0.18, { dur = 2.6, ratio = 3.5, index = 2.2, pan = 0, hall = 0.45, echo = 0 } = {}) => {
      const car = E.osc('sine', f, t, dur + 0.2);
      const mod = E.osc('sine', f * ratio, t, dur + 0.2);
      const mg = E.gain(0);
      mg.gain.setValueAtTime(index * f * ratio, t);
      mg.gain.setTargetAtTime(index * f * ratio * 0.08, t, dur * 0.12);
      mod.connect(mg).connect(car.frequency);
      const g = E.gain(0);
      E.perc(g, t, amp, dur, 0.004);
      car.connect(g);
      const st = E.osc('sine', f * 2.756, t, dur * 0.35);
      const gs = E.gain(0);
      E.perc(gs, t, amp * 0.1, dur * 0.25, 0.002);
      st.connect(gs).connect(g);
      E.out(g, { pan, hall, echo });
    };

    // crystal: cut glass, inharmonic partials
    I.glass = (t, f, amp = 0.1, pan = 0, dur = 1.8) => {
      const parts = [[1, 1], [2.32, 0.5], [4.25, 0.28], [6.63, 0.12]];
      const sum = E.gain(1);
      for (const [r, a] of parts) {
        const o = E.osc('sine', f * r, t, dur);
        const g = E.gain(0);
        E.perc(g, t, amp * a, dur / (1 + r * 0.6), 0.002);
        o.connect(g).connect(sum);
      }
      E.out(sum, { pan, hall: 0.6, echo: 0.12 });
    };

    I.pluck = (t, f, amp = 0.12, { pan = 0, bright = 0.55, hall = 0.4, echo = 0, damp = 0.996 } = {}) => {
      const s = ctx.createBufferSource();
      s.buffer = E.ksBuffer(f, bright, 2.0, damp);
      s.start(t);
      const g = E.gain(amp);
      s.connect(g);
      E.out(g, { pan, hall, echo });
    };

    // Pad: detuned saws through a lowpass, slow in, slow out.
    I.pad = (t0, t1, notes, amp = 0.2, { cutoff = 1400, attack = 0.7, release = 1.4, detune = 9, cutEnd = null } = {}) => {
      const per = amp / Math.sqrt(notes.length) / 2.2;
      notes.forEach((n, i) => {
        const f = typeof n === 'number' ? n : hz(n);
        const lp = E.filter('lowpass', cutoff, 0.5);
        const hpf = E.filter('highpass', 110, 0.6);
        if (cutEnd !== null) {
          lp.frequency.setValueAtTime(cutoff, t0);
          lp.frequency.exponentialRampToValueAtTime(cutEnd, t1);
        }
        const g = E.gain(0);
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(per, t0 + attack);
        g.gain.setValueAtTime(per, t1);
        g.gain.setTargetAtTime(0, t1, release / 4);
        for (const [type, det, a] of [['sawtooth', -detune, 1], ['sawtooth', detune, 1], ['triangle', 0, 0.8]]) {
          const o = E.osc(type, f, t0, t1 - t0 + release + 0.3);
          o.detune.value = det + (rnd() - 0.5) * 3;
          const ga = E.gain(a);
          o.connect(ga).connect(lp);
        }
        lp.connect(hpf).connect(g);
        E.out(g, { pan: (i % 2 ? 1 : -1) * Math.min(0.85, 0.35 + 0.12 * i), dry: 0.7, hall: 0.55 });
      });
    };

    // Bass: sine + filtered triangle, a gentle pedal
    I.bass = (t, f, dur, amp = 0.3) => {
      const o = E.osc('sine', f, t, dur + 0.4);
      const tr = E.osc('triangle', f, t, dur + 0.4);
      const lp = E.filter('lowpass', 380, 0.6);
      const g = E.gain(0);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.012);
      g.gain.setTargetAtTime(amp * 0.18, t + 0.03, 0.22);
      g.gain.setValueAtTime(amp * 0.18, t + dur);
      g.gain.setTargetAtTime(0, t + dur, 0.05);
      o.connect(g);
      tr.connect(E.gain(0.45)).connect(lp).connect(g);
      E.out(g);
    };

    // Filtered-noise gestures
    I.sweep = (t0, dur, f0, f1, amp, { q = 1.2, shape = 'rise', pan = 0, hall = 0.3, type = 'bandpass' } = {}) => {
      const n = E.noise(t0, dur + 0.1);
      const bp = E.filter(type, f0, q);
      bp.frequency.setValueAtTime(f0, t0);
      bp.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
      const g = E.gain(0);
      if (shape === 'rise') {
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(amp, t0 + dur);
        g.gain.setValueAtTime(0, t0 + dur + 0.004);
      } else if (shape === 'swell') {
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(amp, t0 + dur * 0.45);
        g.gain.linearRampToValueAtTime(0, t0 + dur);
      } else {
        g.gain.setValueAtTime(amp, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      }
      n.connect(bp).connect(g);
      E.out(g, { pan, hall });
    };
    // the suck into a downbeat: reversed-reverb feel, cut dead on the beat
    I.reverse = (tEnd, dur, amp = 0.2) => I.sweep(tEnd - dur, dur, 500, 9000, amp, { q: 0.5, type: 'lowpass', shape: 'rise', hall: 0.1 });

    I.snip = (t, amp = 0.14) => {
      for (const [dt, a] of [[0, 1], [0.05, 0.7]]) {
        const n = E.noise(t + dt, 0.05);
        const bp = E.filter('bandpass', 7000, 3);
        bp.frequency.setValueAtTime(7200, t + dt);
        bp.frequency.exponentialRampToValueAtTime(3400, t + dt + 0.035);
        const g = E.gain(0);
        E.perc(g, t + dt, amp * a, 0.035);
        n.connect(bp).connect(g);
        E.out(g, { hall: 0.15 });
      }
    };

    I.shutter = (t, amp = 0.16, pan = 0) => {
      for (const [dt, a, d] of [[0, 1, 0.012], [0.042, 0.8, 0.022]]) {
        const n = E.noise(t + dt, 0.04);
        const hp = E.filter('highpass', 1600);
        const g = E.gain(0);
        E.perc(g, t + dt, amp * a, d);
        n.connect(hp).connect(g);
        E.out(g, { pan, room: 0.3 });
      }
      const o = E.osc('sine', 95, t, 0.05);
      const g = E.gain(0);
      E.perc(g, t, amp * 0.6, 0.02);
      o.connect(g);
      E.out(g, { pan });
    };

    I.stitch = (t, amp = 0.1, pan = 0) => {
      const n = E.noise(t, 0.012);
      const hp = E.filter('highpass', 5200);
      const g = E.gain(0);
      E.perc(g, t, amp, 0.004);
      n.connect(hp).connect(g);
      const o = E.osc('sine', 4100, t, 0.02);
      const go = E.gain(0);
      E.perc(go, t, amp * 0.35, 0.008);
      o.connect(go).connect(g);
      const lo = E.osc('triangle', 640, t, 0.02);
      const gl = E.gain(0);
      E.perc(gl, t, amp * 0.5, 0.01);
      lo.connect(gl).connect(g);
      E.out(g, { pan, room: 0.3 });
    };

    // the machine under the needle: a pulsing low motor
    I.motor = (t0, t1, amp = 0.05) => {
      const o = E.osc('sawtooth', 52, t0, t1 - t0);
      const lp = E.filter('lowpass', 210, 0.8);
      const g = E.gain(0);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(amp, t0 + 0.08);
      g.gain.setValueAtTime(amp, t1 - 0.08);
      g.gain.linearRampToValueAtTime(0, t1);
      const lfo = E.osc('sine', 1 / (K.BEAT / 4), t0, t1 - t0);
      const depth = E.gain(amp * 0.6);
      lfo.connect(depth).connect(g.gain);
      o.connect(lp).connect(g);
      E.out(g, { room: 0.2 });
    };

    I.flip = (t, amp = 0.05, pan = 0) => {
      const n = E.noise(t, 0.01);
      const bp = E.filter('bandpass', 2300 + rnd() * 600, 1.5);
      const g = E.gain(0);
      E.perc(g, t, amp, 0.012);
      n.connect(bp).connect(g);
      const o = E.osc('sine', 1300 + rnd() * 300, t, 0.02);
      const go = E.gain(0);
      E.perc(go, t, amp * 0.3, 0.006);
      o.connect(go).connect(g);
      E.out(g, { pan, room: 0.25 });
    };

    I.jingle = (t, amp = 0.06, n = 10, spread = 0.09, pan = 0) => {
      for (let i = 0; i < n; i++) {
        const tt = t + rnd() * spread;
        const f = 2600 + rnd() * 4600;
        const sum = E.gain(0);
        E.perc(sum, tt, amp * (0.5 + rnd() * 0.5), 0.05 + rnd() * 0.1, 0.001);
        E.osc('sine', f, tt, 0.2).connect(sum);
        E.osc('sine', f * 2.41, tt, 0.12).connect(E.gain(0.4)).connect(sum);
        E.out(sum, { pan: pan + (rnd() - 0.5) * 0.9, hall: 0.25, room: 0.2 });
      }
    };

    I.pencil = (t, dur, amp = 0.05, pan = 0) => {
      const n = E.noise(t, dur + 0.1);
      const bp = E.filter('bandpass', 4600 + rnd() * 900, 1.1);
      const g = E.gain(0);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.015);
      g.gain.setTargetAtTime(0, t + 0.04, dur / 3);
      n.connect(bp).connect(g);
      E.out(g, { pan, room: 0.4 });
    };

    I.whoomp = (t, amp = 0.35) => {
      const o = E.osc('sine', 88, t, 1.6);
      o.frequency.setValueAtTime(88, t);
      o.frequency.exponentialRampToValueAtTime(36, t + 0.7);
      const g = E.gain(0);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.06);
      g.gain.setTargetAtTime(0, t + 0.08, 0.3);
      o.connect(g);
      E.out(g, { hall: 0.1 });
      I.sweep(t, 0.9, 180, 700, amp * 0.25, { q: 0.6, shape: 'swell', type: 'lowpass', hall: 0.3 });
    };

    I.glint = (t, amp = 0.04) => {
      const o = E.osc('sine', 5600, t, 0.8);
      o.frequency.setValueAtTime(5600, t);
      o.frequency.exponentialRampToValueAtTime(8200, t + 0.7);
      const g = E.gain(0);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.2);
      g.gain.linearRampToValueAtTime(0, t + 0.75);
      o.connect(g);
      E.out(g, { hall: 0.6, echo: 0.3 });
    };

    I.pour = (t, f, amp = 0.08) => {
      const o = E.osc('sine', f, t, 0.3);
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 1.7, t + 0.07);
      const g = E.gain(0);
      E.perc(g, t, amp, 0.14, 0.006);
      o.connect(g);
      E.out(g, { hall: 0.35 });
    };

    I.shing = (t, amp = 0.12) => {
      I.bell(t, hz('F6'), amp, { dur: 2.2, ratio: 1.414, index: 3.4, hall: 0.8, echo: 0.2 });
      I.sweep(t - 0.02, 0.9, 6000, 12000, amp * 0.4, { q: 0.7, shape: 'fall', type: 'highpass', hall: 0.6 });
    };

    I.air = (t0, t1, amp = 0.02, f = 900) => {
      const n = E.noise(t0, Math.min(3.9, t1 - t0));
      const lp = E.filter('lowpass', f, 0.5);
      const g = E.gain(0);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(amp, t0 + 0.6);
      g.gain.setValueAtTime(amp, t1 - 0.6);
      g.gain.linearRampToValueAtTime(0, t1);
      n.connect(lp).connect(g);
      E.out(g, { hall: 0.2 });
    };
    return I;
  }

  // --------------------------------------------------------- the score --
  function compose(E, I) {
    const b = (bar, beat = 1, sub = 0) => T(bar, beat, sub);
    const beats = (bar0, bar1, fn) => {
      for (let bar = bar0; bar <= bar1; bar++) for (let k = 1; k <= 5; k++) fn(bar, k, b(bar, k));
    };
    // the walk: heels on every beat, 3+2 accents, left/right feet
    const walk = (bar0, bar1, amp = 0.24, accent = 1.35) =>
      beats(bar0, bar1, (bar, k, t) => I.heel(t, amp * (k === 1 || k === 4 ? accent : 1), (k % 2 ? -0.28 : 0.28)));
    const kicks = (bar0, bar1, amp = 0.6, second = 0.55) => {
      for (let bar = bar0; bar <= bar1; bar++) {
        I.kick(b(bar, 1), amp);
        if (second) I.kick(b(bar, 4), amp * second);
      }
    };
    const hats = (bar0, bar1, amp = 0.035) => beats(bar0, bar1, (bar, k, t) => I.hat(t + K.BEAT / 2, amp * (k === 3 ? 1.4 : 1), k % 2 ? 0.45 : -0.2, k === 5));
    const pedal = (bar0, bar1, note, amp = 0.2) => {
      for (let bar = bar0; bar <= bar1; bar++) {
        I.bass(b(bar, 1), hz(note), K.BEAT * 3 - 0.05, amp);
        I.bass(b(bar, 4), hz(note), K.BEAT * 2 - 0.05, amp * 0.85);
      }
    };

    // ============================================== PROLOGUE, bars 1-3
    I.air(0, b(3), 0.012, 500);
    I.bell(b(1, 2), hz('A5'), 0.12, { dur: 3.2, index: 1.4, hall: 0.7 });
    I.tick(b(1, 2), 0.03, 6200);
    I.sweep(b(1, 4) - 0.05, 0.55, 900, 7000, 0.07, { shape: 'swell', q: 0.9 });
    I.sub(b(1, 4), hz('D2'), 0.8, 0.12, 0.3);
    I.pluck(b(1, 5), hz('D3'), 0.2, { bright: 0.7, hall: 0.5 });
    I.pluck(b(1, 5), hz('A3'), 0.08, { bright: 0.6, hall: 0.5 });
    // title: the chord of the whole film, still minor
    I.pad(b(2, 1), b(3) - 0.1, ['D3', 'A3', 'E4', 'F4', 'A4'], 0.2, { cutoff: 1100, attack: 0.8, release: 0.6 });
    I.sub(b(2, 1), hz('D1') * 2, 1.9, 0.18, 0.4);
    I.reverse(b(3), 0.36, 0.1);
    I.snip(b(3), 0.12);
    // count-in: D E F G A, one per beat
    ['D5', 'E5', 'F5', 'G5', 'A5'].forEach((n, i) => {
      const t = b(3, i + 1);
      I.bell(t, hz(n), 0.13 + i * 0.012, { dur: 1.6, index: 1.8, hall: 0.4, pan: -0.5 + i * 0.25 });
      I.heel(t, 0.2 + i * 0.02, i % 2 ? 0.2 : -0.2);
      I.tick(t, 0.035, i === 0 ? 6400 : 5200);
    });
    I.kick(b(3, 1), 0.45);
    I.reverse(b(4), 0.4, 0.16);

    // ============================================ I. NOIR, bars 4-8  (D)
    I.kick(b(4, 1), 0.9);
    I.sub(b(4, 1), hz('D1'), 1.2, 0.5, 0.005);
    I.snip(b(4, 1), 0.1);
    kicks(4, 8, 0.56);
    walk(4, 8, 0.2);
    hats(5, 8, 0.028);
    pedal(4, 8, 'D2', 0.2);
    I.pad(b(4), b(5), ['D3', 'F3', 'A3', 'C4', 'E4'], 0.18, { cutoff: 900 });
    I.pad(b(5), b(6), ['D3', 'G3', 'A3', 'C4', 'F4'], 0.16, { cutoff: 1000 });
    I.pad(b(6), b(7), ['D3', 'F3', 'A3', 'Bb3', 'D4'], 0.2, { cutoff: 1300 });
    I.pad(b(7), b(8), ['D3', 'A3', 'C4', 'E4', 'F4'], 0.2, { cutoff: 1200 });
    I.pad(b(8), b(9) - 0.2, ['D3', 'A3', 'C4', 'E4', 'G4'], 0.2, { cutoff: 1500 });
    // stamps N, O, R
    [b(4, 2), b(4, 3), b(4, 4)].forEach((t) => I.sub(t, hz('D2'), 0.1, 0.12, 0.003));
    I.bell(b(4, 5), hz('A5'), 0.08, { dur: 1.8 });
    // the plate: paper, five pencil strokes
    I.sweep(b(5, 1), 0.2, 1800, 3600, 0.05, { shape: 'swell', q: 0.8 });
    for (let k = 1; k <= 5; k++) I.pencil(b(5, k), 0.38, 0.045, -0.3 + k * 0.1);
    // ink
    I.whoomp(b(6, 1), 0.38);
    I.bell(b(6, 3), hz('F5'), 0.1, { dur: 2 });
    I.bell(b(6, 4), hz('E5'), 0.1, { dur: 2 });
    I.sweep(b(6, 5), 0.4, 300, 5000, 0.12, { shape: 'rise', q: 1.4 });
    // 1926: press shutters
    for (let k = 1; k <= 4; k++) {
      I.shutter(b(7, k), 0.14, -0.4 + k * 0.2);
      I.tick(b(7, k) + 0.07, 0.03, 7000);
    }
    I.bell(b(7, 5), hz('D5'), 0.08, { dur: 1.5 });
    // digits fall
    I.sweep(b(8, 1), 0.5, 3000, 300, 0.06, { shape: 'fall', q: 1 });
    // the 2 opens, the dive
    I.sweep(b(8, 3), T(9) - b(8, 3), 400, 6000, 0.14, { shape: 'rise', q: 1.2 });
    I.reverse(b(9), 0.5, 0.14);

    // =========================================== II. 2.55, bars 9-13  (E)
    I.kick(b(9, 1), 0.85);
    I.sub(b(9, 1), hz('E1'), 0.9, 0.4, 0.005);
    kicks(9, 12, 0.52);
    walk(11, 12, 0.14);
    hats(9, 12, 0.03);
    pedal(9, 12, 'E2', 0.19);
    I.pad(b(9), b(10), ['E3', 'G3', 'Bb3', 'D4'], 0.15, { cutoff: 900 });
    I.pad(b(10), b(11), ['E3', 'G3', 'C4', 'E4'], 0.18, { cutoff: 1400 });
    I.pad(b(11), b(12), ['E3', 'G3', 'Bb3', 'D4', 'F4'], 0.2, { cutoff: 1300 });
    I.pad(b(12), b(13), ['E3', 'A3', 'C4', 'E4', 'G4'], 0.2, { cutoff: 1500 });
    I.pad(b(13), b(14) - 0.2, ['E3', 'G3', 'Bb3', 'D4', 'F4'], 0.18, { cutoff: 1800 });
    // the quilting machine: one step per sixteenth, two passes
    I.motor(b(9, 1), b(9, 5), 0.05);
    for (let s = 0; s < 8; s++) {
      I.stitch(b(9, 1) + s * (K.BEAT / 4) * 2 + 0.001, 0.11, -0.4 + s * 0.1);
      I.stitch(b(9, 1) + s * (K.BEAT / 4) * 2 + K.BEAT / 4, 0.06, -0.4 + s * 0.1);
      I.stitch(b(9, 3) + s * (K.BEAT / 4) * 2 + 0.001, 0.11, 0.4 - s * 0.1);
      I.stitch(b(9, 3) + s * (K.BEAT / 4) * 2 + K.BEAT / 4, 0.06, 0.4 - s * 0.1);
    }
    // the puff
    I.whoomp(b(9, 5), 0.18);
    // the flip wave: a column every 1/32 note, left to right
    for (let c = 0; c < 22; c++) I.flip(b(10, 1) + c * (K.BEAT / 4) * 0.62, 0.05, -0.9 + c * 0.085);
    I.sweep(b(10, 1), 1.6, 400, 2400, 0.05, { shape: 'swell', q: 0.7 });
    // the chain
    I.sweep(b(11, 1), 0.4, 2400, 500, 0.05, { shape: 'fall' });
    I.jingle(b(11, 2), 0.07, 16, 0.12);
    I.sub(b(11, 2), hz('E2'), 0.2, 0.18, 0.003);
    for (let k = 1; k <= 5; k++) I.jingle(b(11, 2) + k * 0.31, 0.04 * Math.exp(-k * 0.45), 6, 0.05, k % 2 ? 0.3 : -0.3);
    I.bell(b(11, 3), hz('E5'), 0.11, { dur: 2.2 });
    I.bell(b(11, 3, 0.5), hz('G5'), 0.09, { dur: 2.2 });
    // every stitch, a beat: the machine returns under the line
    I.motor(b(12, 1), b(13, 1), 0.035);
    for (let s = 0; s < 20; s++) I.stitch(b(12, 1) + s * (K.BEAT / 4), s % 4 === 0 ? 0.07 : 0.035, (s % 2 ? 0.25 : -0.25));
    // everything falls, the 3 opens
    I.sweep(b(13, 1), 0.6, 3500, 250, 0.07, { shape: 'fall' });
    I.jingle(b(13, 1, 0.8), 0.04, 10, 0.3);
    I.sweep(b(13, 3), T(14) - b(13, 3), 400, 6500, 0.14, { shape: 'rise' });
    I.reverse(b(14), 0.5, 0.14);

    // ================================= III. 31, RUE CAMBON, bars 14-18  (F)
    I.kick(b(14, 1), 0.8);
    I.sub(b(14, 1), hz('F1'), 1, 0.38, 0.005);
    kicks(15, 17, 0.5, 0);
    pedal(14, 17, 'F2', 0.16);
    I.pad(b(14), b(16), ['F3', 'A3', 'C4', 'E4', 'G4'], 0.2, { cutoff: 1600, attack: 1.2 });
    I.pad(b(16), b(17), ['F3', 'A3', 'D4', 'E4', 'A4'], 0.18, { cutoff: 2000 });
    I.pad(b(17), b(19) - 0.2, ['F3', 'Bb3', 'C4', 'E4', 'G4'], 0.2, { cutoff: 1800 });
    // five steps up: F G A Bb C, climbing heels in a stairwell
    ['F4', 'G4', 'A4', 'Bb4', 'C5'].forEach((n, i) => {
      const t = b(14, i + 1);
      I.pluck(t, hz(n), 0.16, { echo: 0.35, hall: 0.5, pan: -0.6 + i * 0.3 });
      I.heel(t + 0.02, 0.16, -0.5 + i * 0.25);
    });
    I.sweep(b(14, 5, 0.5), 0.6, 3000, 9000, 0.03, { shape: 'swell' });
    // the mirror opens
    I.reverse(b(15, 1, 0.3), 0.8, 0.09);
    I.shing(b(15, 1, 0.25), 0.08);
    I.glint(b(15, 2), 0.03);
    // the tunnel: down the mirrors, C Bb A G F
    ['C6', 'Bb5', 'A5', 'G5', 'F5'].forEach((n, i) => {
      const t = b(16, i + 1);
      I.bell(t, hz(n), 0.1, { dur: 1.8, index: 1.2, echo: 0.45, hall: 0.4, pan: i % 2 ? 0.4 : -0.4 });
      I.sweep(t - 0.12, 0.2, 800, 4000, 0.025, { shape: 'swell', q: 0.8 });
    });
    // the C and its reflection
    I.sweep(b(17, 1), 0.9, 600, 2400, 0.04, { shape: 'swell' });
    I.shing(b(17, 3), 0.12);
    I.bell(b(17, 3), hz('F3'), 0.14, { dur: 3, ratio: 2, index: 1.5 });
    I.sub(b(17, 3), hz('F1'), 1.2, 0.3, 0.003);
    // the 4 opens
    I.sweep(b(18, 3), T(19) - b(18, 3), 400, 6500, 0.13, { shape: 'rise' });
    I.reverse(b(19), 0.5, 0.13);

    // ======================================= IV. CAMÉLIA, bars 19-23  (G)
    I.kick(b(19, 1), 0.7);
    I.sub(b(19, 1), hz('G1'), 1.2, 0.34, 0.005);
    pedal(19, 21, 'G2', 0.15);
    I.pad(b(19), b(20), ['G3', 'Bb3', 'D4', 'F4', 'A4'], 0.2, { cutoff: 1200, attack: 1.0 });
    I.pad(b(20), b(21), ['G3', 'Bb3', 'Eb4', 'F4', 'A4'], 0.2, { cutoff: 1300 });
    I.pad(b(21), b(22), ['G3', 'Bb3', 'D4', 'E4', 'A4'], 0.2, { cutoff: 1300 });
    // the air empties: the filter closes as the flower folds
    I.pad(b(22), b(24) - 0.3, ['G3', 'Bb3', 'D4', 'F4'], 0.16, { cutoff: 1300, cutEnd: 260, release: 0.6 });
    // the bloom: one pluck per petal, in the order of the spiral
    const N = 55, GAM = ['G4', 'Bb4', 'C5', 'D5', 'F5', 'G5', 'Bb5', 'C6', 'D6'];
    for (let n = 0; n < N; n++) {
      const t0 = b(19, 1) + Math.pow(n / N, 0.85) * 1.9;
      const note = GAM[Math.floor((n / N) * GAM.length)];
      I.pluck(t0 + 0.03, hz(note), 0.045 + 0.03 * (1 - n / N), { pan: Math.cos(n * 2.39996) * 0.7, bright: 0.45, echo: 0.1, hall: 0.5, damp: 0.994 });
    }
    I.bell(b(20, 1), hz('D5'), 0.08, { dur: 2.4 });
    I.bell(b(21, 1), hz('Bb4'), 0.09, { dur: 2.4 });
    I.bell(b(21, 2), hz('A4'), 0.09, { dur: 2.4 });
    I.tick(b(21, 3), 0.03, 6000);
    I.tick(b(21, 3, 0.25), 0.02, 6000);
    // the fold: the cascade runs backwards, softer
    for (let n = N - 1; n >= 0; n -= 2) {
      const tc = b(22, 1) + Math.pow((N - 1 - n) / N, 0.9) * 1.35;
      const note = GAM[Math.floor((n / N) * GAM.length)];
      I.pluck(tc + 0.2, hz(note), 0.025, { pan: Math.cos(n * 2.39996) * 0.6, bright: 0.3, hall: 0.6, damp: 0.99 });
    }
    I.tick(b(22, 3, 0.5), 0.04, 900);
    I.sweep(b(23, 1), 0.45, 300, 1500, 0.03, { shape: 'swell' });
    I.bell(b(23, 2, 0.3), hz('A4'), 0.1, { dur: 2.2, ratio: 2, index: 1.2 });
    I.sweep(b(23, 3), T(24) - b(23, 3), 400, 7000, 0.15, { shape: 'rise' });
    I.reverse(b(24), 0.5, 0.15);

    // ============================================ V. N°5, bars 24-28  (A)
    I.kick(b(24, 1), 0.9);
    I.sub(b(24, 1), hz('A1'), 1.2, 0.42, 0.005);
    kicks(24, 28, 0.6);
    walk(26, 28, 0.2);
    hats(24, 28, 0.034);
    pedal(24, 28, 'A1', 0.2);
    I.pad(b(24), b(25), ['A2', 'D3', 'E3', 'G3', 'B3'], 0.18, { cutoff: 1100 });
    I.pad(b(25), b(26), ['A2', 'E3', 'G3', 'C#4', 'E4'], 0.2, { cutoff: 1500 });
    I.pad(b(26), b(27), ['A2', 'E3', 'G3', 'C#4', 'F4'], 0.22, { cutoff: 1800 });
    I.pad(b(27), b(28), ['A2', 'E3', 'G3', 'Bb3', 'C#4', 'E4'], 0.24, { cutoff: 2400 });
    I.pad(b(28), b(29) - 0.02, ['A2', 'E3', 'G3', 'C#4', 'E4', 'A4'], 0.26, { cutoff: 3200, release: 0.08 });
    // construction: a glass ping per beat
    ['A5', 'C#6', 'E6', 'A6', 'E6'].forEach((n, i) => I.glass(b(24, i + 1), hz(n), 0.07, -0.4 + i * 0.2));
    // the glass, the sweep of light, the label
    I.sweep(b(25, 1), 1.2, 1500, 9000, 0.04, { shape: 'swell', q: 0.6 });
    I.glint(b(25, 1, 0.5), 0.035);
    I.sweep(b(25, 3), 0.18, 2000, 3500, 0.03, { shape: 'swell' });
    // gold rises: D E F G A again - the count-in, now in gold
    ['D5', 'E5', 'F5', 'G5', 'A5'].forEach((n, i) => {
      const t = b(26, i + 1);
      I.bell(t, hz(n), 0.15, { dur: 2.2, index: 1.6, pan: -0.3 + i * 0.15, hall: 0.5 });
      I.pour(t + 0.02, 380 + i * 60, 0.06);
    });
    // the stopper lifts, the sillage rises
    I.glass(b(27, 1), hz('E7'), 0.08, 0.1, 1.4);
    I.sweep(b(27, 1, 0.3), 2.2, 5000, 11000, 0.03, { shape: 'swell', type: 'highpass', q: 0.5 });
    I.sweep(b(27, 2), T(28) - b(27, 2), 300, 8000, 0.14, { shape: 'rise', q: 0.9 });
    I.bell(b(27, 3), hz('A5'), 0.12, { dur: 2.6, echo: 0.25 });
    I.reverse(b(28), 0.6, 0.16);
    // landing: every particle on the downbeat
    I.kick(b(28, 1), 1);
    I.sub(b(28, 1), hz('A1'), 1.4, 0.5, 0.004);
    ['A4', 'C#5', 'E5', 'G5'].forEach((n, i) => I.bell(b(28, 1), hz(n), 0.09, { dur: 3.2, index: 1.8, pan: -0.45 + i * 0.3 }));
    I.glass(b(28, 1, 0.02), hz('A6'), 0.06);
    // the collapse: everything sucked into the point, then nothing
    I.reverse(b(29), 0.85, 0.2);

    // ============================================ FINALE, bars 29-32  (D)
    // bar 29 is silence: even the room stops ringing, until the thread breathes in
    for (const r of [E.hallOut, E.roomOut, E.echoOut]) {
      const v = r.gain.value;
      r.gain.setValueAtTime(v, b(29, 1) - 0.01);
      r.gain.linearRampToValueAtTime(0, b(29, 1) + 0.06);
      r.gain.setValueAtTime(0, b(29, 4));
      r.gain.linearRampToValueAtTime(v, b(30, 1) - 0.05);
    }
    I.sweep(b(29, 4), T(30) - b(29, 4), 700, 7000, 0.06, { shape: 'rise', type: 'lowpass', q: 0.5 });
    // the resolution: D major, the five notes at once with F now F#
    I.kick(b(30, 1), 0.75);
    I.sub(b(30, 1), hz('D1'), 5.5, 0.42, 0.01);
    I.bass(b(30, 1), hz('D2'), 5.0, 0.26);
    I.pad(b(30, 1), b(32, 3), ['D3', 'A3', 'D4', 'E4', 'F#4', 'A4'], 0.3, { cutoff: 2600, attack: 0.05, release: 2.2 });
    ['D5', 'F#5', 'A5'].forEach((n, i) => I.bell(b(30, 1), hz(n), 0.1, { dur: 4.5, index: 1.4, pan: -0.4 + i * 0.4, hall: 0.7 }));
    // the 4-3 suspension: G resolves to F#
    I.bell(b(30, 1, 0.02), hz('G5'), 0.07, { dur: 1.2, index: 1, hall: 0.6 });
    I.bell(b(30, 3), hz('F#5'), 0.11, { dur: 4, index: 1, hall: 0.7 });
    // Paris
    I.bell(b(31, 1), hz('A5'), 0.07, { dur: 3.5, index: 0.9, hall: 0.8, echo: 0.2 });
    // the end card: one low D, then the room
    I.pluck(b(32, 1), hz('D2'), 0.18, { bright: 0.35, hall: 0.8 });
    I.bell(b(32, 1), hz('D6'), 0.035, { dur: 3, index: 0.6, hall: 0.9 });
  }

  // ---------------------------------------------------------- render --
  async function renderScore() {
    const ctx = new OfflineAudioContext(2, Math.ceil(LENGTH * SR), SR);
    const E = Engine(ctx);
    const I = Instruments(E);
    compose(E, I);
    const buf = await ctx.startRendering();
    // normalise to -1 dBFS and fade the tail
    let peak = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
    }
    const g = peak > 0 ? 0.891 / peak : 1;
    const fade = Math.floor(SR * 0.8);
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] *= g;
      for (let i = d.length - fade; i < d.length; i++) d[i] *= (d.length - i) / fade;
    }
    return buf;
  }

  function encodeWAV(buf) {
    const ch = buf.numberOfChannels, n = buf.length;
    const out = new ArrayBuffer(44 + n * ch * 2);
    const v = new DataView(out);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
    v.setUint32(24, buf.sampleRate, true); v.setUint32(28, buf.sampleRate * ch * 2, true);
    v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * ch * 2, true);
    const data = [];
    for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
    let o = 44;
    // TPDF dither to 16 bit
    const r = K.rng(16);
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < ch; c++) {
        const s = data[c][i] * 32767 + (r() - r());
        v.setInt16(o, Math.max(-32768, Math.min(32767, Math.round(s))), true);
        o += 2;
      }
    }
    return out;
  }

  window.SCORE = { renderScore, encodeWAV, SR, LENGTH, hz };
})();
