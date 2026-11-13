// A read-only view of the story state for the screens, plus the language setting.
// The real data lives in src/core/state.js; change it only with apply() effects.
import { getState, check as coreCheck } from '../core/state.js';

export const game = {
  get flags() { return getState().flags; },
  get inv() { return getState().inventory; },
  lang: 'pcm',    // 'pcm' = Pidgin, 'en' = English
};

try { const l = localStorage.getItem('ncl-lang'); if (l === 'en' || l === 'pcm') game.lang = l; } catch { /* ignore */ }

export function setLang(l) {
  game.lang = l;
  try { localStorage.setItem('ncl-lang', l); } catch { /* ignore */ }
}

export const check = coreCheck;
