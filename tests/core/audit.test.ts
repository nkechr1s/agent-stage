import { expect, it, vi } from 'vitest';
import { applyPatch, createAgentStage, createMemoryAdapter } from '../../src/index.js';
import type { CommitResult, JsonValue, Operation, StateAdapter } from '../../src/index.js';

it('treats shared object references as independent JSON paths', async () => {
  const shared = { n: 1 };
  const initial = { a: shared, b: shared };
  const patch: Operation[] = [{ op: 'replace', path: '/a/n', value: 2 }];
  expect(applyPatch(initial, patch)).toEqual({ a: { n: 2 }, b: { n: 1 } });
  const adapter = createMemoryAdapter(initial);
  const stage = createAgentStage(adapter);
  const tx = stage.propose({ base: stage.capture(), operations: patch });
  expect(stage.preview(tx.id)).toEqual({ a: { n: 2 }, b: { n: 1 } });
  stage.acceptChange(tx.id, tx.changes[0]!.id);
  expect((await stage.commit(tx.id)).status).toBe('committed');
  expect(adapter.getSnapshot().state).toEqual({ a: { n: 2 }, b: { n: 1 } });
  expect(shared.n).toBe(1);
});

it('breaks aliases within inserted patch values and captured custom adapter state', () => {
  const shared = { n: 1 };
  const value = { a: shared, b: shared };
  expect(applyPatch({}, [
    { op: 'add', path: '/value', value },
    { op: 'replace', path: '/value/a/n', value: 2 },
  ])).toEqual({ value: { a: { n: 2 }, b: { n: 1 } } });
  const memory = createMemoryAdapter({});
  const stage = createAgentStage({ ...memory, getSnapshot: () => ({ state: value, revision: '0' }) });
  const capture = stage.capture();
  (capture.state as typeof value).a.n = 99;
  expect((capture.state as typeof value).b.n).toBe(1);
  const tx = stage.propose({ base: capture, operations: [{ op: 'replace', path: '/a/n', value: 2 }] });
  expect(stage.preview(tx.id)).toEqual({ a: { n: 2 }, b: { n: 1 } });
});

it('blocks commit until every change has an explicit decision', async () => {
  const memory = createMemoryAdapter({ a: 1, b: 1, c: 1 });
  const commit = vi.fn(memory.commit);
  const stage = createAgentStage({ ...memory, commit });
  const tx = stage.propose({ base: stage.capture(), operations: ['a', 'b', 'c'].map(key => ({ op: 'replace', path: `/${key}`, value: 2 })) });
  const change = (index: number): string => tx.changes.find(c => c.operationIndexes.includes(index))!.id;
  stage.acceptChange(tx.id, change(0)); stage.rejectChange(tx.id, change(1));
  expect(await stage.commit(tx.id)).toMatchObject({ status: 'failed', code: 'UNRESOLVED_CHANGES' });
  expect(commit).not.toHaveBeenCalled();
  expect(stage.getTransaction(tx.id).status).toBe('open');
  expect(stage.getTransaction(tx.id).changes.map(c => c.decision)).toEqual(['accepted', 'rejected', 'pending']);
  expect(memory.getSnapshot().state).toEqual({ a: 1, b: 1, c: 1 });
  stage.acceptChange(tx.id, change(2));
  expect((await stage.commit(tx.id)).status).toBe('committed');
  expect(memory.getSnapshot().state).toEqual({ a: 2, b: 1, c: 2 });
});

it('stops callbacks removed by disposal during a notification', () => {
  const memory = createMemoryAdapter({});
  const unsubscribe = vi.fn();
  const stage = createAgentStage({ ...memory, subscribe: () => unsubscribe });
  stage.subscribe(() => stage.dispose());
  const later = vi.fn(); stage.subscribe(later);
  stage.propose({ base: stage.capture(), operations: [] });
  expect(later).not.toHaveBeenCalled();
  expect(unsubscribe).toHaveBeenCalledTimes(1);
  stage.dispose(); expect(unsubscribe).toHaveBeenCalledTimes(1);
});

it('reports malformed operation names with structured validation errors', () => {
  const patch = [{ op: { toString: null }, path: '' }] as unknown as Operation[];
  expect(() => applyPatch({}, patch)).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
});

it('settles an in-flight commit after disposal without new notifications', async () => {
  const memory = createMemoryAdapter({ n: 1 });
  let finish!: () => void;
  const unsubscribe = vi.fn();
  const adapter: StateAdapter = {
    ...memory,
    subscribe: () => unsubscribe,
    commit: request => new Promise<CommitResult>(resolve => { finish = () => { void Promise.resolve(memory.commit(request)).then(resolve); }; }),
  };
  const stage = createAgentStage(adapter);
  const tx = stage.propose({ base: stage.capture(), operations: [{ op: 'replace', path: '/n', value: 2 }] });
  stage.acceptChange(tx.id, tx.changes[0]!.id);
  const listener = vi.fn(); stage.subscribe(listener);
  const pending = stage.commit(tx.id);
  stage.dispose(); finish();
  expect((await pending).status).toBe('committed');
  expect(listener).toHaveBeenCalledTimes(1);
  expect(unsubscribe).toHaveBeenCalledTimes(1);
  expect(() => stage.getTransaction(tx.id)).toThrow();
  expect(memory.getSnapshot().state).toEqual({ n: 2 });
});

it('keeps failure after a move atomic and applies root operations in order', async () => {
  const memory = createMemoryAdapter({ items: [1, 2] });
  expect((await memory.commit({ expectedRevision: '0', operations: [
    { op: 'move', from: '/items/0', path: '/missing/child' },
  ] })).status).toBe('failed');
  expect(memory.getSnapshot()).toEqual({ revision: '0', state: { items: [1, 2] } });
  expect(applyPatch({ 'a/b': { '~': [1, 2] } }, [
    { op: 'move', from: '/a~1b/~0', path: '' },
    { op: 'add', path: '/-', value: 3 },
    { op: 'move', from: '/0', path: '/2' },
    { op: 'test', path: '', value: [2, 3, 1] },
    { op: 'replace', path: '', value: { '': true } },
    { op: 'remove', path: '/' },
  ])).toEqual({});
});

it('isolates concurrent async commits at the adapter atomic boundary', async () => {
  const memory = createMemoryAdapter({ a: 1, b: 1 });
  const finish: (() => void)[] = [];
  const stage = createAgentStage({ ...memory, commit: request => new Promise<CommitResult>(resolve => {
    finish.push(() => { void Promise.resolve(memory.commit(request)).then(resolve); });
  }) });
  const base = stage.capture();
  const txs = ['a', 'b'].map(key => stage.propose({ base, operations: [{ op: 'replace', path: `/${key}`, value: 2 }] }));
  txs.forEach(tx => stage.acceptChange(tx.id, tx.changes[0]!.id));
  const pending = txs.map(tx => stage.commit(tx.id));
  finish[1]!(); finish[0]!();
  expect((await Promise.all(pending)).map(r => r.status)).toEqual(['conflict', 'committed']);
  expect(memory.getSnapshot().state).toEqual({ a: 1, b: 2 });
});

it('does not expose internal decision arrays and permits safe reuse of captures', () => {
  const stage = createAgentStage(createMemoryAdapter({ a: 1 }));
  const base = stage.capture();
  const tx = stage.propose({ base, operations: [{ op: 'replace', path: '/a', value: 2 }] });
  const view = stage.getTransaction(tx.id);
  (view.changes[0]!.operationIndexes as number[]).push(99);
  (view.changes[0] as { decision: string }).decision = 'accepted';
  (base as { state: JsonValue; revision: string }).revision = 'fake';
  expect(stage.getTransaction(tx.id).changes[0]).toMatchObject({ decision: 'pending', operationIndexes: [0] });
  stage.rollback(tx.id);
  expect(stage.propose({ base, operations: [] }).base.revision).toBe('0');
});

it.each(['0\n', '0\r', '0\u2028', '0\u2029'])('rejects noncanonical array index %j', key => {
  expect(() => applyPatch([1], [{ op: 'replace', path: `/${key}`, value: 2 }])).toThrow();
  const disguised = new Array<JsonValue>(1);
  Object.defineProperty(disguised, key, { value: 1, enumerable: true });
  expect(() => createMemoryAdapter(disguised)).toThrow();
});

it('does not close an entirely pending transaction and explicitly closes an all-rejected one', async () => {
  const adapter = createMemoryAdapter({ a: 1 });
  const stage = createAgentStage(adapter);
  const tx = stage.propose({ base: stage.capture(), operations: [{ op: 'replace', path: '/a', value: 2 }] });
  expect(await stage.commit(tx.id)).toMatchObject({ status: 'failed', code: 'UNRESOLVED_CHANGES' });
  expect(stage.getTransaction(tx.id).status).toBe('open');
  stage.rejectChange(tx.id, tx.changes[0]!.id);
  expect(await stage.commit(tx.id)).toEqual({ status: 'committed', snapshot: { state: { a: 1 }, revision: '0' } });
  expect(stage.getTransaction(tx.id).status).toBe('committed');
});

it('preserves accepted decisions and detached operations after an asynchronous adapter rejection', async () => {
  const memory = createMemoryAdapter({ a: 1 });
  const stage = createAgentStage({ ...memory, async commit(request) {
    (request.operations[0] as { value: JsonValue }).value = 99;
    throw new Error('offline');
  } });
  const tx = stage.propose({ base: stage.capture(), operations: [{ op: 'replace', path: '/a', value: 2 }] });
  stage.acceptChange(tx.id, tx.changes[0]!.id);
  expect(await stage.commit(tx.id)).toMatchObject({ status: 'indeterminate', code: 'ADAPTER_ERROR' });
  expect(stage.getTransaction(tx.id)).toMatchObject({ status: 'indeterminate', changes: [{ decision: 'accepted' }] });
  expect(stage.preview(tx.id, 'accepted')).toEqual({ a: 2 });
  expect(memory.getSnapshot()).toEqual({ revision: '0', state: { a: 1 } });
});

it('skips adapter observers unsubscribed during the current emission', async () => {
  const adapter = createMemoryAdapter({ a: 1 });
  let off = (): void => {};
  adapter.subscribe(() => off());
  const listener = vi.fn(); off = adapter.subscribe(listener);
  await adapter.commit({ expectedRevision: '0', operations: [{ op: 'replace', path: '/a', value: 2 }] });
  expect(listener).not.toHaveBeenCalled();
});
