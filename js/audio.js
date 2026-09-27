// ---------------------------------------------------------------------------
// All sound in the game is synthesized with the Web Audio API — there are no
// audio files anywhere in this project. This module owns the AudioContext,
// the one-shot sound effects, and the ambient background music loop.
// ---------------------------------------------------------------------------

let audioCtx = null;
function ensureAudioCtx() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

export function playTone(freq, duration = 0.18, delay = 0, type = "sine", gainVal = 0.15) {
  if (!ensureAudioCtx()) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain).connect(audioCtx.destination);
  const t0 = audioCtx.currentTime + delay;
  gain.gain.setValueAtTime(gainVal, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function playPickupChime() {
  playTone(880, 0.12, 0);
  playTone(1320, 0.16, 0.08);
}

export function playFanfare() {
  [660, 880, 1100, 1320].forEach((f, i) => playTone(f, 0.24, i * 0.13, "triangle", 0.13));
}

export function playGrandFanfare() {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => playTone(f, 0.5, i * 0.15, "triangle", 0.11));
  [523.25, 659.25, 783.99].forEach((f) => playTone(f, 1.4, 0.75, "sine", 0.07));
}

// ---------------------------------------------------------------------------
// Ambient BGM
// ---------------------------------------------------------------------------

const BGM_KEY = "museum-portal-bgm-muted";
let bgmStarted = false;
let bgmMuted = false;
try {
  bgmMuted = localStorage.getItem(BGM_KEY) === "1";
} catch (e) {
  // ignore
}
let bgmMasterGain = null;
const bgmIndicatorEl = document.getElementById("bgm-indicator");

function refreshBgmIndicator() {
  bgmIndicatorEl.textContent = bgmMuted ? "BGM: オフ (M で切替)" : "BGM: オン (M で切替)";
  bgmIndicatorEl.classList.toggle("visible", bgmMuted);
}
refreshBgmIndicator();

export function isBgmMuted() {
  return bgmMuted;
}

export function startBgm() {
  if (bgmStarted) return;
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  bgmStarted = true;

  const master = ctx.createGain();
  master.gain.value = bgmMuted ? 0 : 0.11;
  master.connect(ctx.destination);
  bgmMasterGain = master;

  // bright, gently swelling major chord (Cmaj9 + a high shimmer octave), mixing
  // triangle and sine voices for a warmer, more cheerful color than pure sine
  const chord = [
    { freq: 261.63, type: "triangle" }, // C4
    { freq: 329.63, type: "sine" }, // E4
    { freq: 392.0, type: "triangle" }, // G4
    { freq: 493.88, type: "sine" }, // B4
    { freq: 587.33, type: "triangle" }, // D5
    { freq: 659.25, type: "sine" }, // E5 shimmer
  ];
  for (const { freq, type } of chord) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const voiceGain = ctx.createGain();
    voiceGain.gain.value = 0;
    osc.connect(voiceGain).connect(master);
    osc.start();
    voiceGain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 3 + Math.random() * 2);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06 + Math.random() * 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.035;
    lfo.connect(lfoGain).connect(voiceGain.gain);
    lfo.start();
  }

  scheduleBgmArpeggio();
}

function scheduleBgmArpeggio() {
  if (!bgmStarted) return;
  const ctx = audioCtx;
  const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 987.77, 1046.5, 1174.7];
  const freq = scale[Math.floor(Math.random() * scale.length)];
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = 0;
  osc.connect(g).connect(bgmMasterGain);
  const t0 = ctx.currentTime;
  g.gain.linearRampToValueAtTime(0.09, t0 + 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4);
  osc.start(t0);
  osc.stop(t0 + 2.5);

  setTimeout(scheduleBgmArpeggio, 1400 + Math.random() * 1800);
}

export function setBgmMuted(muted) {
  bgmMuted = muted;
  if (bgmMasterGain) {
    bgmMasterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.11, audioCtx.currentTime + 0.4);
  }
  refreshBgmIndicator();
  try {
    localStorage.setItem(BGM_KEY, muted ? "1" : "0");
  } catch (e) {
    // ignore
  }
}
