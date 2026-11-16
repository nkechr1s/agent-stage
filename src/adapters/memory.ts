import type { StateAdapter } from './types.js';
import type { ReadonlyJsonValue, Snapshot } from '../core/types.js';
import { assertJson, clone, cloneJson } from '../core/json.js';
import { applyPatch } from '../core/patch.js';
import { notify } from '../core/notify.js';
export function createMemoryAdapter(initial: ReadonlyJsonValue): StateAdapter {
  assertJson(initial);
  let state: ReadonlyJsonValue = cloneJson(initial);
  let revision = 0n;
  const listeners = new Set<() => void>();
  const getSnapshot = (): Snapshot => ({ state: clone(state), revision: String(revision) });
  return {
    getSnapshot,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    commit({ expectedRevision, operations }) {
      if (expectedRevision !== String(revision)) return { status: 'conflict', expectedRevision, actualRevision: String(revision) };
      let published = false;
      try {
        const next = applyPatch(state, operations);
        if (operations.length) { state = next; revision++; published = true; }
        const snapshot = getSnapshot();
        if (operations.length) notify(listeners);
        return { status: 'committed', snapshot };
      } catch (error) {
        return { status: published ? 'indeterminate' : 'failed', code: published ? 'ADAPTER_ERROR' : 'INVALID_PATCH', message: error instanceof Error ? error.message : 'Patch failed' };
      }
    },
  };
}
