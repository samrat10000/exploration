// Sound kit (SKY_SOUND §4, kit/sound.js): one mixer (compressor → destination, a 3.4 s hall reverb, a 0.68 s echo on the
// melody) and a generative, never-the-same-twice soundtrack: slow pad chords, a soft sine bass, sparse harp arpeggios, a short
// melody on the mood's own voice. Every 4th phrase rests (pad only). Mood changes land on the next 4-bar boundary.
export type Mood = "day" | "golden" | "night" | "rain" | "storm";
interface MoodDef { bpm: number; chords: number[][]; scale: number[]; lead: string; arp: number; bright: number }

const MOODS: Record<Mood, MoodDef> = {
  day: { bpm: 64, chords: [[50, 57, 62, 66, 69], [47, 54, 62, 66, 69], [43, 55, 59, 62, 66], [45, 52, 57, 62, 64]], scale: [62, 64, 66, 69, 71, 74, 76, 78, 81], lead: "harp+flute", arp: 0.42, bright: 0.8 },
  golden: { bpm: 58, chords: [[43, 50, 57, 59, 66], [40, 47, 55, 59, 66], [42, 50, 57, 61, 66], [45, 52, 57, 62, 64]], scale: [62, 64, 66, 69, 71, 74, 76, 78], lead: "flute", arp: 0.3, bright: 0.55 },
  night: { bpm: 52, chords: [[41, 48, 53, 57, 59, 64], [36, 43, 52, 55, 62], [45, 52, 55, 60, 64], [43, 50, 55, 57, 62]], scale: [72, 74, 76, 79, 81, 84, 86, 88], lead: "bell", arp: 0.22, bright: 0.3 },
  rain: { bpm: 54, chords: [[45, 52, 57, 60, 64], [41, 48, 57, 60, 64], [43, 50, 55, 59, 62], [40, 47, 55, 59, 62]], scale: [69, 72, 74, 76, 79, 81], lead: "harp", arp: 0.3, bright: 0.35 },
  storm: { bpm: 46, chords: [[38, 45, 50], [36, 43, 50], [38, 45, 50], [34, 41, 50]], scale: [], lead: "", arp: 0, bright: 0.15 },
};
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export function makeSound(ctx: AudioContext, dest: AudioNode, noiseBuf: AudioBuffer) {
  const out = ctx.createDynamicsCompressor();
  out.threshold.value = -16; out.ratio.value = 3; out.attack.value = 0.01; out.release.value = 0.3; out.connect(dest);
  const ir = ctx.createBuffer(2, Math.floor(ctx.sampleRate * 3.4), ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.8); }
  const rev = ctx.createConvolver(); rev.buffer = ir;
  const revOut = ctx.createGain(); revOut.gain.value = 0.8; rev.connect(revOut); revOut.connect(out);
  const music = ctx.createGain(); music.gain.value = 0; music.connect(out);
  const mSend = ctx.createGain(); mSend.gain.value = 0.7; music.connect(mSend); mSend.connect(rev);
  const echo = ctx.createDelay(1.5); echo.delayTime.value = 0.68;
  const fb = ctx.createGain(); fb.gain.value = 0.33;
  const elp = ctx.createBiquadFilter(); elp.type = "lowpass"; elp.frequency.value = 2400;
  echo.connect(elp); elp.connect(fb); fb.connect(echo); elp.connect(music);
  const sfx = ctx.createGain(); sfx.gain.value = 0.9; sfx.connect(out);
  const sSend = ctx.createGain(); sSend.gain.value = 0.35; sfx.connect(sSend); sSend.connect(rev);

  const env = (g: GainNode, t: number, a: number, peak: number, hold: number, rel: number) => {
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
  };
  const osc = (type: OscillatorType, f: number, t: number, stop: number) => { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(stop); return o; };

  function pad(notes: number[], t: number, dur: number, bright: number) {
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(380 + bright * 700, t); lp.frequency.linearRampToValueAtTime(520 + bright * 900, t + dur * 0.5); lp.Q.value = 0.4; lp.connect(music);
    notes.forEach((m) => {
      const g = ctx.createGain(); env(g, t, 2.6, 0.028, Math.max(0.1, dur - 3.6), 3.4); g.connect(lp);
      [0, 7].forEach((dt) => { const o = osc(dt ? "sawtooth" : "triangle", mtof(m), t, t + dur + 4); o.detune.value = dt; o.connect(g); });
    });
  }
  function bass(m: number, t: number, dur: number) { const g = ctx.createGain(); env(g, t, 0.6, 0.06, dur * 0.5, dur * 0.5); g.connect(music); osc("sine", mtof(m - 12), t, t + dur + 1).connect(g); }
  function harp(m: number, t: number, v = 1) {
    const g = ctx.createGain(); env(g, t, 0.004, 0.05 * v, 0.02, 1.9);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2600; g.connect(lp); lp.connect(music); lp.connect(echo);
    osc("triangle", mtof(m), t, t + 2.2).connect(g);
    const g2 = ctx.createGain(); g2.gain.value = 0.3; g2.connect(g); osc("sine", mtof(m) * 2, t, t + 2.2).connect(g2);
  }
  function bell(m: number, t: number, v = 1) {
    const f = mtof(m), car = osc("sine", f, t, t + 4.5), mod = osc("sine", f * 3.5, t, t + 4.5), mg = ctx.createGain();
    mg.gain.setValueAtTime(f * 2.2, t); mg.gain.exponentialRampToValueAtTime(1, t + 2.5); mod.connect(mg); mg.connect(car.frequency);
    const g = ctx.createGain(); env(g, t, 0.005, 0.045 * v, 0.05, 3.8); car.connect(g); g.connect(music); g.connect(echo);
  }
  function flute(m: number, t: number, dur: number, v = 1) {
    const f = mtof(m), o = osc("sine", f, t, t + dur + 0.6), lfo = osc("sine", 5.2, t, t + dur + 0.6), lg = ctx.createGain();
    lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.006, t + 0.5); lfo.connect(lg); lg.connect(o.frequency);
    const g = ctx.createGain(); env(g, t, 0.14, 0.05 * v, dur, 0.5); o.connect(g);
    const tri = osc("triangle", f, t, t + dur + 0.6), tg = ctx.createGain(); tg.gain.value = 0.12; tri.connect(tg); tg.connect(g);
    const n = ctx.createBufferSource(); n.buffer = noiseBuf; const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f * 2; bp.Q.value = 6;
    const ng = ctx.createGain(); env(ng, t, 0.08, 0.012 * v, dur * 0.6, 0.4); n.connect(bp); bp.connect(ng); ng.connect(music); n.start(t); n.stop(t + dur + 0.6);
    g.connect(music); g.connect(echo);
  }

  let mood: Mood = "day", next: Mood = "day", on = true, beat = 0, nextT = 0, last = 64, phrase = 0, resting = 0, started = false, level = 0.55;
  function schedule() {
    const M = MOODS[mood], bd = 60 / M.bpm / 2; // 8th notes
    while (nextT < ctx.currentTime + 0.4) {
      const t = nextT, bar = Math.floor(beat / 8), inBar = beat % 8;
      if (inBar === 0) {
        if (bar % 4 === 0) { mood = next; phrase++; resting = phrase % 4 === 0 ? 2 : 0; }
        const Mm = MOODS[mood], ch = Mm.chords[bar % Mm.chords.length]; pad(ch, t, bd * 8 + 0.5, Mm.bright); bass(ch[0], t, bd * 8);
      }
      const Mm = MOODS[mood], ch = Mm.chords[bar % Mm.chords.length];
      if (!resting && Mm.arp && Math.random() < Mm.arp * (inBar % 2 ? 0.6 : 1)) harp(ch[1 + Math.floor(Math.random() * (ch.length - 1))] + 12, t, 0.7 + Math.random() * 0.4);
      if (!resting && Mm.scale.length && bar % 2 === 1 && inBar === 0) {
        const n = 3 + Math.floor(Math.random() * 3); let idx = Mm.scale.indexOf(last); if (idx < 0) idx = Math.floor(Mm.scale.length / 2);
        for (let k = 0; k < n; k++) {
          idx = Math.max(0, Math.min(Mm.scale.length - 1, idx + [-2, -1, 1, 1, 2][Math.floor(Math.random() * 5)])); last = Mm.scale[idx];
          const nt = t + k * bd * (1 + (Math.random() < 0.3 ? 1 : 0)), lead = Mm.lead.includes("flute") && Math.random() < 0.6 ? "flute" : Mm.lead.includes("bell") ? "bell" : "harp";
          if (lead === "flute") flute(last, nt, bd * 1.6); else if (lead === "bell") bell(last, nt); else harp(last, nt, 1.1);
        }
      }
      if (inBar === 7 && resting) resting = Math.max(0, resting - 0.25);
      beat++; nextT += bd;
    }
  }
  const timer = setInterval(() => { if (started && on) schedule(); }, 120);
  let duck = 1;
  const apply = (tc: number) => music.gain.setTargetAtTime(on ? level * duck : 0, ctx.currentTime, tc);

  return {
    start() { if (started) return; started = true; nextT = ctx.currentTime + 0.3; apply(2.5); },
    setMood(m: Mood) { next = m; },
    toggleMusic() { on = !on; apply(0.8); if (on) nextT = ctx.currentTime + 0.2; return on; },
    get musicOn() { return on; },
    /** 0..1 music volume from Settings (0.55 is the designed level, about −8 dB under the effects) */
    setLevel(v: number) { level = 0.55 * v; apply(0.3); },
    /** nature wins: music ducks 30% during discovery cards and camera moments */
    setDuck(d: boolean) { const k = d ? 0.7 : 1; if (k !== duck) { duck = k; apply(1.2); } },
    /** the discovery bell arpeggio */
    chime() { const t = ctx.currentTime + 0.05; [76, 79, 83, 88].forEach((m, i) => bell(m, t + i * 0.16, 0.9)); },
    dispose() { clearInterval(timer); },
  };
}
export type Sound = ReturnType<typeof makeSound>;
