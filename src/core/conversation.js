// Conversation engine (no screen code, so it can be tested): walks a dialogue graph and applies
// every choice through the core state. Dialogue lives in JSON under src/data/ so writers can edit it.
//
// A dialogue:  { "id":"...", "start":"nodeId", "nodes": { "nodeId": NODE } }
// NODE:   { who, en, pcm, auto?:[{ if, next }], effects?:[...], opts?:[OPTION], shop?:true }
//         auto   = jump to another node if a condition holds (checked in order)
//         effects= applied once when the node is shown
// OPTION: { en, pcm, next, requires?:cond, cost?:number, reason?, category?, effects?:[...],
//           choice?:{ id, mission, who, hidden:[...], delayed:[...], compromise, visibility },
//           roll?:{ chance, bonusVar, per, pass:{ next, effects }, fail:{ next, effects } } }
//         choice = recorded in the choice log (the GDD "ChoiceRecord"); its hidden effects stay hidden
//         roll   = a confidence check: chance + (bonusVar * per). Failing never blocks the story.
import { getState, apply, applyAll, check, recordChoice } from './state.js';
import { emit } from './events.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Older dialogue files used { set:{flag:true}, give:'item' }. Turn those into effects.
export function legacyEffects(o) {
  const out = [];
  if (o.set) for (const [k, v] of Object.entries(o.set)) out.push({ flag: k, set: v });
  if (o.give) out.push({ item: o.give, give: true });
  return out;
}

export function createConversation(dlg, rng = Math.random) {
  let nodeId = null, finished = false, lastRoll = null;

  const node = () => dlg.nodes[nodeId];

  function enter(id) {
    if (id === null || id === undefined) { finished = true; emit('conversation:end', { id: dlg.id }); return; }
    let n = dlg.nodes[id], guard = 0;
    while (n && n.auto && guard++ < 6) {                       // automatic jumps
      const j = n.auto.find(a => check(a.if));
      if (!j) break;
      id = j.next; n = dlg.nodes[id];
    }
    if (!n) throw new Error(`Dialogue "${dlg.id}" has no node "${id}"`);
    nodeId = id;
    applyAll(n.effects); applyAll(legacyEffects(n));
    emit('conversation:node', { dialogue: dlg.id, node: id });
  }

  function view(lang = 'pcm') {
    const n = node();
    const options = (n.opts || []).map((o, index) => ({ o, index }))
      .filter(({ o }) => check(o.requires))
      .map(({ o, index }) => {
        const poor = o.cost !== undefined && getState().money.cash < o.cost;
        return { index, label: o[lang] || o.en, cost: o.cost, disabled: poor, why: poor ? 'Not enough money' : '' };
      });
    return { who: n.who, text: n[lang] || n.en, options, shop: !!n.shop, nodeId };
  }

  function choose(index) {
    const o = node().opts[index];
    if (!o) throw new Error('No such option');
    if (!check(o.requires)) throw new Error('Option is not available');
    const cash = getState().money.cash;
    if (o.cost !== undefined && cash < o.cost) return { ok: false, why: 'Not enough money' };

    let effects = [];
    if (o.cost) effects.push({ cash: -o.cost, reason: o.reason || 'Payment', category: o.category || 'other' });
    effects = effects.concat(o.effects || [], legacyEffects(o));

    let next = o.next;
    lastRoll = null;
    if (o.roll) {                                              // a confidence check
      const r = o.roll, chance = clamp((r.chance ?? 0.5) + (getState().vars[r.bonusVar] ?? 0) * (r.per ?? 0.1), 0.05, 0.95);
      const passed = rng() < chance;
      lastRoll = { passed, chance };
      const out = passed ? r.pass : r.fail;
      effects = effects.concat(out.effects || []);
      next = out.next;
    }

    if (o.choice) recordChoice({ ...o.choice, option: o.choice.option || o.en, effects });
    else applyAll(effects);

    enter(next);
    return { ok: true, roll: lastRoll, finished };
  }

  enter(dlg.start);
  return { view, choose, get finished() { return finished; }, get roll() { return lastRoll; }, get id() { return dlg.id; } };
}
