// Dialogue screen: shows a conversation as a bottom sheet with choices (English / Pidgin).
// The logic lives in src/core/conversation.js (tested); this file only draws it.
import { DIALOGUES as LEGACY } from '../data/dialogue.js';
import M01 from '../data/missions/m01.json';
import { KIOSK_ITEMS, PRICES } from '../data/prices.js';
import { game, setLang } from './state.js';
import { wallet, naira } from './wallet.js';
import { createConversation } from '../core/conversation.js';
import { apply } from '../core/state.js';

// Every dialogue the game knows. New missions add their JSON file here.
export const DIALOGUES = { ...LEGACY, ...M01.dialogues };

const $ = id => document.getElementById(id);
let conv = null, onClose = null, rollNote = '';

export const isTalking = () => conv !== null;

export function startDialogue(id, done) {
  const dlg = DIALOGUES[id];
  if (!dlg) return false;
  onClose = done; rollNote = '';
  conv = createConversation(dlg);
  $('dialogue').hidden = false;
  render();
  return true;
}

function close() {
  const cb = onClose;
  conv = null; onClose = null;
  $('dialogue').hidden = true;
  cb?.();
}

const price = base => Math.round(base * (game.flags.haggled ? 1 - PRICES.haggleDiscount : 1));

function render() {
  if (conv.finished) return close();
  const L = game.lang, v = conv.view(L);
  $('dlgName').textContent = v.who;
  $('dlgText').textContent = (rollNote ? rollNote + '\n\n' : '') + v.text;
  $('dlgLang').textContent = L === 'pcm' ? '🇳🇬 Pidgin  ⇄  English' : '🇬🇧 English  ⇄  Pidgin';
  const box = $('dlgOpts'); box.innerHTML = '';

  if (v.shop) {                                                  // the (parked) supplies kiosk
    KIOSK_ITEMS.forEach(item => {
      const p = price(item.price), owned = !!game.inv[item.id] && item.required;
      const b = document.createElement('button');
      b.className = 'opt shop' + (owned ? ' owned' : '');
      b.innerHTML = `<span>${item.icon} ${item.name}</span><b>${owned ? '✔ Bought' : naira(p)}</b>`;
      b.disabled = owned || wallet.balance < p;
      if (!owned && wallet.balance < p) b.innerHTML += '<small>Not enough money</small>';
      b.onclick = () => {
        if (!wallet.spend(p, `${item.name} (Supplies Kiosk)`, 'supplies')) return;
        apply(item.required ? { item: item.id, give: true } : { item: item.id, give: 1 });
        render();
      };
      box.appendChild(b);
    });
  }

  v.options.forEach(o => {
    const b = document.createElement('button');
    b.className = 'opt';
    b.innerHTML = `<span>${o.label}</span>` + (o.disabled ? `<small>${o.why}</small>` : '');
    b.disabled = o.disabled;
    b.onclick = () => {
      const r = conv.choose(o.index);
      rollNote = r.roll ? (r.roll.passed ? '🎲 You held your nerve.' : '🎲 It did not go your way.') : '';
      render();
    };
    box.appendChild(b);
  });
}

$('dlgLang').onclick = () => { setLang(game.lang === 'pcm' ? 'en' : 'pcm'); if (conv) render(); };
