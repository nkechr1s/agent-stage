import { expect, it, vi } from 'vitest';
import { createMemoryAdapter } from '../../src/index.js';
it('atomically compares revisions and leaves state untouched on patch failure', async () => {
  const adapter = createMemoryAdapter({ a: 1 });
  const listener = vi.fn(); adapter.subscribe(listener);
  expect((await adapter.commit({ expectedRevision: '0', operations: [
    { op: 'replace', path: '/a', value: 2 }, { op: 'remove', path: '/missing' },
  ] })).status).toBe('failed');
  expect(adapter.getSnapshot()).toEqual({ revision: '0', state: { a: 1 } });
  expect(listener).not.toHaveBeenCalled();
  expect((await adapter.commit({ expectedRevision: '0', operations: [{ op: 'replace', path: '/a', value: 2 }] })).status).toBe('committed');
  expect(await adapter.commit({ expectedRevision: '0', operations: [] })).toEqual({ status: 'conflict', expectedRevision: '0', actualRevision: '1' });
  expect(listener).toHaveBeenCalledTimes(1);
});
it('isolates inputs, snapshots, commit results and failing subscribers', async () => {
  const initial = { a: [1] }; const adapter = createMemoryAdapter(initial); initial.a.push(9);
  (adapter.getSnapshot().state as { a: number[] }).a.push(9);
  const listener = vi.fn(); const off = adapter.subscribe(listener);
  adapter.subscribe(() => { throw new Error('observer'); });
  const result = await adapter.commit({ expectedRevision: '0', operations: [{ op: 'add', path: '/a/-', value: 2 }] });
  expect(result.status).toBe('committed');
  if (result.status === 'committed') (result.snapshot.state as { a: number[] }).a.push(9);
  expect(adapter.getSnapshot().state).toEqual({ a: [1, 2] });
  off(); await adapter.commit({ expectedRevision: '1', operations: [] });
  expect(listener).toHaveBeenCalledTimes(1);
});
