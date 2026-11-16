import { expect, it, vi } from 'vitest';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { createAgentStage, createMemoryAdapter } from '../../src/index.js';
import { injectAgentStage, injectTransaction, injectStageChange } from 'agent-stage/angular';
function setup() {
  const adapter = createMemoryAdapter({ budget: 100, status: 'active' }); const stage = createAgentStage(adapter);
  const tx = stage.propose({ base: stage.capture(), operations: [
    { op: 'replace', path: '/budget', value: 200 }, { op: 'replace', path: '/status', value: 'archived' },
  ] });
  const injector = Injector.create({ providers: [] });
  return { adapter, stage, tx, injector };
}
it('shares a DestroyRef subscription and updates signals, host values and decisions', async () => {
  const { stage, adapter, tx, injector } = setup(); const subscribe = vi.spyOn(stage, 'subscribe');
  const views = runInInjectionContext(injector, () => ({ host: injectAgentStage(stage), tx: injectTransaction(stage, tx.id), change: injectStageChange(stage, tx.id, tx.changes[0]!.id) }));
  expect(subscribe).toHaveBeenCalledTimes(1);
  const host = views.host(); expect(views.host()).toBe(host); expect(views.tx()).toBe(views.tx());
  expect(Object.isFrozen(host.state)).toBe(true); expect(Object.isFrozen(views.tx()!.changes[0]!.operationIndexes)).toBe(true);
  expect(() => (host.state as { budget: number }).budget = 999).toThrow();
  expect(stage.propose({ base: host, operations: [] }).base.state).toEqual(host.state);
  stage.acceptChange(tx.id, tx.changes[0]!.id); stage.rejectChange(tx.id, tx.changes[1]!.id);
  expect(views.change()!.decision).toBe('accepted'); expect(views.tx()!.changes[1]!.decision).toBe('rejected');
  expect((await stage.commit(tx.id)).status).toBe('committed');
  expect(views.host().state).toEqual({ budget: 200, status: 'active' });
  await adapter.commit({ expectedRevision: adapter.getSnapshot().revision, operations: [{ op: 'replace', path: '/budget', value: 300 }] });
  expect(views.host().state).toEqual({ budget: 300, status: 'active' });
  expect(views.tx()!.base.state).toEqual({ budget: 100, status: 'active' });
  injector.destroy(); stage.dispose();
});
it('supports nullable signal/getter IDs and structured unknown-ID errors', () => {
  const { stage, tx, injector } = setup(); const id = signal<string | null>(null); const changeId = signal<string | null>(null);
  const views = runInInjectionContext(injector, () => ({ tx: injectTransaction(stage, id), change: injectStageChange(stage, () => id(), changeId) }));
  expect(views.tx()).toBeNull(); expect(views.change()).toBeNull();
  id.set(tx.id); changeId.set(tx.changes[0]!.id); expect(views.change()!.decision).toBe('pending');
  changeId.set('missing'); expect(() => views.change()).toThrow(expect.objectContaining({ code: 'NOT_FOUND' }));
  id.set('missing'); expect(() => views.tx()).toThrow(expect.objectContaining({ code: 'NOT_FOUND' }));
  id.set(null); expect(views.tx()).toBeNull();
  injector.destroy(); stage.dispose();
});
it('requires an injection context and never subscribes when called outside one', () => {
  const { stage, injector } = setup(); const subscribe = vi.spyOn(stage, 'subscribe');
  expect(() => injectAgentStage(stage)).toThrow(); expect(subscribe).not.toHaveBeenCalled();
  injector.destroy(); stage.dispose();
});
it('releases all subscriptions when injectors are destroyed and leaves the stage usable', () => {
  const { stage, tx, injector } = setup(); const second = Injector.create({ providers: [] });
  const original = stage.subscribe; let active = 0; let callback!: () => void;
  vi.spyOn(stage, 'subscribe').mockImplementation(listener => { active++; callback = listener; const off = original(listener); return () => { active--; off(); }; });
  const firstView = runInInjectionContext(injector, () => injectTransaction(stage, tx.id));
  const secondView = runInInjectionContext(second, () => injectTransaction(stage, tx.id));
  const cached = secondView(); callback(); expect(secondView()).toBe(cached);
  expect(active).toBe(1); const before = firstView(); injector.destroy(); expect(active).toBe(1);
  stage.acceptChange(tx.id, tx.changes[0]!.id);
  expect(firstView()).toBe(before); expect(secondView()!.changes[0]!.decision).toBe('accepted');
  second.destroy(); expect(active).toBe(0);
  expect(stage.capture().state).toEqual({ budget: 100, status: 'active' }); stage.dispose();
});
it('keeps pending decisions open and reports conflicts after external writes', async () => {
  const { stage, adapter, tx, injector } = setup();
  const view = runInInjectionContext(injector, () => injectTransaction(stage, tx.id));
  stage.acceptChange(tx.id, tx.changes[0]!.id);
  expect(await stage.commit(tx.id)).toMatchObject({ status: 'failed', code: 'UNRESOLVED_CHANGES' });
  expect(view()!.status).toBe('open');
  await adapter.commit({ expectedRevision: '0', operations: [{ op: 'replace', path: '/budget', value: 500 }] });
  stage.rejectChange(tx.id, tx.changes[1]!.id);
  expect((await stage.commit(tx.id)).status).toBe('conflict');
  expect(adapter.getSnapshot().state).toEqual({ budget: 500, status: 'active' });
  stage.rollback(tx.id); expect(view()!.status).toBe('rolled-back');
  injector.destroy(); stage.dispose();
});
