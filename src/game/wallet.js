// Wallet: a friendly face on the core state. The money and the ledger live in PlayerState
// (src/core/state.js); this file only reads them and asks the core to change them.
import { getState, apply } from '../core/state.js';
import { on } from '../core/events.js';

export const wallet = {
  get balance() { return getState().money.cash; },
  get log() { return [...getState().ledger].reverse(); },          // newest first, for the phone
  onChange(fn) { return on('money:changed', fn); },
  add(amount, reason, category = 'other') { apply({ cash: amount, reason, category }); return getState().ledger.at(-1); },
  spend(amount, reason, category = 'other') {
    if (amount > getState().money.cash) return false;
    apply({ cash: -amount, reason, category });
    return true;
  },
};

export const naira = n => '₦' + Math.abs(n).toLocaleString('en-NG');
