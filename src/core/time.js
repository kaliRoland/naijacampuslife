// Game clock (GDD section 3): 1 real minute = 20 game minutes, so a game day is about 72 real minutes.
// Four phases: morning, afternoon, evening, night. When the day changes, delayed effects are run.
import { getState, runDue } from './state.js';
import { emit } from './events.js';

export const GAME_MINUTES_PER_REAL_SECOND = 20 / 60;

export const PHASES = [
  { id: 'morning', from: 5 * 60, to: 12 * 60 },
  { id: 'afternoon', from: 12 * 60, to: 17 * 60 },
  { id: 'evening', from: 17 * 60, to: 21 * 60 },
  // night is everything else (21:00 to 05:00)
];

export function phaseOf(minutes) {
  const p = PHASES.find(p => minutes >= p.from && minutes < p.to);
  return p ? p.id : 'night';
}

export function formatClock(minutes) {
  const h24 = Math.floor(minutes / 60) % 24, m = Math.floor(minutes % 60);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'am' : 'pm'}`;
}
export const formatStamp = (day, minutes) => `Day ${day}, ${formatClock(minutes)}`;
export const weekdayOf = day => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][(day - 1) % 7];

let carry = 0;        // fractions of a game minute not yet added

// Move the clock forward by whole game minutes, announcing minute, phase and day changes.
export function advanceGameMinutes(n) {
  const t = getState().time;
  for (let i = 0; i < n; i++) {
    const before = phaseOf(t.minutes);
    t.minutes += 1;
    if (t.minutes >= 24 * 60) { t.minutes = 0; t.day += 1; emit('time:day', { day: t.day }); runDue(); }
    const after = phaseOf(t.minutes);
    if (after !== before) emit('time:phase', { phase: after, day: t.day });
    emit('time:tick', { day: t.day, minutes: t.minutes });
  }
}

// Call every frame with the real seconds that passed (only while the game is actually running).
export function advanceReal(seconds) {
  carry += seconds * GAME_MINUTES_PER_REAL_SECOND;
  const whole = Math.floor(carry);
  if (whole > 0) { carry -= whole; advanceGameMinutes(whole); }
}

// Jump to the next time the clock shows hour:minute (for example sleeping until morning).
export function skipTo(hour, minute = 0) {
  const target = hour * 60 + minute, t = getState().time;
  const wait = (target - t.minutes + 24 * 60) % (24 * 60);
  advanceGameMinutes(wait === 0 ? 24 * 60 : wait);
}

export const resetClockCarry = () => { carry = 0; };
