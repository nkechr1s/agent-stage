import type { StoreApi } from 'zustand/vanilla';
import type { StateAdapter } from './types.js';
import type { CommitResult, ReadonlyJsonValue, Snapshot } from '../core/types.js';
import { StageError } from '../core/errors.js';
import { assertJson, cloneJson, equal } from '../core/json.js';
import { applyPatch } from '../core/patch.js';
import { notify } from '../core/notify.js';

export interface ZustandAdapterOptions<State extends object, Slice extends ReadonlyJsonValue> {
  readonly select: (state: State) => Slice;
  /** Pure synchronous update. Return the changed top-level properties or full state. */
  readonly update: (state: State, next: Slice) => Partial<State>;
  /** Use a schema check when JSON validity alone is insufficient for your slice. */
  readonly validate?: (next: ReadonlyJsonValue) => boolean;
}
export interface ZustandAdapter extends StateAdapter { dispose(): void }
let adapterSequence = 0;

export function createZustandAdapter<State extends object, Slice extends ReadonlyJsonValue>(
  store: StoreApi<State>, options: ZustandAdapterOptions<State, Slice>,
): ZustandAdapter {
  const prefix = `zustand-${++adapterSequence}`;
  let revision = 0n;
  let disposed = false;
  let lastSlice: ReadonlyJsonValue = options.select(store.getState());
  assertJson(lastSlice);
  let invalid = false;
  const listeners = new Set<() => void>();
  const revisionId = (): string => `${prefix}:${revision}`;
  const active = (): void => { if (disposed) throw new StageError('DISPOSED', 'Zustand adapter is disposed'); };
  // Retain the immutable host slice reference for comparison, not a committed-state mirror.
  function refresh(emit = true): void {
    if (disposed) return;
    try {
      const selected = options.select(store.getState());
      assertJson(selected);
      if (!invalid && equal(lastSlice, selected)) { lastSlice = selected; return; }
      lastSlice = selected;
      invalid = false;
    } catch {
      if (invalid) return;
      invalid = true;
    }
    revision++;
    if (emit) notify(listeners);
  }
  const unsubscribe = store.subscribe(() => refresh());
  function snapshot(): Snapshot {
    active();
    refresh();
    const state = options.select(store.getState());
    assertJson(state);
    return { state: cloneJson(state), revision: revisionId() };
  }
  return {
    getSnapshot: snapshot,
    subscribe(listener) { active(); listeners.add(listener); return () => { listeners.delete(listener); }; },
    commit(request) {
      active();
      let result: CommitResult = { status: 'indeterminate', code: 'ADAPTER_ERROR', message: 'Store did not confirm updater execution; host outcome is unknown' };
      let prepared = false;
      let candidateState: State | undefined;
      let knownNoWrite = false;
      const originalState = store.getState();
      try {
        store.setState(current => {
          refresh(false);
          if (request.expectedRevision !== revisionId()) {
            result = { status: 'conflict', expectedRevision: request.expectedRevision, actualRevision: revisionId() };
            return current;
          }
          const selected = options.select(current);
          let next: ReadonlyJsonValue;
          try { next = applyPatch(selected, request.operations); }
          catch (error) { knownNoWrite = true; throw error; }
          if (options.validate && !options.validate(next)) { knownNoWrite = true; throw new StageError('INVALID_SLICE', 'Patched slice failed schema validation'); }
          if (!request.operations.length) {
            result = { status: 'committed', snapshot: snapshot() };
            return current;
          }
          const candidate = { ...current, ...options.update(current, cloneJson(next) as Slice) };
          const candidateSlice = options.select(candidate);
          assertJson(candidateSlice);
          if (!equal(candidateSlice, next)) { knownNoWrite = true; throw new StageError('INVALID_UPDATE', 'update must install the exact patched slice'); }
          if (store.getState() !== current) throw new StageError('INVALID_UPDATE', 'update must not mutate the store');
          if (!equal(lastSlice, candidateSlice)) revision++;
          lastSlice = candidateSlice;
          invalid = false;
          result = { status: 'committed', snapshot: { state: cloneJson(candidateSlice), revision: revisionId() } };
          // Vanilla Zustand publishes the returned state before synchronously notifying observers.
          candidateState = candidate;
          prepared = true;
          return candidate;
        }, true);
      } catch (error) {
        // A throwing Zustand observer must not turn an already-published write into a failure.
        if (!(prepared && store.getState() === candidateState)) result = { status: knownNoWrite && store.getState() === originalState ? 'failed' : 'indeterminate', code: error instanceof StageError ? error.code : 'ADAPTER_ERROR', message: error instanceof Error ? error.message : 'Store update outcome is unknown' };
      }
      if (prepared) { refresh(); notify(listeners); }
      return result;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.clear();
      lastSlice = null;
      unsubscribe();
    },
  };
}
