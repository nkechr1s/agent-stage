import { expect, it } from 'vitest';
import { applyPatch, createAgentStage, createMemoryAdapter } from '../../src/index.js';
import type { StateAdapter } from '../../src/index.js';
it('commits only accepted changes through the real host boundary', async () => {
  let host = { budget: 5000, status: 'active', deadline: '2026-12-01' };
  let revision = 0;
  let commits = 0;
  const adapter: StateAdapter = {
    getSnapshot: () => ({ state: structuredClone(host), revision: String(revision) }),
    subscribe: () => () => {},
    commit(request) {
      commits++;
      if (request.expectedRevision !== String(revision)) return { status: 'conflict', expectedRevision: request.expectedRevision, actualRevision: String(revision) };
      host = applyPatch(host, request.operations) as typeof host;
      revision++;
      return { status: 'committed', snapshot: this.getSnapshot() };
    },
  };
  const stage = createAgentStage(adapter);
  const transaction = stage.propose({ base: stage.capture(), operations: [
    { op: 'replace', path: '/budget', value: 12000 },
    { op: 'replace', path: '/status', value: 'archived' },
    { op: 'replace', path: '/deadline', value: '2027-01-01' },
  ] });
  const change = (index: number): string => transaction.changes.find(item => item.operationIndexes.includes(index))!.id;
  stage.acceptChange(transaction.id, change(0)); stage.rejectChange(transaction.id, change(1));
  expect(commits).toBe(0); expect(host.budget).toBe(5000);
  expect(stage.preview(transaction.id, 'accepted')).toEqual({ ...host, budget: 12000 });
  expect(await stage.commit(transaction.id)).toMatchObject({ status: 'failed', code: 'UNRESOLVED_CHANGES' });
  expect(commits).toBe(0);
  stage.rejectChange(transaction.id, change(2));
  expect((await stage.commit(transaction.id)).status).toBe('committed');
  expect(commits).toBe(1);
  expect(host).toEqual({ budget: 12000, status: 'active', deadline: '2026-12-01' });
});
it('allows one of two competing transactions to commit without lost updates', async () => {
  const adapter = createMemoryAdapter({ a: 1, b: 1 }); const stage = createAgentStage(adapter);
  const base = stage.capture();
  const transactions = ['a', 'b'].map(key => stage.propose({ base, operations: [{ op: 'replace', path: `/${key}`, value: 2 }] }));
  for (const tx of transactions) stage.acceptChange(tx.id, tx.changes[0]!.id);
  const results = await Promise.all(transactions.map(tx => stage.commit(tx.id)));
  expect(results.map(result => result.status)).toEqual(['committed', 'conflict']);
  expect(adapter.getSnapshot().state).toEqual({ a: 2, b: 1 });
});
it('applies every subset of independent logical groups without breaking array dependencies', async () => {
  for (let mask = 0; mask < 8; mask++) {
    const adapter = createMemoryAdapter({ list: ['a', 'b'], nested: { x: 1 }, other: 1 });
    const stage = createAgentStage(adapter);
    const tx = stage.propose({ base: stage.capture(), operations: [
      { op: 'remove', path: '/list/0' },
      { op: 'replace', path: '/nested/x', value: 2 },
      { op: 'add', path: '/list/-', value: 'c' },
      { op: 'replace', path: '/other', value: 2 },
    ] });
    expect(tx.changes).toHaveLength(3);
    for (const [bit, operation] of [0, 1, 3].entries()) {
      const change = tx.changes.find(item => item.operationIndexes.includes(operation))!;
      if (mask & (1 << bit)) stage.acceptChange(tx.id, change.id);
      else stage.rejectChange(tx.id, change.id);
    }
    const expected = { list: mask & 1 ? ['b', 'c'] : ['a', 'b'], nested: { x: mask & 2 ? 2 : 1 }, other: mask & 4 ? 2 : 1 };
    expect(stage.preview(tx.id, 'accepted')).toEqual(expected);
    expect((await stage.commit(tx.id)).status).toBe('committed');
    expect(adapter.getSnapshot().state).toEqual(expected);
    stage.dispose();
  }
});
