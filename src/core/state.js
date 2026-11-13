// PlayerState: the one place everything the story reads is kept (GDD section 13).
// Rules:
//  * Only this file changes the state, and only through apply()/applyAll() "effects".
//  * Everything else reads it (getState) or listens for events (on).
//  * Missions never read each other: they only read and write state.
import { emit } from './events.js';

export const SCHEMA = 1;                 // bump when the saved shape changes, and add a migration in save.js

export function newState() {
  return {
    schema: SCHEMA,
    identity: { name: 'Tobi Adeyemi', gender: 'm' },
    time: { day: 1, minutes: 18 * 60 },  // Day 1, 6:00 pm (minutes since midnight)
    money: { cash: 8500, bank: 0 },      // GDD: the player starts with N8,500
    ledger: [],                          // every transaction, oldest first
    inventory: {},                       // item id -> true or a count
    flags: {},                           // story memory: { registered: true }
    vars: {},                            // hidden numbers: killer_respect, snitch, scam_risk ...
    meters: { compromise: 0, notice: 0, heat: 0 },
    relations: {},                       // character id -> { trust, fear, affection, obligation }
    health: { health: 100, stress: 0 },
    missions: {},                        // 'M-01' -> 'active' | 'done'
    choiceLog: [],                       // every important choice, oldest first
    scheduled: [],                       // delayed effects waiting for their day or condition
    nextId: 1,
  };
}

let S = newState();
export const getState = () => S;
export function setState(next) { S = next; emit('state:loaded', S); }
export function resetState() { setState(newState()); }

// ---------------------------------------------------------------- conditions
// JSON-friendly. All keys present must hold.
//   { flag:"registered" } { notFlag:"x" } { has:["item"] } { notHas:["item"] }
//   { var:["killer_respect", ">=", 2] } { cash:[">=", 1000] } { meter:["compromise", ">", 10] }
//   { mission:["M-01","done"] } { any:[cond,...] } { all:[cond,...] } { not: cond }
const OPS = { '>=': (a, b) => a >= b, '>': (a, b) => a > b, '<=': (a, b) => a <= b, '<': (a, b) => a < b, '==': (a, b) => a === b, '!=': (a, b) => a !== b };

export function check(c, st = S) {
  if (!c) return true;
  if (c.flag && !st.flags[c.flag]) return false;
  if (c.notFlag && st.flags[c.notFlag]) return false;
  if (c.has && !c.has.every(i => st.inventory[i])) return false;
  if (c.notHas && c.notHas.some(i => st.inventory[i])) return false;
  if (c.var) { const [n, op, v] = c.var; if (!OPS[op]((st.vars[n] ?? 0), v)) return false; }
  if (c.cash) { const [op, v] = c.cash; if (!OPS[op](st.money.cash, v)) return false; }
  if (c.meter) { const [n, op, v] = c.meter; if (!OPS[op]((st.meters[n] ?? 0), v)) return false; }
  if (c.mission && (st.missions[c.mission[0]] ?? 'none') !== c.mission[1]) return false;
  if (c.any && !c.any.some(x => check(x, st))) return false;
  if (c.all && !c.all.every(x => check(x, st))) return false;
  if (c.not && check(c.not, st)) return false;
  return true;
}

// ---------------------------------------------------------------- effects
// One effect is a small object. Several keys may be combined in one effect.
//   { cash:-2000, reason:"Welcome fee", category:"fees" }   money in or out (also written to the ledger)
//   { var:"killer_respect", add:1 }  { var:"x", set:5 }     hidden numbers
//   { flag:"snitch", set:true }
//   { item:"bed_slip", give:true } { item:"bed_slip", take:true } { item:"pie", give:2 }
//   { meter:"compromise", add:3 }                           compromise / notice / heat
//   { rel:"killer", stat:"trust", add:-5 }                  relationships
//   { health:-10 } { stress:+5 }
//   { mission:"M-01", status:"active" }
//   { schedule:{ afterDays:3, effects:[...] } }             delayed effect (day count)
//   { schedule:{ when:{cond}, effects:[...] } }             delayed effect (waits for a condition)
//   { event:"killer:angry", data:{...} }                    announce something to other modules
export function apply(e) {
  if (e.cash !== undefined) addMoney(e.cash, e.reason, e.category);
  if (e.var) {
    const cur = S.vars[e.var] ?? 0;
    S.vars[e.var] = e.set !== undefined ? e.set : cur + (e.add ?? 0);
    emit('var:changed', { name: e.var, value: S.vars[e.var] });
  }
  if (e.flag) { S.flags[e.flag] = e.set === undefined ? true : e.set; emit('flag:changed', { name: e.flag, value: S.flags[e.flag] }); }
  if (e.item) {
    if (e.take) delete S.inventory[e.item];
    else if (typeof e.give === 'number') S.inventory[e.item] = (typeof S.inventory[e.item] === 'number' ? S.inventory[e.item] : 0) + e.give;
    else S.inventory[e.item] = true;
    emit('inventory:changed', { item: e.item, value: S.inventory[e.item] });
  }
  if (e.meter) {
    S.meters[e.meter] = clamp((S.meters[e.meter] ?? 0) + (e.add ?? 0), 0, 100);
    emit('meter:changed', { name: e.meter, value: S.meters[e.meter] });
  }
  if (e.rel) {
    const r = (S.relations[e.rel] ||= { trust: 0, fear: 0, affection: 0, obligation: 0 });
    const stat = e.stat || 'trust';
    r[stat] = clamp((r[stat] ?? 0) + (e.add ?? 0), stat === 'trust' ? -100 : 0, 100);
    emit('relation:changed', { who: e.rel, stat, value: r[stat] });
  }
  if (e.health !== undefined) S.health.health = clamp(S.health.health + e.health, 0, 100);
  if (e.stress !== undefined) S.health.stress = clamp(S.health.stress + e.stress, 0, 100);
  if (e.mission) { S.missions[e.mission] = e.status || 'active'; emit('mission:changed', { id: e.mission, status: S.missions[e.mission] }); }
  if (e.schedule) schedule(e.schedule);
  if (e.event) emit(e.event, e.data);
}
export function applyAll(list = []) { for (const e of list) apply(e); }

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function addMoney(amount, reason = 'Transaction', category = 'other') {
  S.money.cash += amount;
  const tx = { id: S.nextId++, day: S.time.day, minutes: S.time.minutes, amount, reason, category, balance: S.money.cash };
  S.ledger.push(tx);
  emit('money:changed', tx);
  return tx;
}

// ---------------------------------------------------------------- delayed effects (the scheduler)
function schedule(s) {
  S.scheduled.push({ id: S.nextId++, dueDay: s.afterDays !== undefined ? S.time.day + s.afterDays : null, when: s.when || null, effects: s.effects || [] });
}

// Run everything whose day has come or whose condition is now true. Call when the day changes
// (and whenever state changes in a way a "when" condition may care about).
export function runDue() {
  const due = S.scheduled.filter(x => (x.dueDay !== null && x.dueDay <= S.time.day && check(x.when)) || (x.dueDay === null && check(x.when)));
  if (!due.length) return 0;
  S.scheduled = S.scheduled.filter(x => !due.includes(x));
  for (const d of due) { applyAll(d.effects); emit('scheduled:fired', d); }
  return due.length;
}

// ---------------------------------------------------------------- choices (GDD "ChoiceRecord")
// choice = { id, missionId, option, who:[ids], effects:[...], hidden:[...], delayed:[...],
//            compromise:int, visibility:int }
export function recordChoice(choice) {
  applyAll(choice.effects);
  applyAll(choice.hidden);
  for (const d of choice.delayed || []) apply({ schedule: d });
  if (choice.compromise) apply({ meter: 'compromise', add: choice.compromise });   // feeds the Slide
  if (choice.visibility) apply({ meter: 'notice', add: choice.visibility });       // feeds Chairman's Notice
  const rec = { id: choice.id, day: S.time.day, minutes: S.time.minutes, mission: choice.missionId || null, option: choice.option || null, who: choice.who || [] };
  S.choiceLog.push(rec);
  emit('choice:made', rec);
  return rec;
}
