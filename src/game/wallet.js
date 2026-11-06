// Wallet: every transaction is logged with time, amount, reason, category and balance after.
const listeners = [];
let balance = 0;
const log = [];

export const wallet = {
  get balance() { return balance; },
  get log() { return log; },
  onChange(fn) { listeners.push(fn); },
  add(amount, reason, category = 'other') { return record(amount, reason, category); },
  spend(amount, reason, category = 'other') {
    if (amount > balance) return false;
    record(-amount, reason, category);
    return true;
  },
};

function record(amount, reason, category) {
  balance += amount;
  const tx = { id: log.length + 1, time: new Date(), amount, reason, category, balance };
  log.unshift(tx);
  listeners.forEach(fn => fn(tx));
  return tx;
}

export const naira = n => '₦' + Math.abs(n).toLocaleString('en-NG');
