// In-game phone: wallet balance, full transaction history (filters + details), messages, and the bag.
import { wallet, naira } from './wallet.js';
import { getState, apply } from '../core/state.js';
import { on } from '../core/events.js';
import { formatStamp } from '../core/time.js';
import { CATEGORIES } from '../data/prices.js';
import ITEMS from '../data/items.json';

const $ = id => document.getElementById(id);
let tab = 'history';       // 'history' | 'messages' | 'bag'
let filter = 'all';        // 'all' | 'in' | 'out'
let open = null;           // expanded transaction id
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const unreadCount = () => getState().messages.filter(m => !m.read).length;

export function renderPhone() {
  const S = getState();
  const totalIn = wallet.log.filter(t => t.amount > 0).reduce((a, t) => a + t.amount, 0);
  const totalOut = wallet.log.filter(t => t.amount < 0).reduce((a, t) => a - t.amount, 0);
  const unread = unreadCount();

  let body = `
    <div class="balance"><small>Wallet balance</small><div id="bal">${naira(wallet.balance)}</div>
      <div class="totals"><span class="in">▲ In ${naira(totalIn)}</span><span class="out">▼ Out ${naira(totalOut)}</span></div>
      <small class="clock-line">${formatStamp(S.time.day, S.time.minutes)}</small></div>
    <div class="tabs">
      <button data-tab="history" class="${tab === 'history' ? 'on' : ''}">Transactions</button>
      <button data-tab="messages" class="${tab === 'messages' ? 'on' : ''}">Messages${unread ? ` <span class="dot">${unread}</span>` : ''}</button>
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
          <div class="tx-t">${esc(t.reason)}<small>${formatStamp(t.day, t.minutes)}</small></div>
          <div class="${t.amount >= 0 ? 'in' : 'out'}">${t.amount >= 0 ? '+' : '-'}${naira(t.amount)}</div></div>
        ${isOpen ? `<div class="tx-detail">
          <div><span>Type</span><b>${t.amount >= 0 ? 'Credit' : 'Debit'}</b></div>
          <div><span>Category</span><b>${c.label}</b></div>
          <div><span>When</span><b>${formatStamp(t.day, t.minutes)}</b></div>
          <div><span>Balance after</span><b>${naira(t.balance)}</b></div>
          <div><span>Reference</span><b>NCL-${String(t.id).padStart(5, '0')}</b></div></div>` : ''}
      </div>`;
    }).join('') : '<p class="empty">No transactions yet.</p>';
  } else if (tab === 'messages') {
    const list = [...S.messages].reverse();
    body += list.length ? list.map(m => `<div class="msg ${m.read ? '' : 'new'}"><div class="msg-from">${esc(m.from)}<small>${formatStamp(m.day, m.minutes)}</small></div><div class="msg-text">${esc(m.text)}</div></div>`).join('')
      : '<p class="empty">No messages yet.</p>';
  } else {
    const items = Object.entries(S.inventory).filter(([, v]) => v).map(([id, v]) => ({ id, n: v, ...(ITEMS[id] || { icon: '🎒', name: id }) }));
    body += items.length
      ? items.map(i => `<div class="bagrow"><span>${i.icon} ${esc(i.name)}</span><b>${typeof i.n === 'number' ? '×' + i.n : '✔'}</b></div>`).join('')
      : '<p class="empty">Your bag is empty.</p>';
  }
  $('phoneBody').innerHTML = body;
}

export function initPhone() {
  $('phoneBody').addEventListener('click', e => {
    const t = e.target.closest('[data-tab],[data-filter],[data-id]');
    if (!t) return;
    if (t.dataset.tab) {
      tab = t.dataset.tab;
      if (tab === 'messages') for (const m of getState().messages) m.read = true;   // reading marks them read
    } else if (t.dataset.filter) filter = t.dataset.filter;
    else if (t.dataset.id) open = open === +t.dataset.id ? null : +t.dataset.id;
    renderPhone();
  });
  for (const ev of ['money:changed', 'inventory:changed', 'message:received', 'time:phase', 'state:loaded']) on(ev, renderPhone);
  renderPhone();
}

export const openMessagesTab = () => { tab = 'messages'; };
void apply;
