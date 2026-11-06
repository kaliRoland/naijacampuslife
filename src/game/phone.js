// In-game phone: wallet balance, full transaction history (filters + details), and the bag.
import { wallet, naira } from './wallet.js';
import { game } from './state.js';
import { CATEGORIES, KIOSK_ITEMS } from '../data/prices.js';

const $ = id => document.getElementById(id);
let tab = 'history';       // 'history' | 'bag'
let filter = 'all';        // 'all' | 'in' | 'out'
let open = null;           // expanded transaction id

const date = d => d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
const time = d => d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function renderPhone() {
  const totalIn = wallet.log.filter(t => t.amount > 0).reduce((a, t) => a + t.amount, 0);
  const totalOut = wallet.log.filter(t => t.amount < 0).reduce((a, t) => a - t.amount, 0);

  let body = `
    <div class="balance"><small>Wallet balance</small><div id="bal">${naira(wallet.balance)}</div>
      <div class="totals"><span class="in">▲ In ${naira(totalIn)}</span><span class="out">▼ Out ${naira(totalOut)}</span></div></div>
    <div class="tabs">
      <button data-tab="history" class="${tab === 'history' ? 'on' : ''}">Transactions</button>
      <button data-tab="bag" class="${tab === 'bag' ? 'on' : ''}">Bag</button>
    </div>`;

  if (tab === 'history') {
    const rows = wallet.log.filter(t => filter === 'all' || (filter === 'in' ? t.amount > 0 : t.amount < 0));
    body += `<div class="filters">${[['all', 'All'], ['in', 'Money in'], ['out', 'Money out']]
      .map(([k, l]) => `<button data-filter="${k}" class="${filter === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    body += rows.length ? rows.map(t => {
      const c = CATEGORIES[t.category] || CATEGORIES.other, isOpen = open === t.id;
      return `<div class="tx ${isOpen ? 'open' : ''}" data-id="${t.id}">
        <div class="tx-main"><div class="ico">${c.icon}</div>
          <div class="tx-t">${esc(t.reason)}<small>${date(t.time)} · ${time(t.time)}</small></div>
          <div class="${t.amount >= 0 ? 'in' : 'out'}">${t.amount >= 0 ? '+' : '-'}${naira(t.amount)}</div></div>
        ${isOpen ? `<div class="tx-detail">
          <div><span>Type</span><b>${t.amount >= 0 ? 'Credit' : 'Debit'}</b></div>
          <div><span>Category</span><b>${c.label}</b></div>
          <div><span>Date and time</span><b>${date(t.time)}, ${time(t.time)}</b></div>
          <div><span>Balance after</span><b>${naira(t.balance)}</b></div>
          <div><span>Reference</span><b>NCL-${String(t.id).padStart(5, '0')}</b></div></div>` : ''}
      </div>`;
    }).join('') : '<p class="empty">No transactions here yet.</p>';
  } else {
    const items = [
      ...KIOSK_ITEMS.filter(i => game.inv[i.id]).map(i => ({ icon: i.icon, name: i.name, n: game.inv[i.id] })),
      ...(game.inv.receipt ? [{ icon: '🧾', name: 'Registration receipt (stamped)', n: true }] : []),
    ];
    body += items.length
      ? items.map(i => `<div class="bagrow"><span>${i.icon} ${i.name}</span><b>${typeof i.n === 'number' ? '×' + i.n : '✔'}</b></div>`).join('')
      : '<p class="empty">Your bag is empty. Visit the Supplies Kiosk.</p>';
  }
  $('phoneBody').innerHTML = body;
}

export function initPhone() {
  $('phoneBody').addEventListener('click', e => {
    const t = e.target.closest('[data-tab],[data-filter],[data-id]');
    if (!t) return;
    if (t.dataset.tab) tab = t.dataset.tab;
    else if (t.dataset.filter) filter = t.dataset.filter;
    else if (t.dataset.id) open = open === +t.dataset.id ? null : +t.dataset.id;
    renderPhone();
  });
  wallet.onChange(renderPhone);
  document.addEventListener('inventory', renderPhone);
  renderPhone();
}
