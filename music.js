// ============================================================
// MUSIC — Game of Thrones style (C minor, epic)
// ============================================================
let audioCtx = null;
let musicPlaying = false;
let musicGain = null;

// C minor scale: C D Eb F G Ab Bb C
// Notes: 48,50,51,53,55,56,58,60
const GoT_MELODY = [
  { n: 60, d: 0.6 },
  { n: 58, d: 0.3 },
  { n: 56, d: 0.6 },
  { n: 55, d: 0.3 },
  { n: 60, d: 0.4 },
  { n: 58, d: 0.2 },
  { n: 56, d: 0.4 },
  { n: 55, d: 0.2 },
  { n: 53, d: 0.4 },
  { n: 55, d: 0.2 },
  { n: 56, d: 0.6 },
  { n: 53, d: 0.6 },
  { n: 51, d: 0.6 },
  { n: 48, d: 0.8 },
  { n: 60, d: 0.4 },
  { n: 63, d: 0.3 },
  { n: 65, d: 0.4 },
  { n: 67, d: 0.3 },
  { n: 68, d: 0.4 },
  { n: 67, d: 0.2 },
  { n: 65, d: 0.4 },
  { n: 63, d: 0.2 },
  { n: 60, d: 0.6 },
  { n: 58, d: 0.4 },
  { n: 56, d: 0.4 },
  { n: 55, d: 0.4 },
  { n: 53, d: 0.4 },
  { n: 51, d: 0.6 },
  { n: 48, d: 1.0 },
];

const GoT_CHORDS = [
  { n: 48, d: 2.0 }, { n: 48, d: 2.0 }, { n: 51, d: 2.0 }, { n: 51, d: 2.0 },
  { n: 55, d: 2.0 }, { n: 55, d: 2.0 }, { n: 48, d: 2.0 }, { n: 48, d: 2.0 },
  { n: 48, d: 2.0 }, { n: 48, d: 2.0 }, { n: 51, d: 2.0 }, { n: 51, d: 2.0 },
  { n: 53, d: 2.0 }, { n: 53, d: 2.0 }, { n: 51, d: 2.0 }, { n: 48, d: 2.0 },
];

function mtof(n) { return 440 * Math.pow(2, (n - 69) / 12); }

function initAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.055;
    musicGain.connect(audioCtx.destination);
  } catch(e) {}
}

function playCello(freq, duration, startTime, vol) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  osc.type = 'sawtooth';
  osc.frequency.value = freq;
  filter.type = 'lowpass';
  filter.frequency.value = 600 + freq * 0.5;
  filter.Q.value = 0.5;
  const v = vol || 0.35;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(v, startTime + 0.08);
  gain.gain.setValueAtTime(v * 0.9, startTime + duration - 0.1);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(musicGain);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function playPizz(freq, duration, startTime) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.15, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.3);
  osc.connect(gain);
  gain.connect(musicGain);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function playBass(freq, duration, startTime) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
  gain.gain.setValueAtTime(0.2, startTime + duration - 0.05);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);
  osc.connect(gain);
  gain.connect(musicGain);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function playHeartbeat(startTime) {
  if (!audioCtx) return;
  const bufSize = audioCtx.sampleRate * 0.08;
  if (bufSize <= 0) return;
  const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let j = 0; j < bufSize; j++) {
    const env = Math.exp(-j / (bufSize * 0.06));
    data[j] = (Math.random() * 2 - 1) * env;
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 150;
  const vol = 0.25 + Math.random() * 0.08;
  gain.gain.setValueAtTime(vol, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.06);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(musicGain);
  src.start(startTime);
  src.stop(startTime + 0.07);
}

let musicTimer = null;

function playGoTTheme() {
  if (!audioCtx || !musicGain) return;
  const now = audioCtx.currentTime;
  const bpm = 72;
  const beat = 60 / bpm;

  let t = now;
  for (const n of GoT_MELODY) {
    const freq = mtof(n.n);
    const dur = n.d * beat;
    playCello(freq, dur, t, 0.35);
    playCello(freq * Math.pow(2, -8/12), dur * 0.6, t + 0.04, 0.15);
    t += dur;
  }
  const melEnd = t;

  let bt = now;
  for (const n of GoT_CHORDS) {
    const freq = mtof(n.n - 12);
    const dur = n.d * beat;
    playBass(freq, dur, bt);
    bt += dur;
  }

  let pt = now;
  for (let i = 0; i < 32; i++) {
    const freq = mtof(48 + (i % 4) * 3 + Math.floor(i / 8) * 2);
    playPizz(freq, beat * 0.3, pt);
    pt += beat * 2;
  }

  for (let i = 0; i < 32; i++) {
    const ht = now + i * beat * 2;
    playHeartbeat(ht);
    if (i % 2 === 0) {
      setTimeout(() => {
        try { playHeartbeat(ht + beat); } catch(e) {}
      }, (beat * 1000) / 2);
    }
  }

  const totalDur = Math.max(melEnd - now, bt - now) + beat;
  musicTimer = setTimeout(playGoTTheme, totalDur * 1000 - 50);
}

function startMusic() {
  initAudio();
  if (!audioCtx || musicPlaying) return;
  musicPlaying = true;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  setTimeout(playGoTTheme, 100);
}

function stopMusic() {
  musicPlaying = false;
  if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
}
