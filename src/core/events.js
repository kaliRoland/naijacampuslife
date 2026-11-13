// A tiny event bus. Modules do not change each other's data: they announce what happened
// (emit) and anyone who cares listens (on). Example: 'money:changed', 'time:day', 'choice:made'.
const handlers = new Map();

export function on(type, fn) {
  if (!handlers.has(type)) handlers.set(type, new Set());
  handlers.get(type).add(fn);
  return () => handlers.get(type).delete(fn);          // call the returned function to stop listening
}

export function emit(type, payload) {
  for (const fn of [...(handlers.get(type) || [])]) {
    try { fn(payload); } catch (e) { console.error(`Handler for "${type}" failed:`, e); }
  }
}

export function clearAllListeners() { handlers.clear(); }   // used by tests
