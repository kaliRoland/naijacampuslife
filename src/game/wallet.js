// Wallet: every transaction is logged with time, amount, reason and balance after.
const listeners = [];
let balance = 0;
const log = [];

export const wallet = {
  get balance() { return balance; },
  get log() { return log; },
  onChange(fn) { listeners.push(fn); },
  add(amount, reason) { return record(amount, reason); },
  spend(amount, reason) {
    if (amount > balance) return false;
    record(-amount, reason);
    return true;
  },
};

function record(amount, reason) {
  balance += amount;
  const tx = { time: new Date(), amount, reason, balance };
  log.unshift(tx);
  listeners.forEach(fn => fn(tx));
  return tx;
}

export const naira = n => '₦' + Math.abs(n).toLocaleString('en-NG');
