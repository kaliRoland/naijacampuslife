// Plays through every M-01 "The Bed" choice using the real dialogue file.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clearAllListeners } from '../src/core/events.js';
import { getState, resetState } from '../src/core/state.js';
import { createConversation } from '../src/core/conversation.js';
import { advanceGameMinutes } from '../src/core/time.js';

const M01 = JSON.parse(readFileSync(new URL('../src/data/missions/m01.json', import.meta.url), 'utf8'));
const D = M01.dialogues;
beforeEach(() => { clearAllListeners(); resetState(); });

// helper: choose an option by a piece of its English text
const pick = (conv, text) => {
  const v = conv.view('en'), o = v.options.find(x => x.label.includes(text));
  assert.ok(o, `no option containing "${text}" in ${v.nodeId}`);
  return conv.choose(o.index);
};
const choices = () => getState().choiceLog.filter(c => c.id === 'M01_bed');

test('every dialogue node and option is complete and points somewhere real', () => {
  for (const [id, d] of Object.entries(D)) {
    assert.ok(d.nodes[d.start], `${id}: missing start node`);
    for (const [nid, n] of Object.entries(d.nodes)) {
      assert.ok(n.en && n.pcm, `${id}.${nid}: needs English and Pidgin text`);
      for (const a of n.auto || []) assert.ok(d.nodes[a.next], `${id}.${nid}: bad auto jump ${a.next}`);
      for (const o of n.opts || []) {
        assert.ok(o.en && o.pcm, `${id}.${nid}: option needs English and Pidgin text`);
        for (const nx of [o.next, o.roll?.pass?.next, o.roll?.fail?.next]) if (nx) assert.ok(d.nodes[nx], `${id}.${nid}: bad next ${nx}`);
      }
    }
  }
});

test('1. negotiate: pay the welcome fee, get the window bunk, respect asks follow in 3 days', () => {
  const c = createConversation(D.m01_killer);
  pick(c, 'settle this'); pick(c, 'Pay');
  const s = getState();
  assert.equal(s.money.cash, 6500);
  assert.equal(s.vars.killer_respect, 1); assert.equal(s.vars.leverage, 1);
  assert.ok(s.inventory.window_bunk); assert.ok(s.flags.m01_resolved);
  assert.equal(choices()[0].option, 'negotiate');
  advanceGameMinutes(24 * 60 * 3);
  assert.equal(getState().vars.respect_asks, 1);
  assert.equal(getState().messages.length, 1);
});

test('2. report to the warden: bed returned, snitch label arrives the next day', () => {
  const c = createConversation(D.m01_warden);
  pick(c, 'Killer and his people'); pick(c, 'Thank you');
  const s = getState();
  assert.equal(s.vars.snitch, 1); assert.equal(s.vars.killer_grudge, 2);
  assert.ok(s.flags.m01_out_report); assert.equal(s.money.cash, 8500);
  advanceGameMinutes(24 * 60);
  assert.equal(getState().vars.snitch_label, 1);
  assert.match(getState().messages[0].text, /snitch/);
});

test('3a. challenge Killer and win the check: bed returned, he now fears you a little', () => {
  const c = createConversation(D.m01_killer, () => 0.0);          // dice always pass
  pick(c, 'my bed');
  const s = getState();
  assert.ok(c.roll.passed); assert.ok(s.flags.m01_out_challenge_pass);
  assert.equal(s.vars.bold, 1); assert.equal(s.vars.discipline_risk, 1);
  assert.equal(s.relations.killer.fear, 10); assert.equal(s.health.health, 100);
});

test('3b. challenge Killer and lose: shoved, costs health and cash, but you STILL get a bed (fail-forward)', () => {
  const c = createConversation(D.m01_killer, () => 0.99);         // dice always fail
  pick(c, 'my bed');
  const s = getState();
  assert.ok(!c.roll.passed);
  assert.equal(s.health.health, 90); assert.equal(s.money.cash, 7500);
  assert.ok(s.inventory.spare_bunk); assert.ok(s.flags.m01_resolved); assert.ok(s.flags.fight_record);
  assert.equal(s.vars.bold, 1);
});

test('being bolder makes the check easier', () => {
  const c1 = createConversation(D.m01_killer, () => 0.5);          // 0.35 chance: fails
  pick(c1, 'my bed'); assert.ok(!c1.roll.passed);
  resetState(); getState().vars.bold = 3;                          // 0.35 + 3*0.1 = 0.65: passes
  const c2 = createConversation(D.m01_killer, () => 0.5);
  pick(c2, 'my bed'); assert.ok(c2.roll.passed);
});

test('4. pay another student: N3,500 and a decent bunk', () => {
  const c = createConversation(D.m01_uche);
  pick(c, 'Pay');
  const s = getState();
  assert.equal(s.money.cash, 5000); assert.equal(s.vars.seller_ally, 1); assert.ok(s.inventory.decent_bunk);
  advanceGameMinutes(24 * 60 * 2);
  assert.equal(getState().vars.uche_remembers, 1);
});

test('5. sleep in another room: free tonight, but you owe a Pride-linked student (a favour = compromise)', () => {
  const c = createConversation(D.m01_chuks);
  pick(c, 'Accept');
  const s = getState();
  assert.equal(s.money.cash, 8500);
  assert.equal(s.vars.pride_contact, 1); assert.equal(s.relations.chuks.obligation, 20);
  assert.equal(s.meters.compromise, 5);
  advanceGameMinutes(24 * 60 * 4);
  assert.equal(getState().vars.favour_called, 1);
});

test('6. search off-campus: costs money, skips the hostel storyline', () => {
  const c = createConversation(D.m01_exit);
  pick(c, 'off-campus');
  const s = getState();
  assert.equal(s.money.cash, 5500); assert.equal(s.vars.hostel_exposure, -1); assert.ok(s.flags.m01_out_off_campus);
});

test('you cannot pay what you cannot afford', () => {
  getState().money.cash = 1500;
  const c = createConversation(D.m01_killer);
  pick(c, 'settle this');
  const v = c.view('en'), pay = v.options.find(o => o.label.includes('Pay'));
  assert.ok(pay.disabled); assert.match(pay.why, /Not enough/);
  assert.equal(c.choose(pay.index).ok, false);
  assert.equal(getState().money.cash, 1500);
});

test('after the bed is sorted, everyone talks about it, and only one choice is ever recorded', () => {
  const c = createConversation(D.m01_killer); pick(c, 'settle this'); pick(c, 'Pay');
  assert.equal(choices().length, 1);
  assert.match(createConversation(D.m01_killer).view('en').text, /We are good/);
  assert.match(createConversation(D.m01_warden).view('en').text, /sorted/);
  assert.match(createConversation(D.m01_bed).view('en').text, /Your bed for tonight/);
});

test('the Quiet One always explains the non-violent ways out', () => {
  const c = createConversation(D.m01_quiet);
  pick(c, 'What can I do');
  const t = c.view('en').text;
  for (const word of ['warden', 'Uche', 'Chuks', 'outside the campus']) assert.ok(t.includes(word), `hint should mention ${word}`);
});

test('Pidgin and English both render', () => {
  const c = createConversation(D.m01_killer);
  assert.match(c.view('pcm').text, /Nobody know you/);
  assert.match(c.view('en').text, /Nobody knows you/);
});
