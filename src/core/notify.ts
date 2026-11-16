export function notify(listeners: Set<() => void>): void {
  for (const listener of [...listeners]) {
    if (!listeners.has(listener)) continue;
    try { listener(); } catch { /* Observers cannot change a completed mutation's outcome. */ }
  }
}
