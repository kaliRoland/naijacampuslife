// Dialogue engine: shows a conversation as a bottom sheet with choices (English / Pidgin).
import { DIALOGUES } from '../data/dialogue.js';
import { KIOSK_ITEMS, PRICES } from '../data/prices.js';
import { game, check, setLang } from './state.js';
import { wallet, naira } from './wallet.js';

const $ = id => document.getElementById(id);
let current = null;      // { dlg, onClose }
let nodeId = null;

export const isTalking = () => current !== null;

export function startDialogue(id, onClose) {
  const dlg = DIALOGUES[id];
  if (!dlg) return;
  current = { dlg, onClose };
  $('dialogue').hidden = false;
  go(dlg.start);
}

function end() {
  const cb = current?.onClose;
  current = null; $('dialogue').hidden = true;
  cb?.();
}

function go(id) {
  if (id === null || id === undefined) return end();
  let node = current.dlg.nodes[id];
  // Auto-jumps (conditions checked in order)
  for (let guard = 0; guard < 5; guard++) {
    const jump = node.auto?.find(a => check(a.if));
    if (!jump) break;
    id = jump.next; node = current.dlg.nodes[id];
  }
  nodeId = id;
  if (node.set) Object.assign(game.flags, node.set);
  if (node.give) game.inv[node.give] = true;
  render();
}

const price = base => Math.round(base * (game.flags.haggled ? 1 - PRICES.haggleDiscount : 1));

function render() {
  const node = current.dlg.nodes[nodeId], L = game.lang;
  $('dlgName').textContent = node.who;
  $('dlgText').textContent = node[L];
  $('dlgLang').textContent = L === 'pcm' ? '🇳🇬 Pidgin  ⇄  English' : '🇬🇧 English  ⇄  Pidgin';
  const box = $('dlgOpts'); box.innerHTML = '';

  if (node.shop) {
    KIOSK_ITEMS.forEach(item => {
      const p = price(item.price), owned = !!game.inv[item.id] && item.required;
      const b = document.createElement('button');
      b.className = 'opt shop' + (owned ? ' owned' : '');
      b.innerHTML = `<span>${item.icon} ${item.name}</span><b>${owned ? '✔ Bought' : naira(p)}</b>`;
      b.disabled = owned || wallet.balance < p;
      if (!owned && wallet.balance < p) b.innerHTML += '<small>Not enough money</small>';
      b.onclick = () => {
        if (!wallet.spend(p, `${item.name} (Supplies Kiosk)`, 'supplies')) return;
        game.inv[item.id] = item.required ? true : (game.inv[item.id] || 0) + 1;
        document.dispatchEvent(new CustomEvent('inventory'));
        render();
      };
      box.appendChild(b);
    });
  }

  (node.opts || []).filter(o => check(o.requires)).forEach(o => {
    const b = document.createElement('button');
    b.className = 'opt';
    const cant = o.cost && wallet.balance < o.cost;
    b.innerHTML = `<span>${o[L]}</span>` + (cant ? '<small>Not enough money</small>' : '');
    b.disabled = !!cant;
    b.onclick = () => {
      if (o.cost && !wallet.spend(o.cost, o.reason || 'Payment', o.category || 'other')) return;
      if (o.set) Object.assign(game.flags, o.set);
      go(o.next);
    };
    box.appendChild(b);
  });
}

$('dlgLang').onclick = () => { setLang(game.lang === 'pcm' ? 'en' : 'pcm'); if (current) render(); };
