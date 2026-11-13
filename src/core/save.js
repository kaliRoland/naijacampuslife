// Saving (GDD section 13): versioned JSON, a checksum, autosave history, 3 manual slots.
// Local-first: everything goes in the device's storage. Cloud sync comes later and is never required.
import { SCHEMA, newState, getState, setState } from './state.js';

// When the saved shape changes: bump SCHEMA in state.js and add a function here that turns
// a version-N state into a version-N+1 state. Example:  MIGRATIONS[1] = s => ({ ...s, newField: 0 });
export const MIGRATIONS = {};

const AUTO_KEYS = ['ncl:save:auto:0', 'ncl:save:auto:1', 'ncl:save:auto:2'];   // newest first
const SLOT_KEY = n => `ncl:save:slot:${n}`;

// FNV-1a: small and fast, enough to notice a damaged save (it is not security).
export function checksum(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

export function pack(state, now = Date.now()) {
  const body = JSON.stringify(state);
  return JSON.stringify({ schema: state.schema, savedAt: now, checksum: checksum(body), state });
}

export function unpack(text) {
  let env;
  try { env = JSON.parse(text); } catch { throw new Error('Save is not readable'); }
  if (!env || typeof env !== 'object' || !env.state) throw new Error('Save is missing its data');
  if (checksum(JSON.stringify(env.state)) !== env.checksum) throw new Error('Save is damaged (checksum does not match)');
  return normalise(migrate(env.state, env.schema ?? env.state.schema ?? 1));
}

export function migrate(state, from) {
  let s = state, v = from;
  if (v > SCHEMA) throw new Error('Save is from a newer version of the game');
  while (v < SCHEMA) {
    const step = MIGRATIONS[v];
    if (!step) throw new Error(`No migration from save version ${v}`);
    s = step(s); v += 1; s.schema = v;
  }
  return s;
}

// Fill in anything missing so a slightly older or partial save still loads.
export function normalise(state) {
  const base = newState();
  const out = { ...base, ...state };
  for (const k of ['identity', 'time', 'money', 'meters', 'health']) out[k] = { ...base[k], ...(state[k] || {}) };
  return out;
}

const store = () => globalThis.localStorage;

// Autosave keeps the three newest saves, so one damaged save never costs the whole game.
export function autosave(storage = store(), state = getState()) {
  const text = pack(state);
  for (let i = AUTO_KEYS.length - 1; i > 0; i--) {
    const older = storage.getItem(AUTO_KEYS[i - 1]);
    if (older !== null) storage.setItem(AUTO_KEYS[i], older);
  }
  storage.setItem(AUTO_KEYS[0], text);
}

export function saveSlot(n, storage = store(), state = getState()) { storage.setItem(SLOT_KEY(n), pack(state)); }

// Returns { state, usedFallback } or null when there is nothing usable. Does not apply it: call setState().
export function readLatestAutosave(storage = store()) {
  let failed = false;
  for (const key of AUTO_KEYS) {
    const text = storage.getItem(key);
    if (text === null) continue;
    try { return { state: unpack(text), usedFallback: failed }; } catch { failed = true; }
  }
  return null;
}

export function readSlot(n, storage = store()) {
  const text = storage.getItem(SLOT_KEY(n));
  return text === null ? null : unpack(text);       // throws if damaged: the caller shows a friendly message
}

export function describeSave(text) {
  try { const e = JSON.parse(text); return { savedAt: e.savedAt, day: e.state.time.day, cash: e.state.money.cash }; } catch { return null; }
}

export function hasAnySave(storage = store()) {
  return AUTO_KEYS.some(k => storage.getItem(k) !== null);
}

export function loadAutosave(storage = store()) {
  const r = readLatestAutosave(storage);
  if (r) setState(r.state);
  return r;
}
