import { expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { createAgentStage } from '../../src/index.js';
import { createZustandAdapter } from '../../src/adapters/zustand.js';
import type { JsonValue } from '../../src/index.js';

type Project = { budget: number; team: string[] };
type State = { project: Project; theme: string; setBudget: (budget: number) => void };
function setup() {
  const store = createStore<State>((set) => ({ project: { budget: 100, team: ['Ada'] }, theme: 'dark', setBudget: budget => set(state => ({ project: { ...state.project, budget } })) }));
  const adapter = createZustandAdapter(store, { select: state => state.project, update: (_state, project) => ({ project }) });
  return { store, adapter, stage: createAgentStage(adapter) };
}
it('stages and commits selected JSON data while preserving actions and unrelated values', async () => {
  const { store, adapter, stage } = setup();
  const action = store.getState().setBudget;
  const tx = stage.propose({ base: stage.capture(), operations: [{ op: 'replace', path: '/budget', value: 200 }] });
  stage.acceptChange(tx.id, tx.changes[0]!.id);
  expect(store.getState().project.budget).toBe(100);
  expect((await stage.commit(tx.id)).status).toBe('committed');
  expect(store.getState()).toMatchObject({ project: { budget: 200 }, theme: 'dark', setBudget: action });
  action(300); expect(adapter.getSnapshot().state).toEqual({ budget: 300, team: ['Ada'] });
});
it('ignores unrelated and structurally identical updates but detects external changes and ABA', async () => {
  const { store, adapter, stage } = setup();
  const first = adapter.getSnapshot(); const listener = vi.fn(); adapter.subscribe(listener);
  store.setState({ theme: 'light' });
  store.setState({ project: { ...store.getState().project } });
  expect(adapter.getSnapshot().revision).toBe(first.revision); expect(listener).not.toHaveBeenCalled();
  const tx = stage.propose({ base: stage.capture(), operations: [{ op: 'replace', path: '/budget', value: 999 }] });
  stage.acceptChange(tx.id, tx.changes[0]!.id);
  store.getState().setBudget(150); const second = adapter.getSnapshot().revision;
  store.getState().setBudget(100); const third = adapter.getSnapshot().revision;
  expect(new Set([first.revision, second, third]).size).toBe(3);
  expect((await stage.commit(tx.id)).status).toBe('conflict');
  expect(store.getState().project.budget).toBe(100);
  expect(listener).toHaveBeenCalledTimes(2);
});
it('keeps patch failures atomic, including a failing move destination', async () => {
  const { adapter, store } = setup(); const base = adapter.getSnapshot();
  const listener = vi.fn(); store.subscribe(listener);
  expect((await adapter.commit({ expectedRevision: base.revision, operations: [
    { op: 'replace', path: '/budget', value: 200 }, { op: 'move', from: '/team/0', path: '/missing/x' },
  ] })).status).toBe('failed');
  expect(adapter.getSnapshot()).toEqual(base); expect(listener).not.toHaveBeenCalled();
});
it('rejects throwing or incorrect update callbacks before publishing', async () => {
  const store = createStore(() => ({ project: { n: 1 }, action: () => {} }));
  for (const [update, expected] of [[() => { throw new Error('update failed'); }, 'indeterminate'], [() => ({ project: { n: 99 } }), 'failed']] as const) {
    const adapter = createZustandAdapter(store, { select: state => state.project, update });
    const base = adapter.getSnapshot();
    expect((await adapter.commit({ expectedRevision: base.revision, operations: [{ op: 'replace', path: '/n', value: 2 }] })).status).toBe(expected);
    expect(adapter.getSnapshot()).toEqual(base); adapter.dispose();
  }
});
it('validates only the slice and can enforce domain schema before a root replacement', async () => {
  const store = createStore(() => ({ project: { n: 1 }, action: () => {}, date: new Date() }));
  const adapter = createZustandAdapter(store, { select: s => s.project, update: (_s, project) => ({ project }), validate: value => typeof value === 'object' && value !== null && 'n' in value });
  const base = adapter.getSnapshot();
  expect((await adapter.commit({ expectedRevision: base.revision, operations: [{ op: 'replace', path: '', value: null }] })).status).toBe('failed');
  expect(adapter.getSnapshot()).toEqual(base);
  expect(() => createZustandAdapter(store, { select: s => s as unknown as JsonValue, update: () => ({}) })).toThrow();
});
it('detaches snapshots, patches and commit results', async () => {
  const { adapter, store } = setup(); const base = adapter.getSnapshot();
  (base.state as Project).team.push('Not real');
  const team = ['Grace'];
  const result = await adapter.commit({ expectedRevision: base.revision, operations: [{ op: 'replace', path: '/team', value: team }] });
  team.push('Not real');
  if (result.status !== 'committed') throw new Error('Commit failed');
  (result.snapshot.state as Project).team.push('Not real');
  expect(store.getState().project.team).toEqual(['Grace']);
});
it('maintains independent adapter revisions and releases its store subscription', () => {
  const { store, adapter, stage } = setup();
  const originalSubscribe = store.subscribe;
  let subscriptions = 0;
  const subscribe = vi.spyOn(store, 'subscribe').mockImplementation(listener => {
    subscriptions++;
    const off = originalSubscribe(listener);
    return () => { subscriptions--; off(); };
  });
  const second = createZustandAdapter(store, { select: s => s.project, update: (_s, project) => ({ project }) });
  expect(second.getSnapshot().revision).not.toBe(adapter.getSnapshot().revision);
  expect(subscribe).toHaveBeenCalledTimes(1); expect(subscriptions).toBe(1);
  const listener = vi.fn(); second.subscribe(listener); second.dispose(); second.dispose();
  expect(subscriptions).toBe(0);
  stage.dispose(); adapter.dispose();
  store.getState().setBudget(200); expect(listener).not.toHaveBeenCalled();
  expect(() => second.getSnapshot()).toThrow();
});
it('reports successful publication even if a pre-existing Zustand observer throws', async () => {
  const store = createStore(() => ({ project: { n: 1 } }));
  store.subscribe(() => { throw new Error('observer failed'); });
  const adapter = createZustandAdapter(store, { select: s => s.project, update: (_s, project) => ({ project }) });
  const listener = vi.fn(); adapter.subscribe(listener);
  const base = adapter.getSnapshot();
  const result = await adapter.commit({ expectedRevision: base.revision, operations: [{ op: 'replace', path: '/n', value: 2 }] });
  expect(result.status).toBe('committed'); expect(store.getState().project.n).toBe(2);
  expect(listener).toHaveBeenCalledTimes(1);
  expect(adapter.getSnapshot().revision).not.toBe(base.revision);
});
it('detects invalid external slices and recovers without accepting old revisions', async () => {
  const store = createStore<{ project: JsonValue }>(() => ({ project: { n: 1 } }));
  const adapter = createZustandAdapter(store, { select: s => s.project, update: (_s, project) => ({ project }) });
  const base = adapter.getSnapshot();
  const listener = vi.fn(() => adapter.getSnapshot());
  adapter.subscribe(listener);
  store.setState({ project: new Date() as unknown as JsonValue });
  expect(listener).toHaveBeenCalledTimes(1);
  expect(() => adapter.getSnapshot()).toThrow();
  store.setState({ project: { n: 1 } });
  expect((await adapter.commit({ expectedRevision: base.revision, operations: [] })).status).toBe('conflict');
});
it('keeps concurrent proposals isolated and honors pending decisions', async () => {
  const { stage, store } = setup(); const base = stage.capture();
  const txs = [200, 300].map(value => stage.propose({ base, operations: [{ op: 'replace', path: '/budget', value }] }));
  expect((await stage.commit(txs[0]!.id))).toMatchObject({ status: 'failed', code: 'UNRESOLVED_CHANGES' });
  txs.forEach(tx => stage.acceptChange(tx.id, tx.changes[0]!.id));
  expect((await Promise.all(txs.map(tx => stage.commit(tx.id)))).map(r => r.status)).toEqual(['committed', 'conflict']);
  expect(store.getState().project.budget).toBe(200);
});
it('reports an unexpected update exception as indeterminate even when it wrote host state',async()=>{
 const store=createStore(()=>({project:{n:1}}));
 const adapter=createZustandAdapter(store,{select:s=>s.project,update(){store.setState({project:{n:3}});throw Error('after write');}});
 const result=await adapter.commit({expectedRevision:adapter.getSnapshot().revision,operations:[{op:'replace',path:'/n',value:2}]});
 expect(result).toMatchObject({status:'indeterminate',code:'ADAPTER_ERROR'});expect(store.getState().project.n).toBe(3);adapter.dispose();
});
it('does not assume a prepared updater was published if a store wrapper throws before publication',async()=>{
 const store=createStore(()=>({project:{n:1}}));
 const adapter=createZustandAdapter({...store,setState:((updater:unknown)=>{if(typeof updater==='function')updater(store.getState());throw Error('not published');}) as typeof store.setState},{select:s=>s.project,update:(_s,project)=>({project})});
 expect((await adapter.commit({expectedRevision:adapter.getSnapshot().revision,operations:[{op:'replace',path:'/n',value:2}]})).status).toBe('indeterminate');
 expect(store.getState().project.n).toBe(1);adapter.dispose();
});
it('reports uncertainty if a store wrapper writes without executing the provided updater',async()=>{
 const store=createStore(()=>({project:{n:1}}));
 const adapter=createZustandAdapter({...store,setState:((..._args:unknown[])=>{store.setState({project:{n:3}});}) as typeof store.setState},{select:s=>s.project,update:(_s,project)=>({project})});
 expect((await adapter.commit({expectedRevision:adapter.getSnapshot().revision,operations:[]})).status).toBe('indeterminate');
 expect(store.getState().project.n).toBe(3);adapter.dispose();
});
