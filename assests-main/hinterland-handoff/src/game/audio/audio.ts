// Fully synthesized soundscape (no files): wind that strengthens with altitude, birdsong,
// water by proximity, and an engine that strains uphill and falls silent when you stop.
import { makeSound, type Mood, type Sound } from "./sound";
import { live } from "../../state/live";
import { clamp, smooth } from "../../utils/noise";
import { POOL, riverX, waterLevel } from "../world/height";

interface Volumes { master: number; amb: number; eng: number; music: number }

interface Graph {
  ctx: AudioContext;
  master: GainNode; amb: GainNode; eng: GainNode;
  windG: GainNode; windF: BiquadFilterNode; waterG: GainNode;
  o1: OscillatorNode; o2: OscillatorNode; lp: BiquadFilterNode; eg: GainNode;
  // the Mule: two-stroke putt, rack creak, rattle
  putt: OscillatorNode; puttMod: OscillatorNode; puttG: GainNode; burstG: GainNode;
  creak: OscillatorNode; creakG: GainNode; rattleG: GainNode;
  // places: fog muffles nature; a fire crackles; music is rare
  cricketG: GainNode; surfG: GainNode; surfF: BiquadFilterNode;
  ambLP: BiquadFilterNode; fireG: GainNode; music: GainNode; noiseBuf: AudioBuffer;
  nextCreak: number;
  nextBird: number;
  echo?: { d: DelayNode; out: GainNode };
  snd: Sound;
}

let g: Graph | null = null;

function chirp(a: Graph) {
  const ctx = a.ctx, t0 = ctx.currentTime, gain = ctx.createGain();
  gain.gain.value = 0;
  const pan = ctx.createStereoPanner?.();
  if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; gain.connect(pan); pan.connect(a.amb); } else gain.connect(a.amb);
  const n = 2 + Math.floor(Math.random() * 3), f = 2600 + Math.random() * 1600;
  for (let i = 0; i < n; i++) {
    const o = ctx.createOscillator(), s = t0 + i * 0.13;
    o.type = "sine";
    o.frequency.setValueAtTime(f, s);
    o.frequency.exponentialRampToValueAtTime(f * 1.35, s + 0.07);
    o.connect(gain); o.start(s); o.stop(s + 0.1);
    gain.gain.setValueAtTime(0, s);
    gain.gain.linearRampToValueAtTime(0.035, s + 0.015);
    gain.gain.linearRampToValueAtTime(0, s + 0.09);
  }
}

export const audio = {
  /** Must be called from a user gesture (browsers block audio until then). Safe to call repeatedly. */
  init(v: Volumes) {
    if (g) { if (g.ctx.state === "suspended") void g.ctx.resume(); return; }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const master = ctx.createGain(), amb = ctx.createGain(), eng = ctx.createGain();
    master.gain.value = 0;
    const ambLP = ctx.createBiquadFilter(); ambLP.type = "lowpass"; ambLP.frequency.value = 18000;
    amb.connect(ambLP); ambLP.connect(master); eng.connect(master); master.connect(ctx.destination);
    const music = ctx.createGain(); music.gain.value = 0.9; music.connect(master);

    // brown-ish noise bed, shared by wind and water
    const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), data = buf.getChannelData(0);
    let b = 0;
    for (let i = 0; i < data.length; i++) { const w = Math.random() * 2 - 1; b = (b + 0.02 * w) / 1.02; data[i] = b * 3.5 + w * 0.15; }
    const noise = () => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, Math.random() * 2); return s; };

    const windF = ctx.createBiquadFilter(); windF.type = "lowpass"; windF.frequency.value = 500;
    const windG = ctx.createGain(); windG.gain.value = 0.3;
    noise().connect(windF); windF.connect(windG); windG.connect(amb);

    const bf = ctx.createBiquadFilter(); bf.type = "bandpass"; bf.frequency.value = 1100; bf.Q.value = 0.5;
    const waterG = ctx.createGain(); waterG.gain.value = 0;
    noise().connect(bf); bf.connect(waterG); waterG.connect(amb);

    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), eg = ctx.createGain();
    o1.type = "sawtooth"; o2.type = "triangle"; lp.type = "lowpass"; lp.frequency.value = 300; eg.gain.value = 0;
    o1.connect(lp); o2.connect(lp); lp.connect(eg); eg.connect(eng);
    o1.start(); o2.start();

    // two-stroke putt: a square wave at the firing rate plus a short noise burst on every fire
    const putt = ctx.createOscillator(), pf = ctx.createBiquadFilter(), puttG = ctx.createGain();
    putt.type = "square"; putt.frequency.value = 30; pf.type = "lowpass"; pf.frequency.value = 420; puttG.gain.value = 0;
    putt.connect(pf); pf.connect(puttG); puttG.connect(eng);
    const bbp = ctx.createBiquadFilter(), pulse = ctx.createGain(), burstG = ctx.createGain(), puttMod = ctx.createOscillator(), modDepth = ctx.createGain();
    bbp.type = "bandpass"; bbp.frequency.value = 650; bbp.Q.value = 1.2;
    pulse.gain.value = 0.5; puttMod.type = "square"; puttMod.frequency.value = 30; modDepth.gain.value = 0.5;
    puttMod.connect(modDepth); modDepth.connect(pulse.gain); // 0..1 gate, once per fire
    noise().connect(bbp); bbp.connect(pulse); pulse.connect(burstG); burstG.gain.value = 0; burstG.connect(eng);
    putt.start(); puttMod.start();
    // rack creak (strap strain) and rattle (bumps)
    const creak = ctx.createOscillator(), cbp = ctx.createBiquadFilter(), creakG = ctx.createGain();
    creak.type = "sawtooth"; creak.frequency.value = 210; cbp.type = "bandpass"; cbp.frequency.value = 520; cbp.Q.value = 6; creakG.gain.value = 0;
    creak.connect(cbp); cbp.connect(creakG); creakG.connect(amb); creak.start();
    const rhp = ctx.createBiquadFilter(), rattleG = ctx.createGain();
    rhp.type = "highpass"; rhp.frequency.value = 2400; rattleG.gain.value = 0;
    noise().connect(rhp); rhp.connect(rattleG); rattleG.connect(amb);

    // campfire crackle: bright noise with a jumpy gain
    const fhp = ctx.createBiquadFilter(), fireG = ctx.createGain();
    fhp.type = "bandpass"; fhp.frequency.value = 2600; fhp.Q.value = 0.7; fireG.gain.value = 0;
    noise().connect(fhp); fhp.connect(fireG); fireG.connect(amb);

    const snd = makeSound(ctx, master, buf);
    // night crickets: a high band of noise chopped by a fast LFO; surf: low noise swelling slowly (a 9 s wave)
    const crF = ctx.createBiquadFilter(), cricketG = ctx.createGain(), crLfo = ctx.createOscillator(), crDepth = ctx.createGain();
    crF.type = "bandpass"; crF.frequency.value = 4300; crF.Q.value = 9; cricketG.gain.value = 0;
    crLfo.frequency.value = 23; crDepth.gain.value = 0.5; crLfo.start();
    const crAm = ctx.createGain(); crAm.gain.value = 0.5; crLfo.connect(crDepth); crDepth.connect(crAm.gain); noise().connect(crF); crF.connect(crAm); crAm.connect(cricketG); cricketG.connect(amb);
    const surfF = ctx.createBiquadFilter(), surfG = ctx.createGain(), swell = ctx.createOscillator(), swellD = ctx.createGain();
    surfF.type = "lowpass"; surfF.frequency.value = 700; surfG.gain.value = 0;
    const surfAm = ctx.createGain(); surfAm.gain.value = 0.65; swell.frequency.value = 0.11; swellD.gain.value = 0.35; swell.connect(swellD); swellD.connect(surfAm.gain); swell.start();
    noise().connect(surfF); surfF.connect(surfAm); surfAm.connect(surfG); surfG.connect(amb);
    g = { cricketG, surfG, surfF, snd, ctx, master, amb, eng, windG, windF, waterG, o1, o2, lp, eg, putt, puttMod, puttG, burstG, creak, creakG, rattleG, ambLP, fireG, music, noiseBuf: buf, nextCreak: 0, nextBird: ctx.currentTime + 2 };
    audio.applyVolumes(v);
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.setTargetAtTime(v.master / 100, ctx.currentTime, 1.5); // fade in gently
    snd.start();
  },

  applyVolumes(v: Volumes) {
    if (!g) return;
    const t = g.ctx.currentTime;
    g.master.gain.setTargetAtTime(v.master / 100, t, 0.2);
    g.amb.gain.setTargetAtTime(v.amb / 100, t, 0.2);
    g.eng.gain.setTargetAtTime(v.eng / 100, t, 0.2);
    g.snd.setLevel(v.music / 100);
  },
  /** the generative soundtrack follows the world: time of day, rain, storms */
  setMood(m: Mood) { g?.snd.setMood(m); },
  /** M: music on / off (returns the new state) */
  toggleMusic() { return g ? g.snd.toggleMusic() : false; },
  musicOn() { return g ? g.snd.musicOn : true; },
  duck(on: boolean) { g?.snd.setDuck(on); },
  chime() { g?.snd.chime(); },

  /** the bridge creaks under load */
  creak(level: number) {
    if (!g || level <= 0.05) return;
    const ctx = g.ctx, t = ctx.currentTime;
    if (t < g.nextCreak) return;
    g.nextCreak = t + 0.5 + Math.random() * (1.4 - level);
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), v = ctx.createGain();
    o.type = "sawtooth"; o.frequency.setValueAtTime(130 + Math.random() * 40, t); o.frequency.linearRampToValueAtTime(190 + Math.random() * 60, t + 0.28);
    f.type = "bandpass"; f.frequency.value = 600; f.Q.value = 4;
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(0.05 * level, t + 0.05); v.gain.linearRampToValueAtTime(0, t + 0.3);
    o.connect(f); f.connect(v); v.connect(g.amb); o.start(t); o.stop(t + 0.32);
  },

  /** the Mule's two-tone horn */
  /** A rumble of thunder, 1–3 s after the flash: low filtered noise swelling and rolling off. */
  thunder() {
    if (!g) return;
    const c = g.ctx, t = c.currentTime, src = c.createBufferSource(), f = c.createBiquadFilter(), gain = c.createGain();
    src.buffer = g.noiseBuf; src.loop = true; src.start(0, Math.random() * 2);
    f.type = "lowpass"; f.frequency.value = 180;
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.5, t + 0.25); gain.gain.setTargetAtTime(0, t + 0.5, 1.1);
    src.connect(f); f.connect(gain); gain.connect(g.amb); src.stop(t + 5);
  },
  /** landing thud (FEEL §5): low-passed noise at 160 Hz, louder with the impact */
  /** tyre sounds by surface (FEEL §2): splash in water (noise above 900 Hz), crunch in snow (2.2 kHz, 80 ms), squelch in mud, rumble on stones */
  surface(kind: "water" | "snow" | "mud" | "path", speed: number) {
    if (!g) return;
    const c = g.ctx, t = c.currentTime, src = c.createBufferSource(), f = c.createBiquadFilter(), gain = c.createGain(), k = Math.min(1, speed / 14);
    src.buffer = g.noiseBuf; src.start(0, Math.random() * 2);
    const P = { water: ["highpass", 900, 0.7, 0.2, 0.07], snow: ["bandpass", 2200, 1.2, 0.08, 0.06], mud: ["lowpass", 320, 1.5, 0.16, 0.12], path: ["bandpass", 650, 0.8, 0.07, 0.035] }[kind] as [BiquadFilterType, number, number, number, number];
    f.type = P[0]; f.frequency.value = P[1] * (0.9 + Math.random() * 0.2); f.Q.value = P[2];
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(P[4] * (0.4 + 0.6 * k), t + 0.01); gain.gain.exponentialRampToValueAtTime(0.0005, t + P[3]);
    src.connect(f); f.connect(gain); gain.connect(g.eng); src.stop(t + P[3] + 0.05);
  },
  thud(impact: number) {
    if (!g || impact < 0.05) return;
    const c = g.ctx, t = c.currentTime, src = c.createBufferSource(), f = c.createBiquadFilter(), gain = c.createGain();
    src.buffer = g.noiseBuf; src.loop = true; src.start(0, Math.random() * 2);
    f.type = "lowpass"; f.frequency.value = 160;
    gain.gain.setValueAtTime(Math.min(0.6, impact * 0.12), t); gain.gain.setTargetAtTime(0, t + 0.04, 0.09);
    src.connect(f); f.connect(gain); gain.connect(g.eng); src.stop(t + 0.5);
  },
  /** a rain hiss: high-passed noise, level follows the rain (called twice a second while it rains) */
  rain(level: number) {
    if (!g) return;
    const c = g.ctx, t = c.currentTime, src = c.createBufferSource(), f = c.createBiquadFilter(), gain = c.createGain();
    src.buffer = g.noiseBuf; src.loop = true; src.start(0, Math.random() * 2);
    f.type = "highpass"; f.frequency.value = 2400;
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.05 * level, t + 0.15); gain.gain.linearRampToValueAtTime(0, t + 0.62);
    src.connect(f); f.connect(gain); gain.connect(g.amb); src.stop(t + 0.7);
  },
  /**
   * The horn (WEATHER §4): 370 + 466 Hz square through a 1.9 kHz low-pass, into a 0.62 s echo with 38% feedback
   * off the valley walls (echo = how much wall there is, 0..1). 40% of the time a shepherd's whistle answers 1.7 s later.
   */
  /** a firework burst, `delay` s after the flash (sound travels 343 m/s): a low thump with a short crack on top */
  boom(delay: number, level = 1) {
    if (!g) return;
    const c = g.ctx, t = c.currentTime + Math.min(delay, 4), src = c.createBufferSource(), f = c.createBiquadFilter(), gain = c.createGain();
    src.buffer = g.noiseBuf; src.loop = true; src.start(0, Math.random() * 2);
    f.type = "lowpass"; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(120, t + 0.6);
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.32 * level / (1 + delay * 0.8), t + 0.01); gain.gain.setTargetAtTime(0, t + 0.04, 0.22);
    src.connect(f); f.connect(gain); gain.connect(g.amb); src.stop(t + 1.6);
  },
  /** crackle: n tiny pops spread over ~1 s */
  crackle(delay: number, n: number) {
    if (!g) return;
    const c = g.ctx;
    for (let i = 0; i < n; i++) {
      const t = c.currentTime + Math.min(delay, 5) + Math.random() * 1.0, src = c.createBufferSource(), f = c.createBiquadFilter(), gain = c.createGain();
      src.buffer = g.noiseBuf; src.start(0, Math.random() * 2); f.type = "highpass"; f.frequency.value = 2200;
      gain.gain.setValueAtTime(0.05 / (1 + delay * 0.5), t); gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      src.connect(f); f.connect(gain); gain.connect(g.amb); src.stop(t + 0.07);
    }
  },
  /** a rocket's rising whistle */
  launch(delay: number) {
    if (!g) return;
    const c = g.ctx, t = c.currentTime + delay, o = c.createOscillator(), gain = c.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(700, t); o.frequency.exponentialRampToValueAtTime(2200, t + 1.1);
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.012, t + 0.1); gain.gain.linearRampToValueAtTime(0, t + 1.2);
    o.connect(gain); gain.connect(g.amb); o.start(t); o.stop(t + 1.3);
  },
  /** an owl: two soft low hoots with a breath between */
  hoot() {
    if (!g) return;
    const c = g.ctx, t = c.currentTime;
    for (const [d, a, b] of [[0, 400, 340], [0.55, 380, 300]]) {
      const o = c.createOscillator(), gain = c.createGain(), lp = c.createBiquadFilter();
      o.type = "sine"; o.frequency.setValueAtTime(a, t + d); o.frequency.exponentialRampToValueAtTime(b, t + d + 0.35);
      lp.type = "lowpass"; lp.frequency.value = 900;
      gain.gain.setValueAtTime(0, t + d); gain.gain.linearRampToValueAtTime(0.07, t + d + 0.06); gain.gain.linearRampToValueAtTime(0, t + d + 0.42);
      o.connect(lp); lp.connect(gain); gain.connect(g.amb); o.start(t + d); o.stop(t + d + 0.5);
    }
  },
  horn(echo = 1, pitch = 1) {
    if (!g) return;
    const ctx = g.ctx, t = ctx.currentTime, f = ctx.createBiquadFilter(), v = ctx.createGain();
    if (!g.echo) {
      const d = ctx.createDelay(2), fb = ctx.createGain(), lp = ctx.createBiquadFilter(), out = ctx.createGain();
      d.delayTime.value = 0.62; fb.gain.value = 0.38; lp.type = "lowpass"; lp.frequency.value = 1400; out.gain.value = 0;
      d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(out); out.connect(g.master);
      g.echo = { d, out };
    }
    g.echo.out.gain.value = 0.55 * echo;
    f.type = "lowpass"; f.frequency.value = 1900;
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(0.09, t + 0.03); v.gain.setValueAtTime(0.09, t + 0.45); v.gain.linearRampToValueAtTime(0, t + 0.6);
    v.connect(f); f.connect(g.eng); if (echo > 0) f.connect(g.echo.d);
    for (const hz of [370 * pitch, 466 * pitch]) { const o = ctx.createOscillator(); o.type = "square"; o.frequency.value = hz; o.connect(v); o.start(t); o.stop(t + 0.62); }
    if (echo > 0.3 && Math.random() < 0.4) {
      const whistle = (a: number, b: number, dur: number, at: number) => {
        const o = ctx.createOscillator(), w = ctx.createGain(), s = t + at;
        o.type = "sine"; o.frequency.setValueAtTime(a, s); o.frequency.linearRampToValueAtTime(b, s + dur);
        w.gain.setValueAtTime(0, s); w.gain.linearRampToValueAtTime(0.03, s + 0.05); w.gain.linearRampToValueAtTime(0, s + dur);
        o.connect(w); w.connect(g!.amb); o.start(s); o.stop(s + dur + 0.05);
      };
      whistle(1800, 2500, 0.35, 1.7); whistle(2500, 1700, 0.45, 2.08);
    }
  },

  /** a small bell, placed in the world (you hear it before you see it) */
  bell(x: number, y: number, z: number) {
    if (!g) return;
    const ctx = g.ctx, t = ctx.currentTime, p = ctx.createPanner(), v = ctx.createGain();
    p.panningModel = "HRTF"; p.distanceModel = "inverse"; p.refDistance = 8; p.rolloffFactor = 1.1; p.maxDistance = 400;
    p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z;
    v.connect(p); p.connect(g.master);
    const f0 = 1180 + Math.random() * 120;
    [[1, 0.06], [2.76, 0.03], [5.4, 0.015]].forEach(([k, a]) => {
      const o = ctx.createOscillator(), e = ctx.createGain();
      o.type = "sine"; o.frequency.value = f0 * k;
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(a, t + 0.005); e.gain.exponentialRampToValueAtTime(0.0001, t + 2.2 / k);
      o.connect(e); e.connect(v); o.start(t); o.stop(t + 2.3);
    });
  },

  /** keep the listener where the camera is */
  listener(px: number, py: number, pz: number, fx: number, fy: number, fz: number) {
    if (!g) return;
    const l = g.ctx.listener, t = g.ctx.currentTime;
    if (l.positionX) {
      l.positionX.setTargetAtTime(px, t, 0.05); l.positionY.setTargetAtTime(py, t, 0.05); l.positionZ.setTargetAtTime(pz, t, 0.05);
      l.forwardX.setTargetAtTime(fx, t, 0.05); l.forwardY.setTargetAtTime(fy, t, 0.05); l.forwardZ.setTargetAtTime(fz, t, 0.05);
    } else l.setPosition(px, py, pz);
  },

  /** The first music in the game: a slow, warm pad that arrives and leaves without you noticing. */
  music() {
    if (!g) return;
    const ctx = g.ctx, t = ctx.currentTime, bus = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 1400; bus.gain.value = 0;
    bus.connect(lp); lp.connect(g.music);
    bus.gain.setValueAtTime(0, t); bus.gain.linearRampToValueAtTime(0.07, t + 5); bus.gain.setValueAtTime(0.07, t + 20); bus.gain.linearRampToValueAtTime(0, t + 34);
    // D add9, then G/D, then back: open voicings, slow swells
    const chords = [[146.8, 220, 293.7, 329.6, 370], [146.8, 196, 293.7, 392, 493.9], [146.8, 220, 293.7, 329.6, 440]];
    chords.forEach((ch, ci) => {
      const t0 = t + ci * 10, e = ctx.createGain();
      e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(1, t0 + 4); e.gain.setValueAtTime(1, t0 + 9); e.gain.linearRampToValueAtTime(0, t0 + 15);
      e.connect(bus);
      ch.forEach((hz, k) => {
        const o = ctx.createOscillator(), d = ctx.createOscillator(), og = ctx.createGain();
        o.type = k === 0 ? "sine" : "triangle"; o.frequency.value = hz; d.type = "sine"; d.frequency.value = hz * 1.003;
        og.gain.value = k === 0 ? 0.5 : 0.22;
        o.connect(og); d.connect(og); og.connect(e);
        o.start(t0); d.start(t0); o.stop(t0 + 15.5); d.stop(t0 + 15.5);
      });
    });
  },

  update(playing: boolean) {
    if (!g) return;
    const ctx = g.ctx, t = ctx.currentTime, car = live.car;
    // the soundtrack's mood follows the world; nature wins, so music ducks during cards and camera moments
    const wx = live.wx, stormy = live.flight.storm > 0.5 || wx.dark > 0.5 && wx.rain > 0.8;
    g.snd.setMood(stormy ? "storm" : wx.rain > 0.4 ? "rain" : live.env.stars > 0.5 ? "night" : live.env.tod > 2.6 ? "golden" : "day");
    g.snd.setDuck(!!live.moment || live.ducked);
    const alt = clamp(car.y / 70, 0, 1);
    g.windG.gain.setTargetAtTime(0.22 + alt * 0.45 + (live.flight.on ? Math.min(0.5, Math.abs(car.speed) / 40) : 0) + 0.08 * Math.sin(t * 0.23) + 0.06 * Math.sin(t * 0.71), t, 0.8);
    g.windF.frequency.setTargetAtTime(380 + alt * 500 + 120 * Math.sin(t * 0.4), t, 0.8);
    const valley = live.region === "valley";
    const dPool = valley ? Math.hypot(car.x - POOL.x, car.z - POOL.z) : 999;
    const dRiver = valley && car.z > -84 ? Math.abs(car.x - riverX(car.z)) : 999;
    // crickets after dusk (not in cloud, snow, rain or wind): quietest near the dawn
    const night = live.env.stars * (1 - Math.min(1, live.wx.rain + live.wx.snow)) * (1 - alt) * (1 - live.muffle);
    g.cricketG.gain.setTargetAtTime(0.5 * night * 0.06, t, 1.5);
    // surf where the sea or a lake is near: swells with the wave, stronger on the cliffs and coast
    const sea = ["coast", "light", "lake"].includes(live.region);
    let shore = 0;
    if (sea) for (const [dx, dz] of [[0, 0], [30, 0], [-30, 0], [0, 30], [0, -30], [60, 0], [-60, 0]]) if (waterLevel(car.x + dx, car.z + dz) > -50) shore = Math.max(shore, 1 - Math.hypot(dx, dz) / 90);
    g.surfG.gain.setTargetAtTime((live.region === "lake" ? 0.07 : 0.18) * shore, t, 1.2);
    g.surfF.frequency.setTargetAtTime(500 + 500 * shore, t, 1.2);
    g.waterG.gain.setTargetAtTime(Math.max(0.9 * (1 - smooth(10, 90, dPool)), 0.35 * (1 - smooth(6, 45, dRiver))), t, 0.5);
    if (t > g.nextBird) { if (car.y < 45 && live.muffle < 0.3) chirp(g); g.nextBird = t + 2 + Math.random() * 6; }
    // inside cloud everything goes soft
    g.ambLP.frequency.setTargetAtTime(18000 - live.muffle * 17100, t, 0.6);
    // a campfire close by crackles, louder when you sit
    const crackle = live.fireNear * (0.5 + Math.random() * Math.random() * 2.5) * 0.05;
    g.fireG.gain.setTargetAtTime(crackle, t, 0.03);
    const rpm = 0.2 + Math.min(1, Math.abs(car.speed) / 21) * 0.7 + car.load * 0.25;
    g.o1.frequency.setTargetAtTime(36 + rpm * 72, t, 0.08);
    g.o2.frequency.setTargetAtTime(18 + rpm * 36, t, 0.08);
    g.lp.frequency.setTargetAtTime(220 + rpm * 820, t, 0.1);
    const on = playing && car.still < 4, sky = live.vehicle === "skymule", mule = live.vehicle === "mule" || (sky && live.flight.puffing);
    g.eg.gain.setTargetAtTime(on && !mule && !sky ? 0.05 + rpm * 0.11 : 0, t, on ? 0.15 : 1.2);
    // the Mule putts 28-70 Hz, labours with load, and its rack talks back
    const fire = sky ? 64 : 28 + Math.min(1, Math.abs(car.speed) / 13) * 30 + car.load * 12; // the prop buzzes while you puff
    g.putt.frequency.setTargetAtTime(fire, t, 0.1);
    g.puttMod.frequency.setTargetAtTime(fire, t, 0.1);
    g.puttG.gain.setTargetAtTime(on && mule ? 0.07 + rpm * 0.05 : 0, t, on ? 0.15 : 1.2);
    g.burstG.gain.setTargetAtTime(on && mule ? 0.05 + rpm * 0.05 : 0, t, on ? 0.15 : 1.2);
    const strain = mule ? live.cargo.strain : 0;
    g.creak.frequency.setTargetAtTime(190 + 40 * Math.sin(t * 3.1) + strain * 60, t, 0.05);
    g.creakG.gain.setTargetAtTime(strain * 0.06, t, 0.08);
    g.rattleG.gain.setTargetAtTime(mule ? Math.min(0.035, (Math.abs(car.speed) / 13) * 0.012 * live.cargo.load + Math.abs(live.latAccel) * 0.002) : 0, t, 0.1);
  },
};
