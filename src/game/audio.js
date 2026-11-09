// Background music: starts when the player taps Start, loops, fades in, pauses when the tab is hidden,
// and can be switched off with the 🔊 button. The choice is remembered on the device.
const SRC = '/audio/background-music.m4a';
const VOLUME = 0.35;             // change here to make the music louder or quieter (0 to 1)

let audio = null, muted = false, started = false, fade = null;
try { muted = localStorage.getItem('ncl-muted') === '1'; } catch { /* ignore */ }

const btn = () => document.getElementById('soundBtn');
function paint() {
  const b = btn(); if (!b) return;
  b.textContent = muted ? '🔇' : '🔊';
  b.setAttribute('aria-label', muted ? 'Turn music on' : 'Turn music off');
  b.title = muted ? 'Music off' : 'Music on';
}

function rampTo(target, ms, done) {
  clearInterval(fade);
  if (!audio) return;
  const from = audio.volume, t0 = performance.now();
  fade = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    audio.volume = Math.max(0, Math.min(1, from + (target - from) * k));
    if (k >= 1) { clearInterval(fade); done?.(); }
  }, 50);
}

function ensureAudio() {
  if (audio) return audio;
  audio = new Audio(SRC);
  audio.loop = true; audio.preload = 'none'; audio.volume = 0;
  return audio;
}

// Must be called from a tap/click (browsers block sound until the player does something).
export function startMusic() {
  started = true;
  if (muted) return;
  ensureAudio().play().then(() => rampTo(VOLUME, 2500)).catch(() => { /* blocked: the 🔊 button will retry */ });
}

export function toggleMusic() {
  muted = !muted;
  try { localStorage.setItem('ncl-muted', muted ? '1' : '0'); } catch { /* ignore */ }
  paint();
  if (muted) rampTo(0, 400, () => audio?.pause());
  else ensureAudio().play().then(() => rampTo(VOLUME, 800)).catch(() => {});
}

export function initMusicButton() {
  paint();
  btn().onclick = toggleMusic;
  // Save battery and be polite: pause when the player switches app, resume when they come back
  document.addEventListener('visibilitychange', () => {
    if (!audio || !started || muted) return;
    if (document.hidden) audio.pause();
    else audio.play().then(() => rampTo(VOLUME, 800)).catch(() => {});
  });
}
