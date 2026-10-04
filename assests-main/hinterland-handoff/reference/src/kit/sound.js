/* ============================================================
   SOUND: master compressor + hall reverb + echo, a generative cozy soundtrack, and shared effects.
   Music: slow pad chords, soft bass, sparse harp arpeggios, and a melody voice that changes with
   the mood (day: harp + flute, golden: flute, night: bells, storm: low drone only).
   Phrases breathe: ~60 s of music, then 15–30 s of just the pad.
   API: const SND = makeSound(ctx, destination); SND.setMood("day"|"golden"|"night"|"storm"|"rain"); SND.toggleMusic();
        SND.boom(delay, size) / launch(delay) / crackle(delay, n) / thunder(delay, power) / chime()
============================================================ */
function makeSound(ctx, dest){
  const out = ctx.createDynamicsCompressor(); out.threshold.value = -16; out.ratio.value = 3; out.attack.value = .01; out.release.value = .3; out.connect(dest);
  const ir = ctx.createBuffer(2, Math.floor(ctx.sampleRate*3.4), ctx.sampleRate);
  for (let c = 0; c < 2; c++){ const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2 - 1)*Math.pow(1 - i/d.length, 2.8); }
  const rev = ctx.createConvolver(); rev.buffer = ir; const revOut = ctx.createGain(); revOut.gain.value = .8; rev.connect(revOut); revOut.connect(out);
  const music = ctx.createGain(); music.gain.value = 0; music.connect(out); const mSend = ctx.createGain(); mSend.gain.value = .7; music.connect(mSend); mSend.connect(rev);
  const echo = ctx.createDelay(1.5); echo.delayTime.value = .68; const fb = ctx.createGain(); fb.gain.value = .33; const elp = ctx.createBiquadFilter(); elp.type = "lowpass"; elp.frequency.value = 2400; echo.connect(elp); elp.connect(fb); fb.connect(echo); elp.connect(music);
  const sfx = ctx.createGain(); sfx.gain.value = .9; sfx.connect(out); const sSend = ctx.createGain(); sSend.gain.value = .35; sfx.connect(sSend); sSend.connect(rev);
  const nb = ctx.createBuffer(1, ctx.sampleRate*2, ctx.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random()*2 - 1;
  const mtof = m => 440*Math.pow(2, (m - 69)/12);
  const env = (g, t, a, peak, hold, rel) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(.0001, t + a + hold + rel); };
  function osc(type, f, t, stop){ const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(stop); return o; }
  // instruments
  function pad(notes, t, dur, bright){
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(380 + bright*700, t); lp.frequency.linearRampToValueAtTime(520 + bright*900, t + dur*.5); lp.Q.value = .4; lp.connect(music);
    notes.forEach(m => { const g = ctx.createGain(); env(g, t, 2.6, .028, Math.max(.1, dur - 3.6), 3.4); g.connect(lp); [0, 7].forEach(dt => { const o = osc(dt ? "sawtooth" : "triangle", mtof(m), t, t + dur + 4); o.detune.value = dt; o.connect(g); }); });
  }
  function bass(m, t, dur){ const g = ctx.createGain(); env(g, t, .6, .06, dur*.5, dur*.5); g.connect(music); osc("sine", mtof(m - 12), t, t + dur + 1).connect(g); }
  function harp(m, t, v = 1){ const g = ctx.createGain(); env(g, t, .004, .05*v, .02, 1.9); const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2600; g.connect(lp); lp.connect(music); lp.connect(echo); osc("triangle", mtof(m), t, t + 2.2).connect(g); const g2 = ctx.createGain(); g2.gain.value = .3; g2.connect(g); osc("sine", mtof(m)*2, t, t + 2.2).connect(g2); }
  function bell(m, t, v = 1){ const f = mtof(m), car = osc("sine", f, t, t + 4.5), mod = osc("sine", f*3.5, t, t + 4.5), mg = ctx.createGain(); mg.gain.setValueAtTime(f*2.2, t); mg.gain.exponentialRampToValueAtTime(1, t + 2.5); mod.connect(mg); mg.connect(car.frequency); const g = ctx.createGain(); env(g, t, .005, .045*v, .05, 3.8); car.connect(g); g.connect(music); g.connect(echo); }
  function flute(m, t, dur, v = 1){ const f = mtof(m), o = osc("sine", f, t, t + dur + .6), lfo = osc("sine", 5.2, t, t + dur + .6), lg = ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f*.006, t + .5); lfo.connect(lg); lg.connect(o.frequency); const g = ctx.createGain(); env(g, t, .14, .05*v, dur, .5); o.connect(g); const tri = osc("triangle", f, t, t + dur + .6), tg = ctx.createGain(); tg.gain.value = .12; tri.connect(tg); tg.connect(g);
    const n = ctx.createBufferSource(); n.buffer = nb; const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f*2; bp.Q.value = 6; const ng = ctx.createGain(); env(ng, t, .08, .012*v, dur*.6, .4); n.connect(bp); bp.connect(ng); ng.connect(music); n.start(t); n.stop(t + dur + .6); g.connect(music); g.connect(echo); }
  // moods: chords as MIDI, a pentatonic scale for melodies, which voice leads
  const MOODS = {
    day:    { bpm: 64, chords: [[50,57,62,66,69],[47,54,62,66,69],[43,55,59,62,66],[45,52,57,62,64]], scale: [62,64,66,69,71,74,76,78,81], lead: "harp+flute", arp: .42, bright: .8 },
    golden: { bpm: 58, chords: [[43,50,57,59,66],[40,47,55,59,66],[42,50,57,61,66],[45,52,57,62,64]], scale: [62,64,66,69,71,74,76,78], lead: "flute", arp: .3, bright: .55 },
    night:  { bpm: 52, chords: [[41,48,53,57,59,64],[36,43,52,55,62],[45,52,55,60,64],[43,50,55,57,62]], scale: [72,74,76,79,81,84,86,88], lead: "bell", arp: .22, bright: .3 },
    rain:   { bpm: 54, chords: [[45,52,57,60,64],[41,48,57,60,64],[43,50,55,59,62],[40,47,55,59,62]], scale: [69,72,74,76,79,81], lead: "harp", arp: .3, bright: .35 },
    storm:  { bpm: 46, chords: [[38,45,50],[36,43,50],[38,45,50],[34,41,50]], scale: [], lead: "", arp: 0, bright: .15 }
  };
  let mood = "day", next = "day", on = true, beat = 0, nextT = 0, last = 64, phrase = 0, resting = 0, started = false;
  function schedule(){
    const M = MOODS[mood], bd = 60/M.bpm/2; // 8th notes
    while (nextT < ctx.currentTime + .4){
      const t = nextT, bar = Math.floor(beat/8), inBar = beat % 8;
      if (inBar === 0){
        if (bar % 4 === 0){ mood = next; phrase++; resting = (phrase % 4 === 0) ? 2 : 0; }
        const Mm = MOODS[mood], ch = Mm.chords[bar % Mm.chords.length]; pad(ch, t, bd*8 + .5, Mm.bright); bass(ch[0], t, bd*8);
      }
      const Mm = MOODS[mood], ch = Mm.chords[bar % Mm.chords.length];
      if (!resting && Mm.arp && Math.random() < Mm.arp*(inBar % 2 ? .6 : 1)) harp(ch[1 + Math.floor(Math.random()*(ch.length - 1))] + 12, t, .7 + Math.random()*.4);
      if (!resting && Mm.scale.length && bar % 2 === 1 && inBar === 0){
        const n = 3 + Math.floor(Math.random()*3); let idx = Mm.scale.indexOf(last); if (idx < 0) idx = Math.floor(Mm.scale.length/2);
        for (let k = 0; k < n; k++){ idx = Math.max(0, Math.min(Mm.scale.length - 1, idx + [-2, -1, 1, 1, 2][Math.floor(Math.random()*5)])); last = Mm.scale[idx]; const nt = t + k*bd*(1 + (Math.random() < .3 ? 1 : 0)), lead = Mm.lead.includes("flute") && Math.random() < .6 ? "flute" : Mm.lead.includes("bell") ? "bell" : "harp";
          if (lead === "flute") flute(last, nt, bd*1.6); else if (lead === "bell") bell(last, nt); else harp(last, nt, 1.1); }
      }
      if (inBar === 7 && resting) resting = Math.max(0, resting - .25);
      beat++; nextT += bd;
    }
  }
  setInterval(() => { if (started && on) schedule(); }, 120);
  const S = {
    ctx, out, rev, music, sfx,
    start(){ if (started) return; started = true; nextT = ctx.currentTime + .3; music.gain.setTargetAtTime(on ? .55 : 0, ctx.currentTime, 2.5); },
    setMood(m){ if (MOODS[m]) next = m; },
    toggleMusic(){ on = !on; music.gain.setTargetAtTime(on ? .55 : 0, ctx.currentTime, .8); if (on) nextT = ctx.currentTime + .2; return on; },
    get musicOn(){ return on; },
    noise(t, dur, type, f, peak, a = .005, q = .7, dest2 = sfx){ const n = ctx.createBufferSource(); n.buffer = nb; n.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ctx.createGain(); env(g, t, a, peak, 0, dur); n.connect(fl); fl.connect(g); g.connect(dest2); n.start(t, Math.random()); n.stop(t + dur + a + .1); return fl; },
    boom(delay, size = 1){ const t = ctx.currentTime + Math.min(3, delay); const v = Math.max(.08, Math.min(.9, 1.2/(1 + delay*2)))*size; S.noise(t, .25, "lowpass", 1400, v*.6, .002); S.noise(t, 2.6, "lowpass", 140, v, .004); const o = osc("sine", 70, t, t + .5), g = ctx.createGain(); env(g, t, .003, v*.6, 0, .45); o.frequency.exponentialRampToValueAtTime(32, t + .4); o.connect(g); g.connect(sfx); },
    launch(delay){ const t = ctx.currentTime + Math.min(2, delay); S.noise(t, .3, "bandpass", 300, .08, .002); if (Math.random() < .5){ const o = osc("sine", 700, t + .05, t + 1.4), g = ctx.createGain(); env(g, t + .05, .05, .025, .9, .3); o.frequency.exponentialRampToValueAtTime(2200, t + 1.3); o.connect(g); g.connect(sfx); } },
    crackle(delay, n = 30){ const t0 = ctx.currentTime + Math.min(3, delay); for (let i = 0; i < n; i++){ const t = t0 + Math.random()*1.2; S.noise(t, .025, "highpass", 3000, .05 + Math.random()*.05, .001); } },
    thunder(delay, p = 1){ const t = ctx.currentTime + Math.min(4, delay); S.noise(t, .4, "highpass", 1200, .18*p, .002); S.noise(t + .05, 4.5, "lowpass", 160, .7*p, .02); S.noise(t + .3, 3.5, "lowpass", 90, .5*p, .4); },
    chime(){ const t = ctx.currentTime + .05; [76, 79, 83, 88].forEach((m, i) => bell(m, t + i*.16, .9)); },
    pluck(m, v){ harp(m, ctx.currentTime + .01, v); }
  };
  return S;
}
