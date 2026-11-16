import { checkWorkload, stageLimits, workloadExceeded } from './limits.js';
import type { AgentStageOptions } from './limits.js';
import { assertCommitResult } from './result.js';
import type { StateAdapter } from '../adapters/types.js';
import { StageError } from './errors.js';
import { groupChanges } from './group.js';
import { measureJson, clone, cloneJson } from './json.js';
import { notify } from './notify.js';
import { applyPatch, validateOperations } from './patch.js';
import type { CommitResult, Decision, JsonValue, Operation, Snapshot, Transaction } from './types.js';
export interface AgentStage {
  getVersion(): number;
  capture(): Snapshot;
  propose(input: { base: Snapshot; operations: readonly Operation[] }): Transaction;
  getTransaction(id: string): Transaction;
  preview(id: string, mode?: 'all' | 'accepted'): JsonValue;
  acceptChange(id: string, changeId: string): void;
  rejectChange(id: string, changeId: string): void;
  commit(id: string): Promise<CommitResult>;
  rollback(id: string): void;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}
export function createAgentStage(adapter: StateAdapter, options: AgentStageOptions = {}): AgentStage {
  const limits = stageLimits(options);
  const closed: string[] = [];
  let openCount = 0;
  const transactions = new Map<string, Transaction>();
  let captures = new WeakMap<Snapshot, { snapshot: Snapshot; units: number }>();
  const listeners = new Set<() => void>();
  let sequence = 0n;
  let version = 0;
  let disposed = false;
  const active = (): void => { if (disposed) throw new StageError('DISPOSED', 'Stage is disposed'); };
  function emit(): void {
    if (disposed) return;
    version++;
    notify(listeners);
  }
  const unsubscribe = adapter.subscribe(emit);
  function get(id: string): Transaction {
    active();
    const transaction = transactions.get(id);
    if (!transaction) throw new StageError('NOT_FOUND', 'Unknown transaction');
    return transaction;
  }
  function open(id: string): Transaction {
    const transaction = get(id);
    if (transaction.status !== 'open') throw new StageError('INVALID_STATUS', 'Transaction is not open');
    return transaction;
  }
  function update(transaction: Transaction): void {
    if (disposed) return;
    const previous = transactions.get(transaction.id);
    const isClosed = transaction.status === 'committed' || transaction.status === 'rolled-back';
    if (!previous) openCount++;
    if (isClosed && previous && previous.status !== 'committed' && previous.status !== 'rolled-back') {
      openCount--;
      closed.push(transaction.id);
    }
    transactions.set(transaction.id, transaction);
    while (closed.length > limits.maxClosedTransactions) transactions.delete(closed.shift()!);
    emit();
  }
  function decide(id: string, changeId: string, decision: Decision): void {
    const transaction = open(id);
    if (!transaction.changes.some(change => change.id === changeId)) throw new StageError('NOT_FOUND', 'Unknown change');
    update({ ...transaction, changes: transaction.changes.map(change => change.id === changeId ? { ...change, decision } : change) });
  }
  function accepted(transaction: Transaction): Operation[] {
    const indexes = new Set(transaction.changes.filter(change => change.decision === 'accepted').flatMap(change => [...change.operationIndexes]));
    return transaction.operations.filter((_, i) => indexes.has(i));
  }
  return {
    getVersion() { active(); return version; },
    capture() {
      active();
      const snapshot = adapter.getSnapshot();
      const size = measureJson(snapshot.state);
      if (typeof snapshot.revision !== 'string') throw new StageError('INVALID_ADAPTER', 'Revision must be a string');
      const result: Snapshot = { state: cloneJson(snapshot.state), revision: snapshot.revision };
      captures.set(result, { snapshot: clone(result), units: size.units });
      return result;
    },
    propose({ base, operations }) {
      active();
      if (openCount >= limits.maxOpenTransactions) throw new StageError('OPEN_TRANSACTION_LIMIT_EXCEEDED', 'Maximum simultaneously open or committing transactions reached');
      const captured = captures.get(base);
      if (!captured) throw new StageError('INVALID_BASE', 'Use a snapshot captured by this stage');
      if (Array.isArray(operations) && operations.length > limits.maxOperations) workloadExceeded();
      const patch = validateOperations(operations);
      checkWorkload(captured.units, patch, limits.maxWorkUnits);
      const changes = groupChanges(captured.snapshot.state, patch);
      const transaction: Transaction = { id: `transaction-${++sequence}`, base: clone(captured.snapshot), operations: patch, changes, status: 'open' };
      update(transaction);
      return clone(transaction);
    },
    getTransaction(id) { return clone(get(id)); },
    preview(id, mode = 'all') {
      const transaction = get(id);
      if (mode !== 'all' && mode !== 'accepted') throw new StageError('INVALID_INPUT', 'Unknown preview mode');
      return applyPatch(transaction.base.state, mode === 'all' ? transaction.operations : accepted(transaction));
    },
    acceptChange(id, changeId) { decide(id, changeId, 'accepted'); },
    rejectChange(id, changeId) { decide(id, changeId, 'rejected'); },
    async commit(id) {
      const transaction = open(id);
      if (transaction.changes.some(change => change.decision === 'pending')) {
        return { status: 'failed', code: 'UNRESOLVED_CHANGES', message: 'Accept or reject every change before committing' };
      }
      update({ ...transaction, status: 'committing' });
      let result: CommitResult;
      try {
        const response: unknown = await adapter.commit({ expectedRevision: transaction.base.revision, operations: clone(accepted(transaction)) });
        try {
          assertCommitResult(response);
          result = clone(response);
        } catch {
          return { status: 'failed', code: 'INVALID_ADAPTER', message: 'Malformed commit result; host outcome is unknown. Transaction remains locked against retry.' };
        }
      } catch (error) {
        result = { status: 'failed', code: 'ADAPTER_ERROR', message: error instanceof Error ? error.message : 'Adapter commit failed' };
      }
      update({ ...transaction, status: result.status === 'committed' ? 'committed' : 'open' });
      return result;
    },
    rollback(id) { update({ ...open(id), status: 'rolled-back' }); },
    subscribe(listener) { active(); listeners.add(listener); return () => { listeners.delete(listener); }; },
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.clear();
      transactions.clear();
      closed.length = 0;
      openCount = 0;
      captures = new WeakMap();
      unsubscribe();
    },
  };
}
