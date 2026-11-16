import { expect, it, vi } from 'vitest';
import { effectScope, shallowRef, watchSyncEffect } from 'vue';
import { createAgentStage, createMemoryAdapter } from '../../src/index.js';
import { useAgentStage, useTransaction, useStageChange } from 'agent-stage/vue';
function setup() {
  const adapter = createMemoryAdapter({ budget: 100, status: 'active' });
  const stage = createAgentStage(adapter);
  const tx = stage.propose({ base: stage.capture(), operations: [
    { op: 'replace', path: '/budget', value: 200 }, { op: 'replace', path: '/status', value: 'archived' },
  ] });
  return { adapter, stage, tx };
}
it('shares one subscription per scope, updates detached frozen views and preserves capture identity', async () => {
  const { stage, adapter, tx } = setup(); const subscribe = vi.spyOn(stage, 'subscribe');
  const scope = effectScope();
  const views = scope.run(() => ({ host: useAgentStage(stage), transaction: useTransaction(stage, tx.id), change: useStageChange(stage, tx.id, tx.changes[0]!.id) }))!;
  expect(subscribe).toHaveBeenCalledTimes(1);
  const capture = views.host.value;
  expect(views.host.value).toBe(capture);
  expect(views.transaction.value).toBe(views.transaction.value);
  expect(Object.isFrozen(capture.state)).toBe(true);
  expect(Object.isFrozen(views.transaction.value!.changes[0]!.operationIndexes)).toBe(true);
  expect(() => (capture.state as { budget: number }).budget = 999).toThrow();
  expect(stage.propose({ base: capture, operations: [] }).base.state).toEqual(capture.state);
  stage.acceptChange(tx.id, tx.changes[0]!.id);
  stage.rejectChange(tx.id, tx.changes[1]!.id);
  expect(views.change.value!.decision).toBe('accepted');
  expect(views.transaction.value!.changes[1]!.decision).toBe('rejected');
  expect((await stage.commit(tx.id)).status).toBe('committed');
  expect(views.host.value.state).toEqual({ budget: 200, status: 'active' });
  const revision = adapter.getSnapshot().revision;
  await adapter.commit({ expectedRevision: revision, operations: [{ op: 'replace', path: '/budget', value: 250 }] });
  expect(views.host.value.state).toEqual({ budget: 250, status: 'active' });
  expect(views.transaction.value!.base.state).toEqual({ budget: 100, status: 'active' });
  scope.stop(); stage.dispose();
});
it('tracks nullable ref and getter IDs and exposes structured errors on read', () => {
  const { stage, tx } = setup(); const scope = effectScope();
  const id = shallowRef<string | null>(null); const changeId = shallowRef<string | null>(null);
  const views = scope.run(() => ({ tx: useTransaction(stage, id), change: useStageChange(stage, () => id.value, changeId) }))!;
  expect(views.tx.value).toBeNull(); expect(views.change.value).toBeNull();
  id.value = tx.id; changeId.value = tx.changes[0]!.id;
  expect(views.change.value!.decision).toBe('pending');
  changeId.value = 'missing'; expect(() => views.change.value).toThrow(expect.objectContaining({ code: 'NOT_FOUND' }));
  id.value = 'missing'; expect(() => views.tx.value).toThrow(expect.objectContaining({ code: 'NOT_FOUND' }));
  id.value = null; expect(views.tx.value).toBeNull();
  scope.stop(); stage.dispose();
});
it('disposes exactly once, avoids repeated-version updates and permits independent scopes', () => {
  const { stage, tx } = setup(); let active = 0; const original = stage.subscribe;
  let notify!: () => void;
  vi.spyOn(stage, 'subscribe').mockImplementation(listener => { active++; notify = listener; const off = original(listener); return () => { active--; off(); }; });
  const first = effectScope(); const second = effectScope(); let renders = 0;
  first.run(() => { const view = useTransaction(stage, tx.id); watchSyncEffect(() => { void view.value; renders++; }); useAgentStage(stage); });
  second.run(() => useAgentStage(stage)); expect(active).toBe(2);
  const before = renders; notify(); expect(renders).toBe(before);
  first.stop(); first.stop(); expect(active).toBe(1);
  stage.acceptChange(tx.id, tx.changes[0]!.id); expect(renders).toBe(before);
  second.stop(); expect(active).toBe(0); stage.dispose();
});
it('rejects use outside a Vue scope before subscribing', () => {
  const { stage } = setup(); const subscribe = vi.spyOn(stage, 'subscribe');
  expect(() => useAgentStage(stage)).toThrow(expect.objectContaining({ code: 'INVALID_SCOPE' }));
  expect(subscribe).not.toHaveBeenCalled(); stage.dispose();
});
it('keeps pending decisions open and reports conflicts after external writes', async () => {
  const { stage, adapter, tx } = setup(); const scope = effectScope();
  const view = scope.run(() => useTransaction(stage, tx.id))!;
  stage.acceptChange(tx.id, tx.changes[0]!.id);
  expect(await stage.commit(tx.id)).toMatchObject({ status: 'failed', code: 'UNRESOLVED_CHANGES' });
  expect(view.value!.status).toBe('open');
  await adapter.commit({ expectedRevision: '0', operations: [{ op: 'replace', path: '/budget', value: 500 }] });
  stage.rejectChange(tx.id, tx.changes[1]!.id);
  expect((await stage.commit(tx.id)).status).toBe('conflict');
  expect(adapter.getSnapshot().state).toEqual({ budget: 500, status: 'active' });
  stage.rollback(tx.id); expect(view.value!.status).toBe('rolled-back');
  scope.stop(); stage.dispose();
});
