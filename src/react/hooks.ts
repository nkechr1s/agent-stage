import { freeze } from '../internal/freeze.js';
import { useMemo, useSyncExternalStore } from 'react';
import type { AgentStage } from '../core/stage.js';
import type { Change, Snapshot, Transaction } from '../core/types.js';
import { StageError } from '../core/errors.js';

/** A stable, detached host snapshot. Also rerenders on transaction notifications. */
export function useAgentStage(stage: AgentStage): Snapshot {
  const version = useSyncExternalStore(stage.subscribe, stage.getVersion);
  return useMemo(() => freeze(stage.capture()), [stage, version]);
}

/** Null supports the period before a proposal exists. Unknown non-null IDs throw. */
export function useTransaction(stage: AgentStage, transactionId: string | null): Transaction | null {
  const version = useSyncExternalStore(stage.subscribe, stage.getVersion);
  return useMemo(() => transactionId === null ? null : freeze(stage.getTransaction(transactionId)), [stage, transactionId, version]);
}

/** A logical approval group, which may contain several dependent operations. */
export function useStageChange(stage: AgentStage, transactionId: string | null, changeId: string | null): Change | null {
  const transaction = useTransaction(stage, transactionId);
  return useMemo(() => {
    if (transaction === null || changeId === null) return null;
    const change = transaction.changes.find(item => item.id === changeId);
    if (!change) throw new StageError('NOT_FOUND', 'Unknown change');
    return change;
  }, [transaction, changeId]);
}
