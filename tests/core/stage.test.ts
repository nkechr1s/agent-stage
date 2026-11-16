import { describe, expect, it, vi } from 'vitest';
import { createAgentStage, createMemoryAdapter } from '../../src/index.js';
import type { CommitResult, JsonValue, Operation, StateAdapter } from '../../src/index.js';
function setup(state: JsonValue, operations: Operation[]) {
  const adapter = createMemoryAdapter(state); const stage = createAgentStage(adapter);
  const transaction = stage.propose({ base: stage.capture(), operations });
  return { adapter, stage, transaction };
}
describe('transaction lifecycle', () => {
  it('captures independent bases and never stages into the host', async () => {
    const adapter = createMemoryAdapter({ a: 1 }); const stage = createAgentStage(adapter);
    const base = stage.capture();
    const first = stage.propose({ base, operations: [{ op: 'replace', path: '/a', value: 2 }] });
    expect(adapter.getSnapshot().state).toEqual({ a: 1 });
    await adapter.commit({ expectedRevision: '0', operations: [{ op: 'replace', path: '/a', value: 3 }] });
    const second = stage.propose({ base: stage.capture(), operations: [{ op: 'replace', path: '/a', value: 4 }] });
    expect(first.id).not.toBe(second.id);
    expect(stage.getTransaction(first.id).base.revision).toBe('0');
    expect(second.base.revision).toBe('1');
    stage.acceptChange(first.id, first.changes[0]!.id);
    expect(await stage.commit(first.id)).toEqual({ status: 'conflict', expectedRevision: '0', actualRevision: '1' });
    expect(adapter.getSnapshot().state).toEqual({ a: 3 });
    expect(stage.getTransaction(first.id).status).toBe('open');
  });
  it('isolates views, previews, input patches and mutable capture objects', () => {
    const adapter = createMemoryAdapter({ a: { n: 1 } }); const stage = createAgentStage(adapter);
    const base = stage.capture(); (base.state as { a: { n: number } }).a.n = 99;
    const operations: Operation[] = [{ op: 'replace', path: '/a', value: { n: 2 } }];
    const transaction = stage.propose({ base, operations });
    (operations[0] as { value: JsonValue }).value = { n: 88 };
    (transaction.base.state as { a: { n: number } }).a.n = 77;
    (transaction.operations[0] as { value: JsonValue }).value = null;
    (stage.preview(transaction.id) as { a: { n: number } }).a.n = 66;
    expect(stage.preview(transaction.id)).toEqual({ a: { n: 2 } });
    expect(stage.getTransaction(transaction.id).base.state).toEqual({ a: { n: 1 } });
    expect(adapter.getSnapshot().state).toEqual({ a: { n: 1 } });
    expect(() => stage.propose({ base: structuredClone(base), operations: [] })).toThrow();
    expect(() => createAgentStage(adapter).propose({ base, operations: [] })).toThrow();
  });
  it('closes rolled back and committed transactions and validates IDs', async () => {
    const { stage, transaction, adapter } = setup({ a: 1 }, [{ op: 'replace', path: '/a', value: 2 }]);
    stage.rollback(transaction.id);
    expect(() => stage.acceptChange(transaction.id, transaction.changes[0]!.id)).toThrow();
    await expect(stage.commit(transaction.id)).rejects.toThrow();
    expect(adapter.getSnapshot().state).toEqual({ a: 1 });
    expect(() => stage.getTransaction('missing')).toThrow();
    const empty = stage.propose({ base: stage.capture(), operations: [] });
    expect(() => stage.rejectChange(empty.id, 'missing')).toThrow();
    expect((await stage.commit(empty.id)).status).toBe('committed');
    await expect(stage.commit(empty.id)).rejects.toThrow();
  });
  it('notifies for decisions, host writes and rollback; unsubscribes and disposes', async () => {
    const { stage, adapter, transaction } = setup({ a: 1 }, [{ op: 'replace', path: '/a', value: 2 }]);
    const listener = vi.fn(); const off = stage.subscribe(listener);
    stage.subscribe(() => { throw new Error('observer'); });
    stage.acceptChange(transaction.id, transaction.changes[0]!.id);
    await adapter.commit({ expectedRevision: '0', operations: [{ op: 'replace', path: '/a', value: 5 }] });
    stage.rollback(transaction.id); expect(listener).toHaveBeenCalledTimes(3);
    off(); stage.propose({ base: stage.capture(), operations: [] }); expect(listener).toHaveBeenCalledTimes(3);
    stage.dispose(); stage.dispose(); expect(() => stage.capture()).toThrow();
  });
  it('locks an asynchronous commit and returns adapter failures without closing', async () => {
    const memory = createMemoryAdapter({ a: 1 });
    let finish!: (result: CommitResult) => void;
    const adapter: StateAdapter = { ...memory, commit: () => new Promise(resolve => { finish = resolve; }) };
    const stage = createAgentStage(adapter);
    const transaction = stage.propose({ base: stage.capture(), operations: [] });
    const pending = stage.commit(transaction.id);
    expect(stage.getTransaction(transaction.id).status).toBe('committing');
    expect(() => stage.rollback(transaction.id)).toThrow();
    await expect(stage.commit(transaction.id)).rejects.toThrow();
    finish({ status: 'failed', code: 'UNAVAILABLE', message: 'Unavailable' });
    expect((await pending).status).toBe('failed');
    expect(stage.getTransaction(transaction.id).status).toBe('open');
    const throwing = createAgentStage({ ...memory, commit() { throw new Error('offline'); } });
    const tx = throwing.propose({ base: throwing.capture(), operations: [] });
    expect(await throwing.commit(tx.id)).toEqual({ status: 'indeterminate', code: 'ADAPTER_ERROR', message: 'offline' });
  });
});
describe('atomic logical grouping', () => {
  it.each([
    [{ a: { b: 1 }, other: 0 }, [{ op: 'replace', path: '/a', value: { b: 2 } }, { op: 'replace', path: '/a/b', value: 3 }]],
    [{ a: [1, 2], other: 0 }, [{ op: 'remove', path: '/a/0' }, { op: 'replace', path: '/a/0', value: 3 }]],
    [{ a: { x: [1, 2] }, other: 0 }, [{ op: 'add', path: '/a/x/-', value: 3 }, { op: 'replace', path: '/a/x/0', value: 4 }]],
    [{ a: 1, b: 2, other: 0 }, [{ op: 'copy', from: '/a', path: '/b' }, { op: 'replace', path: '/a', value: 3 }]],
    [{ a: 1, b: 2, other: 0 }, [{ op: 'move', from: '/a', path: '/b' }, { op: 'add', path: '/a', value: 3 }]],
    [{ other: 0 }, [{ op: 'add', path: '/a', value: [] }, { op: 'add', path: '/a/-', value: 3 }]],
  ])('keeps dependent operations together %#', (base, patch) => {
    const { stage, transaction, adapter } = setup(base as JsonValue, [...patch as Operation[], { op: 'replace', path: '/other', value: 9 }]);
    expect(transaction.changes).toHaveLength(2);
    const related = transaction.changes.find(change => change.operationIndexes.includes(0))!;
    expect(related.operationIndexes).toEqual([0, 1]);
    stage.acceptChange(transaction.id, related.id);
    expect(stage.getTransaction(transaction.id).changes.find(change => change.id !== related.id)!.decision).toBe('pending');
    expect(adapter.getSnapshot().state).toEqual(base);
  });
  it('groups all guarded operations and transitively connects dependencies', () => {
    const guarded = setup({ a: 1, b: 2 }, [{ op: 'test', path: '/a', value: 1 }, { op: 'replace', path: '/b', value: 3 }]);
    expect(guarded.transaction.changes).toHaveLength(1);
    const transitive = setup({ a: 1, b: 2 }, [{ op: 'replace', path: '/a', value: 3 }, { op: 'replace', path: '/b', value: 4 }, { op: 'copy', from: '/a', path: '/b' }]);
    expect(transitive.transaction.changes[0]!.operationIndexes).toEqual([0, 1, 2]);
  });
});
