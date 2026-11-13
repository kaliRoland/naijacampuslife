// Run with:  npm test
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { on, clearAllListeners } from '../src/core/events.js';
import { getState, resetState, apply, applyAll, check, runDue, recordChoice, newState, setState, SCHEMA } from '../src/core/state.js';
import { phaseOf, formatClock, advanceGameMinutes, advanceReal, skipTo, resetClockCarry } from '../src/core/time.js';
import { pack, unpack, checksum, autosave, readLatestAutosave, saveSlot, readSlot, migrate, MIGRATIONS, normalise } from '../src/core/save.js';

const fakeStorage = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), _m: m }; };

beforeEach(() => { clearAllListeners(); resetState(); resetClockCarry(); });

// ------------------------------------------------------------------ state and effects
test('the player starts with N8,500 on Day 1 evening', () => {
  const s = getState();
  assert.equal(s.money.cash, 8500);
  assert.equal(s.time.day, 1);
  assert.equal(phaseOf(s.time.minutes), 'evening');
});

test('money effects change the balance, write the ledger and announce it', () => {
  const heard = [];
  on('money:changed', tx => heard.push(tx));
  apply({ cash: -2000, reason: 'Welcome fee', category: 'fees' });
  const s = getState();
  assert.equal(s.money.cash, 6500);
  assert.equal(s.ledger.length, 1);
  assert.deepEqual([s.ledger[0].amount, s.ledger[0].reason, s.ledger[0].balance], [-2000, 'Welcome fee', 6500]);
  assert.equal(heard.length, 1);
});

test('hidden variables add up and can be set', () => {
  apply({ var: 'killer_respect', add: 1 });
  apply({ var: 'killer_respect', add: 1 });
  apply({ var: 'snitch', set: 3 });
  assert.equal(getState().vars.killer_respect, 2);
  assert.equal(getState().vars.snitch, 3);
});

test('items, counts and flags', () => {
  apply({ item: 'bed_slip', give: true });
  apply({ item: 'pie', give: 2 }); apply({ item: 'pie', give: 1 });
  apply({ flag: 'registered' });
  assert.equal(getState().inventory.bed_slip, true);
  assert.equal(getState().inventory.pie, 3);
  assert.equal(getState().flags.registered, true);
  apply({ item: 'bed_slip', take: true });
  assert.equal(getState().inventory.bed_slip, undefined);
});

test('meters and trust stay inside their limits', () => {
  apply({ meter: 'compromise', add: 250 });
  apply({ meter: 'heat', add: -50 });
  apply({ rel: 'killer', stat: 'trust', add: -500 });
  apply({ rel: 'amara', stat: 'trust', add: 20 });
  const s = getState();
  assert.equal(s.meters.compromise, 100);
  assert.equal(s.meters.heat, 0);
  assert.equal(s.relations.killer.trust, -100);
  assert.equal(s.relations.amara.trust, 20);
});

test('conditions: var, cash, flags, any, all, not, mission', () => {
  apply({ var: 'killer_respect', add: 2 }); apply({ flag: 'registered' }); apply({ mission: 'M-01', status: 'done' });
  assert.ok(check({ var: ['killer_respect', '>=', 2] }));
  assert.ok(!check({ var: ['killer_respect', '>', 2] }));
  assert.ok(check({ cash: ['>=', 8000] }));
  assert.ok(check({ flag: 'registered', notFlag: 'snitch' }));
  assert.ok(check({ any: [{ flag: 'nope' }, { flag: 'registered' }] }));
  assert.ok(!check({ all: [{ flag: 'nope' }, { flag: 'registered' }] }));
  assert.ok(check({ not: { flag: 'nope' } }));
  assert.ok(check({ mission: ['M-01', 'done'] }));
  assert.ok(check(undefined));
});

// ------------------------------------------------------------------ choices and delayed effects
test('a choice applies immediate and hidden effects, feeds the Slide, and is logged', () => {
  const made = [];
  on('choice:made', r => made.push(r));
  recordChoice({
    id: 'M01_bed', missionId: 'M-01', option: 'negotiate', who: ['killer'],
    effects: [{ cash: -2000, reason: 'Welcome fee', category: 'fees' }],
    hidden: [{ var: 'killer_respect', add: 1 }, { var: 'leverage', add: 1 }],
    compromise: 3, visibility: 5,
  });
  const s = getState();
  assert.equal(s.money.cash, 6500);
  assert.equal(s.vars.killer_respect, 1);
  assert.equal(s.meters.compromise, 3);
  assert.equal(s.meters.notice, 5);
  assert.equal(s.choiceLog.length, 1);
  assert.equal(made[0].option, 'negotiate');
});

test('delayed effects wait for their day, then fire once', () => {
  recordChoice({ id: 'x', delayed: [{ afterDays: 3, effects: [{ var: 'respect_asks', add: 1 }] }] });
  assert.equal(getState().scheduled.length, 1);
  advanceGameMinutes(24 * 60 * 2);                               // two days: not yet
  assert.equal(getState().vars.respect_asks, undefined);
  advanceGameMinutes(24 * 60);                                   // third day: fires
  assert.equal(getState().vars.respect_asks, 1);
  assert.equal(getState().scheduled.length, 0);
  advanceGameMinutes(24 * 60 * 2);                               // never fires twice
  assert.equal(getState().vars.respect_asks, 1);
});

test('delayed effects can wait for a condition instead of a day', () => {
  apply({ schedule: { when: { var: ['scam_risk', '>=', 2] }, effects: [{ flag: 'scammed' }] } });
  runDue();
  assert.equal(getState().flags.scammed, undefined);
  apply({ var: 'scam_risk', add: 2 });
  runDue();
  assert.equal(getState().flags.scammed, true);
});

test('debts, records and grudges persist: nothing resets on a new day', () => {
  apply({ var: 'killer_grudge', add: 2 }); apply({ cash: -3000, reason: 'Debt payment' });
  advanceGameMinutes(24 * 60 * 5);
  assert.equal(getState().vars.killer_grudge, 2);
  assert.equal(getState().ledger.length, 1);
});

// ------------------------------------------------------------------ time
test('phases: morning, afternoon, evening, night', () => {
  assert.equal(phaseOf(7 * 60), 'morning');
  assert.equal(phaseOf(12 * 60), 'afternoon');
  assert.equal(phaseOf(17 * 60), 'evening');
  assert.equal(phaseOf(21 * 60), 'night');
  assert.equal(phaseOf(3 * 60), 'night');
});

test('clock text', () => {
  assert.equal(formatClock(18 * 60), '6:00 pm');
  assert.equal(formatClock(0), '12:00 am');
  assert.equal(formatClock(12 * 60 + 5), '12:05 pm');
});

test('1 real minute is 20 game minutes', () => {
  const t0 = getState().time.minutes;
  advanceReal(60);
  assert.equal(getState().time.minutes - t0, 20);
});

test('the day rolls over at midnight and announces it', () => {
  const days = [], phases = [];
  on('time:day', d => days.push(d.day)); on('time:phase', p => phases.push(p.phase));
  getState().time.minutes = 23 * 60 + 58;
  advanceGameMinutes(5);
  assert.equal(getState().time.day, 2);
  assert.deepEqual(days, [2]);
  assert.equal(getState().time.minutes, 3);
  assert.ok(phases.length >= 0);
});

test('skipTo jumps to the next 6:00 am (sleeping)', () => {
  skipTo(6, 0);
  assert.equal(getState().time.minutes, 6 * 60);
  assert.equal(getState().time.day, 2);
});

// ------------------------------------------------------------------ saving
test('a save round-trips exactly', () => {
  apply({ cash: -500, reason: 'Pie' }); apply({ var: 'snitch', add: 2 }); apply({ item: 'receipt' });
  const before = JSON.stringify(getState());
  const back = unpack(pack(getState()));
  assert.equal(JSON.stringify(back), before);
});

test('a damaged save is rejected', () => {
  const env = JSON.parse(pack(getState()));
  env.state.money.cash = 999999;                                   // tampered or corrupted
  assert.throws(() => unpack(JSON.stringify(env)), /damaged/);
  assert.throws(() => unpack('not json at all'), /not readable/);
});

test('autosave keeps three, and falls back to the previous one if the newest is damaged', () => {
  const st = fakeStorage();
  for (let i = 1; i <= 4; i++) { apply({ var: 'step', set: i }); autosave(st); }
  assert.equal(readLatestAutosave(st).state.vars.step, 4);
  st.setItem('ncl:save:auto:0', 'garbage');                        // damage the newest
  const r = readLatestAutosave(st);
  assert.equal(r.state.vars.step, 3);
  assert.equal(r.usedFallback, true);
});

test('manual slots', () => {
  const st = fakeStorage();
  apply({ flag: 'registered' });
  saveSlot(2, st);
  assert.equal(readSlot(2, st).flags.registered, true);
  assert.equal(readSlot(3, st), null);
});

test('old saves are migrated forward, newer saves are refused', () => {
  const old = { ...newState(), schema: 0 };
  assert.throws(() => migrate(old, 0), /No migration/);
  MIGRATIONS[0] = s => ({ ...s, vars: { ...s.vars, migrated: 1 } });
  const up = migrate(old, 0);
  assert.equal(up.vars.migrated, 1);
  assert.equal(up.schema, 1);
  delete MIGRATIONS[0];
  assert.throws(() => migrate({ ...newState(), schema: SCHEMA + 1 }, SCHEMA + 1), /newer version/);
});

test('missing fields in an older save are filled in', () => {
  const partial = { schema: 1, money: { cash: 10 } };
  const full = normalise(partial);
  assert.equal(full.money.cash, 10);
  assert.equal(full.money.bank, 0);
  assert.deepEqual(full.choiceLog, []);
  assert.equal(typeof checksum('x'), 'string');
});
