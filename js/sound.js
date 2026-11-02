// 햄스터 월드 투어 — 간단한 효과음 (WebAudio 합성, 외부 파일 없음)
(function (root) {
  'use strict';
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem('hwt.muted') === '1'; } catch (e) { /* 저장소 없음 */ }

  function ac() {
    if (!ctx) {
      const C = root.AudioContext || root.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, opts) {
    if (muted) return;
    const c = ac();
    if (!c) return;
    const o = opts || {};
    const t0 = c.currentTime + (o.delay || 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.15, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // 걸러낸 잡음 한 번 (치즈 소리용): 필터 주파수를 from→to 로 쓸어 말랑하게 "뭉개지는" 소리를 낸다
  let noiseBuf = null;
  function noise(dur, opts) {
    if (muted) return;
    const c = ac();
    if (!c) return;
    const o = opts || {};
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t0 = c.currentTime + (o.delay || 0);
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    const f = c.createBiquadFilter();
    f.type = o.filter || 'lowpass';
    f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.from || 1200, t0);
    f.frequency.exponentialRampToValueAtTime(o.to || 300, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.02);
  }

  // ---------- 배경음악: 회전목마 왈츠 (자체 작곡, 3/4박자) ----------
  // assets/music/bgm.mp3 가 있으면 그 파일, 없으면 WebAudio 합성
  let musicOn = true;
  try { musicOn = localStorage.getItem('hwt.music') !== '0'; } catch (e) { /* 저장소 없음 */ }
  const BPM = 168;
  const N = { G3: 55, A3: 57, B3: 59, C4: 60, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, B4: 71, C5: 72, D5: 74, E5: 76, F5: 77, Fs5: 78, G5: 79, A5: 81, Bb5: 82, B5: 83, C6: 84, D6: 86 };
  // 마디마다 [멜로디 [음, 박]...], 화음
  const CH = { C: [48, 60, 64, 67], C7: [48, 64, 67, 70], F: [41, 60, 65, 69], G: [43, 59, 62, 67], G7: [43, 59, 65, 67], D7: [50, 60, 62, 66] };
  const SONG = [
    // A
    [[['G4', 1], ['C5', 1], ['E5', 1]], 'C'], [[['G5', 2], ['E5', 1]], 'C'],
    [[['F5', 1], ['D5', 1], ['B4', 1]], 'G'], [[['G4', 2], [null, 1]], 'G'],
    [[['D5', 1], ['F5', 1], ['G5', 1]], 'G7'], [[['F5', 2], ['D5', 1]], 'G7'],
    [[['E5', 1], ['C5', 1], ['G4', 1]], 'C'], [[['C5', 2], [null, 1]], 'C'],
    [[['E5', 1], ['G5', 1], ['Bb5', 1]], 'C7'], [[['A5', 2], ['F5', 1]], 'F'],
    [[['A5', 1], ['G5', 1], ['F5', 1]], 'F'], [[['E5', 2], ['C5', 1]], 'C'],
    [[['D5', 1], ['Fs5', 1], ['A5', 1]], 'D7'], [[['G5', 1], ['F5', 1], ['D5', 1]], 'G7'],
    [[['B4', 1], ['D5', 1], ['F5', 1]], 'G7'], [[['C5', 2], [null, 1]], 'C'],
    // B (통통 튀는 부분)
    [[['A5', 0.5], ['G5', 0.5], ['F5', 1], ['C5', 1]], 'F'], [[['F5', 1], ['A5', 1], ['C6', 1]], 'F'],
    [[['G5', 0.5], ['F5', 0.5], ['E5', 1], ['C5', 1]], 'C'], [[['E5', 1], ['G5', 1], ['C6', 1]], 'C'],
    [[['A5', 0.5], ['G5', 0.5], ['Fs5', 1], ['D5', 1]], 'D7'], [[['G5', 1], ['B5', 1], ['D6', 1]], 'G'],
    [[['C6', 0.5], ['B5', 0.5], ['A5', 0.5], ['G5', 0.5], ['F5', 0.5], ['D5', 0.5]], 'G7'], [[['C5', 1], ['G4', 1], [null, 1]], 'C'],
  ];
  const EVENTS = [];
  SONG.forEach(([mel, ch], bar) => {
    const t0 = bar * 3;
    let t = t0;
    for (const [n, d] of mel) {
      if (n) EVENTS.push({ t, kind: bar >= 16 ? 'bell' : 'lead', midi: N[n], dur: d });
      t += d;
    }
    const c = CH[ch];
    EVENTS.push({ t: t0, kind: 'bass', midi: c[0], dur: 1 });
    EVENTS.push({ t: t0 + 1, kind: 'chord', midi: c.slice(1), dur: 0.5 });
    EVENTS.push({ t: t0 + 2, kind: 'chord', midi: c.slice(1), dur: 0.5 });
    EVENTS.push({ t: t0 + 1, kind: 'tick' }, { t: t0 + 2, kind: 'tick' });
  });
  EVENTS.sort((a, b) => a.t - b.t);
  const LOOP = SONG.length * 3;
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  let mGain = null, timer = null, loopStart = 0, idx = 0, fileAudio = null, fileState = 'unknown', playing = false;

  function voice(c, out, type, f, t, dur, vol, attack) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }
  function playEvent(c, ev, t, spb) {
    const out = mGain;
    if (ev.kind === 'lead' || ev.kind === 'bell') {
      const f = hz(ev.midi), d = Math.max(0.12, ev.dur * spb * 0.92);
      // 오르간(회전목마) 소리: 사각파 + 한 옥타브 위 사인, 살짝 떨림
      const o = voice(c, out, 'square', f, t, d, 0.05, 0.02);
      const lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.value = 5.5; lg.gain.value = f * 0.006;
      lfo.connect(lg).connect(o.frequency); lfo.start(t); lfo.stop(t + d + 0.05);
      voice(c, out, 'sine', f * 2, t, d, 0.04, 0.02);
      if (ev.kind === 'bell') voice(c, out, 'sine', f * 4, t, 0.35, 0.035, 0.003); // 실로폰 반짝
    } else if (ev.kind === 'bass') {
      voice(c, out, 'triangle', hz(ev.midi), t, spb * 0.9, 0.16, 0.005);
    } else if (ev.kind === 'chord') {
      for (const m of ev.midi) voice(c, out, 'triangle', hz(m), t, spb * 0.45, 0.045, 0.005);
    } else if (ev.kind === 'tick') {
      if (!noiseBuf) return;
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 6000;
      g.gain.setValueAtTime(0.03, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      src.connect(f).connect(g).connect(out);
      src.start(t, Math.random() * 0.5); src.stop(t + 0.06);
    }
  }
  function schedule() {
    const c = ctx;
    if (!c || !mGain) return;
    const spb = 60 / BPM;
    for (;;) {
      if (idx >= EVENTS.length) { idx = 0; loopStart += LOOP * spb; }
      const ev = EVENTS[idx];
      const t = loopStart + ev.t * spb;
      if (t > c.currentTime + 0.3) break;
      if (t >= c.currentTime - 0.02) playEvent(c, ev, t, spb);
      idx++;
    }
  }
  function startSynth() {
    const c = ac();
    if (!c) return;
    if (!noiseBuf) { // 잡음 버퍼 준비 (박자 '칙' 소리용)
      noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    mGain = c.createGain();
    mGain.gain.setValueAtTime(0.0001, c.currentTime);
    mGain.gain.exponentialRampToValueAtTime(0.55, c.currentTime + 0.8);
    mGain.connect(c.destination);
    loopStart = c.currentTime + 0.1; idx = 0;
    schedule();
    timer = setInterval(schedule, 60);
  }
  function stopSynth() {
    if (timer) { clearInterval(timer); timer = null; }
    if (mGain && ctx) {
      const g = mGain;
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      setTimeout(() => g.disconnect(), 400);
    }
    mGain = null;
  }
  function startMusic() {
    if (playing || !musicOn) return;
    playing = true;
    if (fileState === 'ok') { fileAudio.play().catch(() => {}); return; }
    if (fileState === 'none') { startSynth(); return; }
    // 처음 한 번: 음악 파일이 있는지 확인
    fileAudio = new Audio('assets/music/bgm.mp3');
    fileAudio.loop = true;
    fileAudio.volume = 0.35;
    fileAudio.addEventListener('error', () => { fileState = 'none'; if (playing) startSynth(); }, { once: true });
    fileAudio.addEventListener('canplay', () => { fileState = 'ok'; }, { once: true });
    fileAudio.play().then(() => { fileState = 'ok'; if (!playing) fileAudio.pause(); }).catch(() => { /* error 이벤트에서 처리 */ });
  }
  function stopMusic() {
    if (!playing) return;
    playing = false;
    if (fileAudio && fileState !== 'none') fileAudio.pause();
    stopSynth();
  }
  let musicWanted = false; // 게임 화면에 있을 때 true
  if (root.document) {
    root.document.addEventListener('visibilitychange', () => {
      if (root.document.hidden) stopMusic(); else if (musicWanted) startMusic();
    });
  }

  const DICE_VOL = 1.1; // 주사위 소리 음량 배율 (v0.27: 10% 올림)

  const Sound = {
    music(on) { musicWanted = on; if (on) startMusic(); else stopMusic(); },
    get musicOn() { return musicOn; },
    toggleMusic() {
      musicOn = !musicOn;
      try { localStorage.setItem('hwt.music', musicOn ? '1' : '0'); } catch (e) { /* 저장소 없음 */ }
      if (musicOn && musicWanted) startMusic(); else stopMusic();
      return musicOn;
    },
    // 치즈 주사위: 손안에서 말랑말랑 주물리는 소리 / 던질 때 휙 / 떨어질 때 말캉 통 (strength 0~1)
    cheeseShake() { noise(0.07, { filter: 'bandpass', q: 2.5, from: 700 + Math.random() * 300, to: 380, vol: 0.12 * DICE_VOL }); },
    cheeseThrow() { noise(0.22, { filter: 'bandpass', q: 1.2, from: 350, to: 1600, vol: 0.1 * DICE_VOL }); },
    cheeseBounce(strength, delay) {
      const k = Math.max(0.25, strength) * DICE_VOL;
      tone(150 + 60 * k, 0.16, { to: 62, type: 'sine', vol: 0.22 * k, delay });
      noise(0.13, { from: 1500, to: 220, vol: 0.2 * k, delay });
      tone(520, 0.06, { to: 300, type: 'triangle', vol: 0.035 * k, delay: (delay || 0) + 0.02 });
    },
    squeak() { tone(1800, 0.09, { to: 2600, type: 'triangle', vol: 0.08 }); tone(2200, 0.08, { to: 3000, type: 'triangle', vol: 0.06, delay: 0.1 }); },
    hop() { tone(520, 0.06, { to: 780, type: 'sine', vol: 0.05 }); },
    dice() { for (let k = 0; k < 5; k++) tone(180 + Math.random() * 200, 0.03, { type: 'square', vol: 0.04 * DICE_VOL, delay: k * 0.05 }); },
    // 땅을 샀을 때: 뾰로롱 올라가는 아르페지오 + 찍찍
    happy() {
      [784, 988, 1175, 1568].forEach((f, k) => tone(f, 0.16, { type: 'triangle', vol: 0.08, delay: 0.05 + k * 0.07 }));
      tone(2093, 0.3, { type: 'sine', vol: 0.05, delay: 0.33 });
      tone(1800, 0.08, { to: 2700, type: 'triangle', vol: 0.06, delay: 0.42 });
      tone(2200, 0.07, { to: 3100, type: 'triangle', vol: 0.05, delay: 0.52 });
    },
    // 남의 땅 통행료를 낼 때: 와-와-와-와앙 내려가는 소리
    sad() {
      [[392, 370], [370, 349], [349, 330]].forEach(([a, b], k) => tone(a, 0.26, { to: b, type: 'triangle', vol: 0.11, delay: 0.1 + k * 0.28 }));
      tone(330, 0.75, { to: 247, type: 'triangle', vol: 0.11, delay: 0.94 });
    },
    // 수학 문제 정답: 딩-동-댕 종소리
    quizRight() {
      [[784, 0], [659, 0.2], [1047, 0.4]].forEach(([f, d], k) => {
        tone(f, k === 2 ? 0.7 : 0.35, { type: 'sine', vol: 0.14, delay: d });
        tone(f * 2, k === 2 ? 0.5 : 0.25, { type: 'sine', vol: 0.04, delay: d });
      });
      [1568, 2093, 2637].forEach((f, k) => tone(f, 0.12, { type: 'triangle', vol: 0.04, delay: 0.55 + k * 0.06 }));
    },
    // 승리: 빰빰빰 빠-밤! 팡파르 + 환호 + 반짝
    victory() {
      const N = [[0, 392, 0.11], [0.13, 392, 0.11], [0.26, 392, 0.11], [0.4, 523, 0.36], [0.8, 659, 0.11], [0.93, 587, 0.11], [1.06, 659, 0.11], [1.2, 784, 0.4], [1.65, 1047, 1.1]];
      for (const [d, f, len] of N) {
        tone(f, len, { type: 'square', vol: 0.07, delay: d });
        tone(f, len, { type: 'triangle', vol: 0.1, delay: d });
      }
      [262, 330, 392].forEach((f) => tone(f, 1.2, { type: 'triangle', vol: 0.08, delay: 1.65 }));
      noise(1.3, { filter: 'bandpass', q: 0.8, from: 700, to: 1500, vol: 0.07, delay: 1.65 });
      [1568, 2093, 2637, 3136, 2637, 3136, 4186].forEach((f, k) => tone(f, 0.14, { type: 'sine', vol: 0.05, delay: 1.9 + k * 0.08 }));
    },
    // 패배: 느리게 내려가는 오르골 + 힘 빠지는 소리
    lose() {
      [[0, 659], [0.42, 587], [0.84, 523], [1.26, 494]].forEach(([d, f]) => {
        tone(f, 0.4, { type: 'triangle', vol: 0.11, delay: d });
        tone(f * 2, 0.3, { type: 'sine', vol: 0.03, delay: d });
      });
      tone(440, 1.5, { type: 'triangle', vol: 0.12, delay: 1.68 });
      tone(110, 1.6, { type: 'triangle', vol: 0.14, delay: 1.68 });
      tone(300, 0.7, { to: 70, type: 'sawtooth', vol: 0.04, delay: 3.0 });
    },
    // 강제 매입: 쾅! + 동전 쏟아지는 소리
    takeover() {
      tone(110, 0.25, { to: 55, type: 'square', vol: 0.12 });
      noise(0.2, { from: 2000, to: 200, vol: 0.15 });
      [1319, 1568, 1319, 1760, 2093].forEach((f, k) => tone(f, 0.09, { type: 'square', vol: 0.04, delay: 0.25 + k * 0.07 }));
    },
    // 텔레포트: 슈우웅 올라갔다 내려오는 소리
    teleport() {
      tone(300, 0.35, { to: 2400, type: 'sine', vol: 0.08 });
      tone(2400, 0.4, { to: 500, type: 'triangle', vol: 0.06, delay: 0.4 });
      [1568, 2093, 2637].forEach((f, k) => tone(f, 0.1, { type: 'sine', vol: 0.04, delay: 0.75 + k * 0.06 }));
    },
    // 세계 이벤트: 좋은 소식(빰빠밤↑) / 나쁜 소식(둥둥↓)
    worldGood() {
      [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, 0.2, { type: 'triangle', vol: 0.09, delay: k * 0.09 }));
      tone(1047, 0.6, { type: 'square', vol: 0.04, delay: 0.5 });
    },
    worldBad() {
      [[392, 0], [370, 0.25], [311, 0.5]].forEach(([f, d]) => tone(f, 0.3, { type: 'sawtooth', vol: 0.05, delay: d }));
      tone(98, 0.9, { type: 'triangle', vol: 0.16, delay: 0.75 });
    },
    // 수학 문제 오답·시간 초과: 삐-빅 부저
    quizWrong() {
      tone(233, 0.16, { type: 'square', vol: 0.07 });
      tone(220, 0.32, { to: 180, type: 'square', vol: 0.07, delay: 0.2 });
    },
    coin() { tone(988, 0.08, { type: 'square', vol: 0.05 }); tone(1319, 0.18, { type: 'square', vol: 0.05, delay: 0.08 }); },
    pay() { tone(440, 0.12, { to: 300, type: 'triangle', vol: 0.08 }); },
    build() { tone(160, 0.08, { type: 'square', vol: 0.08 }); tone(220, 0.08, { type: 'square', vol: 0.08, delay: 0.12 }); },
    card() { tone(660, 0.1, { to: 990, type: 'sine', vol: 0.07 }); },
    bad() { tone(300, 0.25, { to: 140, type: 'sawtooth', vol: 0.06 }); },
    win() { [523, 659, 784, 1047].forEach((f, k) => tone(f, 0.2, { type: 'triangle', vol: 0.09, delay: k * 0.13 })); },
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem('hwt.muted', muted ? '1' : '0'); } catch (e) { /* 저장소 없음 */ }
      return muted;
    },
  };
  root.Sound = Sound;
})(this);
