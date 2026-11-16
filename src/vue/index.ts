import { computed, getCurrentScope, isRef, onScopeDispose, shallowRef } from 'vue';
import type { ComputedRef, EffectScope, Ref } from 'vue';
import type { AgentStage } from '../core/stage.js';
import type { Change, Snapshot, Transaction } from '../core/types.js';
import { StageError } from '../core/errors.js';
import { freeze } from '../internal/freeze.js';

export type StageId = string | null | Readonly<Ref<string | null>> | (() => string | null);
const subscriptions = new WeakMap<EffectScope, Map<AgentStage, Readonly<Ref<number>>>>();
function versionFor(stage: AgentStage): Readonly<Ref<number>> {
  const scope = getCurrentScope();
  if (!scope) throw new StageError('INVALID_SCOPE', 'Call agent-stage composables in an active Vue scope');
  let stages = subscriptions.get(scope);
  if (!stages) { stages = new Map(); subscriptions.set(scope, stages); }
  const existing = stages.get(stage);
  if (existing) return existing;
  const version = shallowRef(stage.getVersion());
  const off = stage.subscribe(() => { version.value = stage.getVersion(); });
  stages.set(stage, version);
  onScopeDispose(() => { off(); stages.delete(stage); if (!stages.size) subscriptions.delete(scope); });
  return version;
}
function readId(id: StageId): string | null { return typeof id === 'function' ? id() : isRef(id) ? id.value : id; }

export function useAgentStage(stage: AgentStage): ComputedRef<Snapshot> {
  const version = versionFor(stage);
  return computed(() => { version.value; return freeze(stage.capture()); });
}
export function useTransaction(stage: AgentStage, transactionId: StageId): ComputedRef<Transaction | null> {
  const version = versionFor(stage);
  return computed(() => {
    version.value;
    const id = readId(transactionId);
    return id === null ? null : freeze(stage.getTransaction(id));
  });
}
export function useStageChange(stage: AgentStage, transactionId: StageId, changeId: StageId): ComputedRef<Change | null> {
  const transaction = useTransaction(stage, transactionId);
  return computed(() => {
    const current = transaction.value;
    const id = readId(changeId);
    if (current === null || id === null) return null;
    const change = current.changes.find(item => item.id === id);
    if (!change) throw new StageError('NOT_FOUND', 'Unknown change');
    return change;
  });
}
