/* Chkobba — café sounds, all synthesized with Web Audio (no audio files):
   card throw / landing, darbuka + applause + youyou for the haya and chkobba,
   and a café ambiance (chatter, cups, a distant radio playing an oud taqsim in maqam Bayati). */
window.CafeSound = (function(){
  const PREF_KEY = 'cb-sound';
  const prefs = { amb: true, fx: true };
  try{ Object.assign(prefs, JSON.parse(localStorage.getItem(PREF_KEY) || '{}')); }catch(e){}
  function savePrefs(){ try{ localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); }catch(e){} }

  // Own generator: the game stubs Math.random while it previews a move.
  let seed = (Date.now() ^ 0x9e3779b9) >>> 0;
  function rnd(){ seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  const pick = a => a[Math.floor(rnd() * a.length)];

  let ctx = null, master, fxBus, ambBus, radio, noiseBuf;
  let active = false, ambRunning = false, timer = null, voices = [];
  let tMusic = 0, tPerc = 0, tClink = 0, tMurmur = 0, musicIdx = 3, phraseLeft = 0, songLeft = 0;

  function ensure(){
    if(ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return null;
    try{ if(navigator.audioSession) navigator.audioSession.type = 'playback'; }catch(e){}
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    fxBus = ctx.createGain(); fxBus.gain.value = 0.85; fxBus.connect(master);
    ambBus = ctx.createGain(); ambBus.gain.value = 0; ambBus.connect(master);
    const sr = ctx.sampleRate;
    noiseBuf = ctx.createBuffer(1, sr * 2, sr);
    const nd = noiseBuf.getChannelData(0);
    for(let i = 0; i < nd.length; i++) nd[i] = rnd() * 2 - 1;
    // Small room reverb from decaying noise.
    const rev = ctx.createConvolver(), len = Math.floor(sr * 1.6), ir = ctx.createBuffer(2, len, sr);
    for(let ch = 0; ch < 2; ch++){ const d = ir.getChannelData(ch); for(let i = 0; i < len; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / len, 3); }
    rev.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.3; rev.connect(wet); wet.connect(ambBus);
    // The music sounds like an old radio across the room.
    radio = ctx.createGain(); radio.gain.value = 0.5;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 170;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400;
    radio.connect(hp); hp.connect(lp); lp.connect(ambBus); lp.connect(rev);
    return ctx;
  }
  function ready(){ return ctx && ctx.state === 'running'; }
  function unlock(){
    if(!ensure()) return;
    if(ctx.state !== 'running') ctx.resume().then(syncAmb).catch(() => {});
    else syncAmb();
  }
  ['pointerdown', 'touchend', 'keydown'].forEach(ev => document.addEventListener(ev, unlock, { passive: true }));
  document.addEventListener('visibilitychange', () => {
    if(!ctx) return;
    if(document.hidden) ctx.suspend().catch(() => {});
    else if(active) ctx.resume().then(syncAmb).catch(() => {});
  });

  /* ---------- building blocks ---------- */
  function noise(t, dur, o, dest){
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    src.loop = dur > 1.9;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.freq || 1000, t); f.Q.value = o.q || 1;
    if(o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain || 0.3, t + (o.attack || 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest || fxBus);
    src.start(t, rnd() * 1.5); src.stop(t + dur + 0.05);
  }
  function tone(t, freq, dur, o, dest){
    const osc = ctx.createOscillator(); osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if(o.freqTo) osc.frequency.exponentialRampToValueAtTime(o.freqTo, t + (o.glide || dur));
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain || 0.2, t + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    if(o.pan !== undefined && ctx.createStereoPanner){ const p = ctx.createStereoPanner(); p.pan.value = o.pan; g.connect(p); p.connect(dest || fxBus); }
    else g.connect(dest || fxBus);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  function doum(t, v, dest){ tone(t, 120, 0.4, { freqTo: 62, glide: 0.25, gain: 0.7 * v }, dest); noise(t, 0.08, { type: 'lowpass', freq: 500, gain: 0.25 * v }, dest); }
  function tek(t, v, dest){ noise(t, 0.05, { type: 'bandpass', freq: 3800, q: 1.2, gain: 0.45 * v }, dest); tone(t, 720, 0.05, { gain: 0.08 * v }, dest); }
  function clap(t, v){ for(let k = 0; k < 3; k++) noise(t + k * 0.008 + rnd() * 0.004, 0.035, { type: 'bandpass', freq: 1100 + rnd() * 1200, q: 1.4, gain: v * (0.5 + rnd() * 0.5) }); }
  function applause(t, dur, v){
    const n = Math.floor(dur * 34);
    for(let i = 0; i < n; i++){
      const x = rnd(), when = t + x * dur, env = Math.min(1, x * 6) * Math.pow(1 - x, 0.8);
      clap(when, v * env * (0.45 + rnd() * 0.55));
    }
  }
  // Youyou (zaghrouta): a fast tongue trill on a high voice.
  function youyou(t, dur, v, base){
    const osc = ctx.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.linearRampToValueAtTime(base * 1.06, t + dur * 0.85);
    osc.frequency.linearRampToValueAtTime(base * 1.25, t + dur);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 7.5 + rnd();
    const depth = ctx.createGain(); depth.gain.value = base * 0.13;
    lfo.connect(depth); depth.connect(osc.frequency);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = base * 1.4; bp.Q.value = 1.6;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.12);
    g.gain.setValueAtTime(v, t + dur - 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(bp); bp.connect(g); g.connect(fxBus);
    osc.start(t); lfo.start(t); osc.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  }

  /* ---------- game effects ---------- */
  function fxOk(){ return prefs.fx && ready(); }
  function throwCard(){ if(!fxOk()) return; const t = ctx.currentTime; noise(t, 0.16, { type: 'bandpass', freq: 700, freqTo: 3200, q: 0.9, gain: 0.12, attack: 0.05 }); }
  function land(strong){
    if(!fxOk()) return;
    const t = ctx.currentTime;
    noise(t, 0.07, { type: 'bandpass', freq: 2300, q: 0.7, gain: strong ? 0.9 : 0.65 });
    tone(t, 150, 0.11, { freqTo: 60, gain: strong ? 0.55 : 0.35 });
  }
  function sweep(){ if(!fxOk()) return; const t = ctx.currentTime; noise(t, 0.28, { type: 'bandpass', freq: 2600, freqTo: 900, q: 0.8, gain: 0.1, attack: 0.04 }); }
  function chkobba(){
    if(!fxOk()) return;
    const t = ctx.currentTime;
    doum(t, 1); tek(t + 0.17, 1); tek(t + 0.26, 0.8); doum(t + 0.36, 1);
    applause(t + 0.4, 1.6, 0.22);
  }
  function haya(){
    if(!fxOk()) return;
    const t = ctx.currentTime;
    // Darbuka roll, then the whole café cheers.
    [0, 0.09, 0.18, 0.27].forEach((d, i) => (i % 2 ? tek : doum)(t + d, 1));
    for(let i = 0; i < 10; i++) tek(t + 0.36 + i * 0.045, 0.45 + i * 0.05);
    doum(t + 0.84, 1.2); doum(t + 0.84, 0.6);
    applause(t + 0.8, 2.8, 0.3);
    youyou(t + 0.9, 1.9, 0.1, 1050);
    youyou(t + 1.15, 1.7, 0.07, 1180);
  }

  /* ---------- board-game effects (Skonopoly) ---------- */
  // Dice clatter: one click per bounce (times in seconds from now).
  function dice(hits){
    if(!fxOk()) return;
    const t = ctx.currentTime;
    (hits || [0.3, 0.46, 0.58, 0.66]).forEach((h, k) => {
      const v = 1 - k * 0.18;
      noise(t + h, 0.04, { type: 'bandpass', freq: 3200 + rnd() * 1500, q: 2, gain: 0.5 * v });
      tone(t + h, 900 + rnd() * 500, 0.05, { gain: 0.12 * v });
      noise(t + h + 0.025, 0.03, { type: 'bandpass', freq: 2500, q: 2, gain: 0.25 * v });
    });
  }
  function tick(){ if(!fxOk()) return; const t = ctx.currentTime; noise(t, 0.035, { type: 'bandpass', freq: 1700, q: 3, gain: 0.35 }); tone(t, 520, 0.05, { freqTo: 380, gain: 0.12 }); }
  function cash(){
    if(!fxOk()) return;
    const t = ctx.currentTime;
    noise(t, 0.05, { type: 'highpass', freq: 2000, gain: 0.25 }); noise(t + 0.06, 0.05, { type: 'bandpass', freq: 1500, q: 2, gain: 0.25 });
    [2093, 2637, 3136].forEach((f, i) => tone(t + 0.12, f, 0.9 - i * 0.2, { gain: 0.16 / (i + 1), attack: 0.002 }));
    [1568, 2093].forEach((f, i) => tone(t + 0.3, f, 0.7, { gain: 0.1 / (i + 1), attack: 0.002 }));
  }
  function coins(n){
    if(!fxOk()) return;
    const t = ctx.currentTime;
    for(let k = 0; k < (n || 5); k++){ const f = 3000 + rnd() * 2500; tone(t + k * 0.07 + rnd() * 0.03, f, 0.18, { gain: 0.07, attack: 0.001 }); tone(t + k * 0.07 + 0.01, f * 1.48, 0.12, { gain: 0.03, attack: 0.001 }); }
  }
  function pop(){ if(!fxOk()) return; const t = ctx.currentTime; tone(t, 420, 0.16, { freqTo: 900, glide: 0.08, gain: 0.25 }); noise(t, 0.03, { type: 'bandpass', freq: 1200, q: 2, gain: 0.2 }); }
  function siren(){
    if(!fxOk()) return;
    const t = ctx.currentTime, osc = ctx.createOscillator(); osc.type = 'square';
    for(let k = 0; k < 6; k++) osc.frequency.setValueAtTime(k % 2 ? 660 : 880, t + k * 0.3);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.05);
    g.gain.setValueAtTime(0.09, t + 1.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.85);
    osc.connect(lp); lp.connect(g); g.connect(fxBus); osc.start(t); osc.stop(t + 1.9);
  }
  function clank(){
    if(!fxOk()) return;
    const t = ctx.currentTime;
    noise(t, 0.25, { type: 'lowpass', freq: 900, gain: 0.5 });
    [173, 241, 389, 612].forEach((f, i) => tone(t, f, 0.9 - i * 0.15, { gain: 0.18 / (i + 1), attack: 0.002 }));
    noise(t + 0.18, 0.12, { type: 'bandpass', freq: 3000, q: 4, gain: 0.2 });
  }
  function sad(){
    if(!fxOk()) return;
    const t = ctx.currentTime;
    [[392, 0], [370, 0.4], [349, 0.8], [330, 1.2]].forEach(([f, d], k) => tone(t + d, f, k === 3 ? 1.1 : 0.38, { type: 'sawtooth', freqTo: k === 3 ? f * 0.82 : f * 0.98, gain: 0.08 }));
  }
  function boom(t, v){ noise(t, 1.2, { type: 'lowpass', freq: 220, gain: 0.7 * v, attack: 0.005 }); tone(t, 90, 0.5, { freqTo: 40, gain: 0.4 * v }); for(let k = 0; k < 14; k++) noise(t + 0.25 + rnd() * 0.7, 0.02, { type: 'highpass', freq: 4000, gain: 0.12 * v }); }
  function fireworks(){
    if(!fxOk()) return;
    const t = ctx.currentTime;
    for(let k = 0; k < 7; k++) boom(t + 0.2 + k * 0.55 + rnd() * 0.2, 0.6 + rnd() * 0.4);
    applause(t + 0.4, 3.5, 0.28);
    youyou(t + 0.6, 2.0, 0.1, 1050); youyou(t + 0.9, 1.8, 0.07, 1180); youyou(t + 2.6, 1.6, 0.08, 1100);
  }

  /* ---------- café ambiance ---------- */
  // Plucked-string (oud) notes by Karplus-Strong, rendered once per pitch.
  const pluckCache = {};
  function pluckBuffer(freq){
    const sr = ctx.sampleRate, N = Math.max(2, Math.round(sr / freq));
    if(pluckCache[N]) return pluckCache[N];
    const len = Math.floor(sr * 1.8), buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    let prev = 0;
    for(let i = 0; i < N; i++){ const x = rnd() * 2 - 1; prev = prev * 0.55 + x * 0.45; d[i] = prev; }
    for(let i = N; i < len; i++) d[i] = 0.4985 * (d[i - N] + d[i - N - 1 < 0 ? 0 : i - N - 1]);
    return (pluckCache[N] = buf);
  }
  const TONIC = 146.83; // D3
  const LADDER = [-500, -400, -200, 0, 150, 300, 500, 700, 800, 1000, 1200, 1350, 1500]; // Bayati on D (E half-flat)
  const freqOf = i => TONIC * Math.pow(2, LADDER[i] / 1200);
  function oud(t, idx, v){
    const src = ctx.createBufferSource(); src.buffer = pluckBuffer(freqOf(idx));
    const body = ctx.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 240; body.Q.value = 1.2; body.gain.value = 6;
    const g = ctx.createGain(); g.gain.value = v;
    src.connect(body); body.connect(g); g.connect(radio);
    src.start(t); src.stop(t + 1.8);
  }
  const BEAT = 60 / 84;
  function scheduleMusic(until){
    while(tMusic < until){
      if(songLeft <= 0){ tMusic += 4 + rnd() * 5; songLeft = 40 + rnd() * 30; musicIdx = 3; continue; }
      if(phraseLeft <= 0){ phraseLeft = 5 + Math.floor(rnd() * 8); }
      phraseLeft--;
      // Mostly steps, a few leaps, pulled back towards the tonic area.
      const r = rnd();
      let step = r < 0.4 ? 1 : r < 0.8 ? -1 : r < 0.88 ? 2 : r < 0.96 ? -2 : 0;
      if(musicIdx > 9) step = -Math.abs(step) || -1;
      if(musicIdx < 2) step = Math.abs(step) || 1;
      musicIdx = Math.max(0, Math.min(LADDER.length - 1, musicIdx + step));
      if(phraseLeft === 0) musicIdx = pick([3, 3, 7, 5]);
      let dur;
      if(phraseLeft === 0){ dur = BEAT * (1.5 + rnd() * 1.5); }
      else dur = BEAT * pick([0.25, 0.5, 0.5, 0.5, 0.75, 1]);
      if(rnd() < 0.12 && phraseLeft > 0){
        // Rish: fast tremolo on one note.
        const n = 4 + Math.floor(rnd() * 3);
        for(let k = 0; k < n; k++) oud(tMusic + k * 0.085, musicIdx, 0.45 - k * 0.03);
        dur = Math.max(dur, n * 0.085 + 0.1);
      } else oud(tMusic, musicIdx, phraseLeft === 0 ? 0.75 : 0.6);
      if(phraseLeft === 0) dur += BEAT * (0.5 + rnd() * 1.5);
      tMusic += dur; songLeft -= dur;
    }
  }
  function schedulePerc(until){
    // Soft maqsum on the radio: DUM tek . tek DUM . tek .
    while(tPerc < until){
      if(songLeft <= 0 || tPerc < tMusic - 6){ tPerc = Math.max(tPerc + BEAT * 4, tMusic); continue; }
      const e = BEAT / 2;
      doum(tPerc, 0.22, radio); tek(tPerc + e, 0.18, radio); tek(tPerc + 3 * e, 0.16, radio);
      doum(tPerc + 4 * e, 0.2, radio); tek(tPerc + 6 * e, 0.17, radio);
      if(rnd() < 0.3) tek(tPerc + 7 * e, 0.1, radio);
      tPerc += BEAT * 4;
    }
  }
  function clink(t, pan){
    const f = 0.9 + rnd() * 0.25;
    [2350, 3720, 5180].forEach((p, i) => tone(t, p * f, 0.35 - i * 0.08, { gain: 0.05 / (i + 1), attack: 0.001, pan }, ambBus));
  }
  function scheduleClinks(until){
    while(tClink < until){
      const pan = rnd() * 1.6 - 0.8, kind = rnd();
      if(kind < 0.55) clink(tClink, pan);
      else if(kind < 0.8){ clink(tClink, pan); clink(tClink + 0.07 + rnd() * 0.05, pan); }
      else for(let k = 0; k < 4; k++) clink(tClink + k * 0.13, pan); // a spoon stirring tea
      tClink += 2.5 + rnd() * 6;
    }
  }
  function startVoices(){
    // Chatter: band-passed noise voices with a syllable-like envelope, plus room tone.
    const room = ctx.createBufferSource(); room.buffer = noiseBuf; room.loop = true;
    const rf = ctx.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 420;
    const rg = ctx.createGain(); rg.gain.value = 0.05;
    room.connect(rf); rf.connect(rg); rg.connect(ambBus); room.start();
    voices = [{ src: room }];
    for(let i = 0; i < 4; i++){
      const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 4;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g);
      if(ctx.createStereoPanner){ const p = ctx.createStereoPanner(); p.pan.value = -0.7 + i * 0.45; g.connect(p); p.connect(ambBus); }
      else g.connect(ambBus);
      src.start(0, rnd() * 1.5);
      voices.push({ src, f, g, talk: rnd() < 0.5 });
    }
  }
  function scheduleMurmur(until){
    while(tMurmur < until){
      voices.forEach(v => {
        if(!v.g) return;
        if(rnd() < 0.04) v.talk = !v.talk;
        const level = v.talk ? 0.05 + rnd() * 0.09 : 0.004;
        v.g.gain.setTargetAtTime(level, tMurmur, 0.04);
        v.f.frequency.setTargetAtTime(320 + rnd() * 700, tMurmur, 0.05);
      });
      tMurmur += 0.12 + rnd() * 0.12;
    }
  }
  function tick(){
    if(!ready()) return;
    const until = ctx.currentTime + 0.5;
    scheduleMusic(until); schedulePerc(until); scheduleClinks(until); scheduleMurmur(until);
  }
  function startAmb(){
    if(ambRunning || !ready()) return;
    ambRunning = true;
    const now = ctx.currentTime;
    tMusic = now + 1.5; tPerc = tMusic; tClink = now + 1; tMurmur = now; songLeft = 0;
    startVoices();
    ambBus.gain.cancelScheduledValues(now);
    ambBus.gain.setValueAtTime(0.0001, now);
    ambBus.gain.exponentialRampToValueAtTime(1, now + 2.5);
    tick(); timer = setInterval(tick, 150);
  }
  function stopAmb(){
    if(!ambRunning) return;
    ambRunning = false;
    clearInterval(timer); timer = null;
    if(!ctx) return;
    const now = ctx.currentTime;
    ambBus.gain.cancelScheduledValues(now);
    ambBus.gain.setTargetAtTime(0.0001, now, 0.15);
    const old = voices; voices = [];
    setTimeout(() => old.forEach(v => { try{ v.src.stop(); }catch(e){} }), 800);
  }
  function syncAmb(){ if(active && prefs.amb && ready()) startAmb(); else stopAmb(); }

  return {
    prefs: () => Object.assign({}, prefs),
    set(key, val){ prefs[key] = !!val; savePrefs(); if(val) unlock(); syncAmb(); },
    // The ambiance only plays while a game is on screen.
    setActive(on){ active = !!on; if(ctx) syncAmb(); },
    throwCard, land, sweep, chkobba, haya,
    dice, tick, cash, coins, pop, siren, clank, sad, fireworks
  };
})();
