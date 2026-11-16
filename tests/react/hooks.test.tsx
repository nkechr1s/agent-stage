// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { createStore } from 'zustand/vanilla';
import { createAgentStage } from '../../src/index.js';
import type { Change, Snapshot, Transaction } from '../../src/index.js';
import { createZustandAdapter } from '../../src/adapters/zustand.js';
import { useAgentStage, useTransaction, useStageChange } from '../../src/react/index.js';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined;
const cleanups: (() => void)[] = [];
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined; cleanups.splice(0).forEach(cleanup => cleanup()); document.body.replaceChildren(); });
function setup() {
  const store = createStore(() => ({ project: { budget: 100, status: 'active' }, other: 0 }));
  const adapter = createZustandAdapter(store, { select: s => s.project, update: (_s, project) => ({ project }) });
  const stage = createAgentStage(adapter);
  cleanups.push(() => { stage.dispose(); adapter.dispose(); });
  const tx = stage.propose({ base: stage.capture(), operations: [
    { op: 'replace', path: '/budget', value: 200 }, { op: 'replace', path: '/status', value: 'archived' },
  ] });
  const views: { snapshot: Snapshot; transaction: Transaction | null; change: Change | null }[] = [];
  function View({ id = tx.id, changeId = tx.changes[0]!.id }: { id?: string | null; changeId?: string | null }) {
    const snapshot = useAgentStage(stage);
    const transaction = useTransaction(stage, id);
    const change = useStageChange(stage, id, changeId);
    views.push({ snapshot, transaction, change });
    return <div>{JSON.stringify({ host: snapshot.state, decision: change?.decision, status: transaction?.status })}</div>;
  }
  const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  return { store, adapter, stage, tx, views, View, container };
}
it('reacts to decisions, committed state, and external edits while proposals remain unchanged', async () => {
  const { View, views, stage, store, tx, container } = setup();
  act(() => root!.render(<View />));
  expect(container.textContent).toContain('pending');
  act(() => stage.acceptChange(tx.id, tx.changes[0]!.id));
  expect(views.at(-1)!.change!.decision).toBe('accepted');
  act(() => stage.rejectChange(tx.id, tx.changes[1]!.id));
  expect(views.at(-1)!.transaction!.changes[1]!.decision).toBe('rejected');
  act(() => store.setState({ project: { budget: 150, status: 'active' } }));
  expect(views.at(-1)!.snapshot.state).toEqual({ budget: 150, status: 'active' });
  expect(views.at(-1)!.transaction!.base.state).toEqual({ budget: 100, status: 'active' });
  await act(async () => { expect((await stage.commit(tx.id)).status).toBe('conflict'); });
  expect(store.getState().project.budget).toBe(150);
  const fresh = stage.propose({ base: stage.capture(), operations: [{ op: 'replace', path: '/budget', value: 250 }] });
  act(() => { stage.acceptChange(fresh.id, fresh.changes[0]!.id); root!.render(<View id={fresh.id} changeId={fresh.changes[0]!.id} />); });
  await act(async () => { expect((await stage.commit(fresh.id)).status).toBe('committed'); });
  expect(views.at(-1)!.snapshot.state).toEqual({ budget: 250, status: 'active' });
});
it('keeps snapshots stable without events, freezes views, and avoids unrelated-store renders', () => {
  const { View, views, stage, store, tx } = setup();
  const error = vi.spyOn(console, 'error');
  act(() => root!.render(<View />)); const first = views.at(-1)!;
  act(() => root!.render(<View />)); const second = views.at(-1)!;
  expect(second.snapshot).toBe(first.snapshot); expect(second.transaction).toBe(first.transaction); expect(second.change).toBe(first.change);
  expect(Object.isFrozen(first.snapshot.state)).toBe(true);
  expect(Object.isFrozen(first.transaction!.changes[0]!.operationIndexes)).toBe(true);
  expect(() => (first.transaction!.changes as Change[]).pop()).toThrow();
  expect(stage.getTransaction(tx.id).changes).toHaveLength(2);
  const count = views.length;
  act(() => store.setState({ other: 1 })); expect(views).toHaveLength(count);
  expect(error).not.toHaveBeenCalled(); error.mockRestore();
});
it('balances subscriptions in Strict Mode, releases them on unmount and catches updates before remount', () => {
  const { View, views, stage, store } = setup();
  const original = stage.subscribe; let active = 0; let peak = 0;
  vi.spyOn(stage, 'subscribe').mockImplementation(listener => {
    active++; peak = Math.max(peak, active); const off = original(listener);
    return () => { active--; off(); };
  });
  act(() => root!.render(<StrictMode><View /></StrictMode>));
  expect(active).toBe(3); expect(peak).toBe(3); expect(views.length).toBeLessThan(10);
  act(() => root!.render(null)); expect(active).toBe(0);
  store.setState({ project: { budget: 300, status: 'active' } });
  act(() => root!.render(<StrictMode><View /></StrictMode>));
  expect(views.at(-1)!.snapshot.state).toEqual({ budget: 300, status: 'active' });
  act(() => root!.unmount()); root = undefined; expect(active).toBe(0);
});
it('supports null IDs, ID changes and rollback without conditional hook calls', () => {
  const { View, views, stage, tx } = setup();
  act(() => root!.render(<View id={null} changeId={null} />));
  expect(views.at(-1)!.transaction).toBeNull(); expect(views.at(-1)!.change).toBeNull();
  act(() => root!.render(<View />)); expect(views.at(-1)!.transaction!.id).toBe(tx.id);
  act(() => stage.rollback(tx.id)); expect(views.at(-1)!.transaction!.status).toBe('rolled-back');
});
