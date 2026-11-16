import { notify } from '../core/notify.js';
import { computed, DestroyRef, inject, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import type { AgentStage } from '../core/stage.js';
import type { Change, Snapshot, Transaction } from '../core/types.js';
import { StageError } from '../core/errors.js';
import { freeze } from '../internal/freeze.js';

export type StageId = string | null | (() => string | null);
const subscriptions = new WeakMap<AgentStage, { listeners: Set<() => void>; off: () => void }>();
function versionFor(stage: AgentStage): Signal<number> {
  const destroyRef = inject(DestroyRef);
  const version = signal(stage.getVersion());
  let shared = subscriptions.get(stage);
  if (!shared) {
    const listeners = new Set<() => void>();
    const off = stage.subscribe(() => notify(listeners));
    shared = { listeners, off };
    subscriptions.set(stage, shared);
  }
  const subscription = shared;
  const update = (): void => version.set(stage.getVersion());
  subscription.listeners.add(update);
  const cleanup = (): void => {
    subscription.listeners.delete(update);
    if (!subscription.listeners.size) { subscription.off(); subscriptions.delete(stage); }
  };
  try { destroyRef.onDestroy(cleanup); } catch (error) { cleanup(); throw error; }
  return version.asReadonly();
}
function readId(id: StageId): string | null { return typeof id === 'function' ? id() : id; }

export function injectAgentStage(stage: AgentStage): Signal<Snapshot> {
  const version = versionFor(stage);
  return computed(() => { version(); return freeze(stage.capture()); });
}
export function injectTransaction(stage: AgentStage, transactionId: StageId): Signal<Transaction | null> {
  const version = versionFor(stage);
  return computed(() => {
    version();
    const id = readId(transactionId);
    return id === null ? null : freeze(stage.getTransaction(id));
  });
}
export function injectStageChange(stage: AgentStage, transactionId: StageId, changeId: StageId): Signal<Change | null> {
  const transaction = injectTransaction(stage, transactionId);
  return computed(() => {
    const current = transaction();
    const id = readId(changeId);
    if (current === null || id === null) return null;
    const change = current.changes.find(item => item.id === id);
    if (!change) throw new StageError('NOT_FOUND', 'Unknown change');
    return change;
  });
}
