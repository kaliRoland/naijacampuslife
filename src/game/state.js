// What the player has done and carries. (Saving to the device comes in Week 3.)
export const game = {
  flags: {},      // story memory, e.g. { registered: true }
  inv: {},        // things in the bag, e.g. { photos: true }
  lang: 'pcm',    // 'pcm' = Pidgin, 'en' = English
};

try { const l = localStorage.getItem('ncl-lang'); if (l === 'en' || l === 'pcm') game.lang = l; } catch { /* ignore */ }

export function setLang(l) {
  game.lang = l;
  try { localStorage.setItem('ncl-lang', l); } catch { /* ignore */ }
}

// Condition check used by dialogue: { has:[...], flag:'x', notFlag:'x' }
export function check(c) {
  if (!c) return true;
  if (c.has && !c.has.every(i => game.inv[i])) return false;
  if (c.flag && !game.flags[c.flag]) return false;
  if (c.notFlag && game.flags[c.notFlag]) return false;
  return true;
}
