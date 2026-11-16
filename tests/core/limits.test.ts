import { expect, it, vi } from 'vitest';
import { createAgentStage, createMemoryAdapter } from '../../src/index.js';
import type { CommitResult, AgentStageOptions } from '../../src/index.js';
const empty = (stage: ReturnType<typeof createAgentStage>) => stage.propose({ base: stage.capture(), operations: [] });
it('prunes oldest by closure order, preserving open transactions and unique IDs', () => {
  const stage = createAgentStage(createMemoryAdapter({n:1}), {maxClosedTransactions: 1});
  const first = empty(stage); const second = empty(stage); const open = empty(stage);
  stage.rollback(second.id); stage.rollback(first.id);
  expect(() => stage.getTransaction(second.id)).toThrow(expect.objectContaining({code:'NOT_FOUND'}));
  expect(stage.getTransaction(first.id).status).toBe('rolled-back');
  expect(stage.getTransaction(open.id).status).toBe('open');
  expect(empty(stage).id).not.toBe(second.id);stage.dispose();
});
it('retains 50 closed by default and notifies after pruning is visible', () => {
 const stage=createAgentStage(createMemoryAdapter({}));const first=empty(stage);stage.rollback(first.id);
 for(let i=0;i<49;i++)stage.rollback(empty(stage).id);
 expect(stage.getTransaction(first.id).status).toBe('rolled-back');
 let pruned=false;const off=stage.subscribe(()=>{try{stage.getTransaction(first.id);}catch{pruned=true;}});
 stage.rollback(empty(stage).id);expect(pruned).toBe(true);off();stage.dispose();
});
it('zero retention prunes committed and rolled-back records but never rejected open groups',async()=>{
 const stage=createAgentStage(createMemoryAdapter({n:1}),{maxClosedTransactions:0});
 const tx=stage.propose({base:stage.capture(),operations:[{op:'replace',path:'/n',value:2}]});
 stage.rejectChange(tx.id,tx.changes[0]!.id);expect(stage.getTransaction(tx.id).status).toBe('open');
 expect((await stage.commit(tx.id)).status).toBe('committed');
 expect(()=>stage.getTransaction(tx.id)).toThrow(expect.objectContaining({code:'NOT_FOUND'}));
 const rolled=empty(stage);stage.rollback(rolled.id);expect(()=>stage.getTransaction(rolled.id)).toThrow();stage.dispose();
});
it('counts committing transactions against the open limit and never prunes them',async()=>{
 const memory=createMemoryAdapter({});let resolve!:(result:CommitResult)=>void;
 const stage=createAgentStage({...memory,commit:()=>new Promise<CommitResult>(done=>{resolve=done;})},{maxOpenTransactions:1,maxClosedTransactions:0});
 const tx=empty(stage);const commit=stage.commit(tx.id);
 expect(stage.getTransaction(tx.id).status).toBe('committing');
 expect(()=>empty(stage)).toThrow(expect.objectContaining({code:'OPEN_TRANSACTION_LIMIT_EXCEEDED'}));
 resolve({status:'committed',snapshot:memory.getSnapshot()});await commit;
 expect(()=>stage.getTransaction(tx.id)).toThrow();expect(empty(stage).status).toBe('open');stage.dispose();
});
it('keeps open work protected and closes malformed outcomes into configured history',async()=>{
 const memory=createMemoryAdapter({});const stage=createAgentStage(memory,{maxOpenTransactions:1});
 const tx=empty(stage);expect(()=>empty(stage)).toThrow();stage.rollback(tx.id);expect(empty(stage).status).toBe('open');stage.dispose();
 const broken=createAgentStage({...memory,commit:()=>null as unknown as CommitResult},{maxOpenTransactions:1,maxClosedTransactions:0});
 const pending=empty(broken);expect((await broken.commit(pending.id)).status).toBe('indeterminate');expect(()=>broken.getTransaction(pending.id)).toThrow(expect.objectContaining({code:'NOT_FOUND'}));expect(empty(broken).status).toBe('open');broken.dispose();
});
it.each([{maxClosedTransactions:-1},{maxClosedTransactions:Infinity},{maxOpenTransactions:0},{maxOpenTransactions:1.5},{workload:{maxOperations:1001}},{workload:{maxWorkUnits:NaN}}] as AgentStageOptions[])('validates limits before subscribing: %j',options=>{
 const adapter=createMemoryAdapter({});const subscribe=vi.spyOn(adapter,'subscribe');expect(()=>createAgentStage(adapter,options)).toThrow(expect.objectContaining({code:'INVALID_INPUT'}));expect(subscribe).not.toHaveBeenCalled();
});
it('rejects the high-complexity workload before grouping with no partial transaction or notification',()=>{
 const adapter=createMemoryAdapter(Array.from({length:20000},()=>0));const stage=createAgentStage(adapter);const base=stage.capture();const listener=vi.fn();stage.subscribe(listener);
 const patch=Array.from({length:1000},(_,value)=>({op:'replace' as const,path:'/0',value}));
 expect(()=>stage.propose({base,operations:patch})).toThrow(expect.objectContaining({code:'WORKLOAD_LIMIT_EXCEEDED'}));
 // With operation count raised, the combined-size budget still rejects it.
 const raised=createAgentStage(adapter,{workload:{maxOperations:1000}});
 expect(()=>raised.propose({base:raised.capture(),operations:patch})).toThrow(expect.objectContaining({code:'WORKLOAD_LIMIT_EXCEEDED'}));
 expect(listener).not.toHaveBeenCalled();expect(adapter.getSnapshot().state).toEqual(base.state);
 expect(stage.propose({base,operations:[]}).id).toBe('transaction-1');stage.dispose();raised.dispose();
});
it('accounts for copy amplification, inserted values, strings and deep paths',()=>{
 const cases=[{state:{value:'x'.repeat(10000)},operations:Array.from({length:20},(_,i)=>({op:'copy' as const,from:'/value',path:`/k${i}`}))},
 {state:{},operations:[{op:'add' as const,path:'/x',value:Array.from({length:1000},()=>0)}]}];
 for(const {state,operations} of cases){const stage=createAgentStage(createMemoryAdapter(state),{workload:{maxWorkUnits:1000}});expect(()=>stage.propose({base:stage.capture(),operations})).toThrow(expect.objectContaining({code:'WORKLOAD_LIMIT_EXCEEDED'}));stage.dispose();}
});
it('allows explicitly budgeted ordinary work and preserves selective approvals',async()=>{
 const adapter=createMemoryAdapter({a:1,b:2});const stage=createAgentStage(adapter,{workload:{maxOperations:2,maxWorkUnits:1000}});
 const tx=stage.propose({base:stage.capture(),operations:[{op:'replace',path:'/a',value:3},{op:'replace',path:'/b',value:4}]});
 stage.acceptChange(tx.id,tx.changes.find(c=>c.operationIndexes.includes(0))!.id);stage.rejectChange(tx.id,tx.changes.find(c=>c.operationIndexes.includes(1))!.id);
 expect(stage.preview(tx.id,'accepted')).toEqual({a:3,b:2});expect((await stage.commit(tx.id)).status).toBe('committed');expect(adapter.getSnapshot().state).toEqual({a:3,b:2});stage.dispose();
});
it('can raise or lower the budget without bypassing JSON safety and copies options at construction',()=>{
 const options={workload:{maxOperations:1,maxWorkUnits:10}};
 const stage=createAgentStage(createMemoryAdapter({n:1}),options);options.workload.maxWorkUnits=999999;
 expect(()=>stage.propose({base:stage.capture(),operations:[{op:'replace',path:'/n',value:2}]})).toThrow(expect.objectContaining({code:'WORKLOAD_LIMIT_EXCEEDED'}));stage.dispose();
 const raised=createAgentStage(createMemoryAdapter({n:1}),{workload:{maxOperations:1000,maxWorkUnits:10_000_000}});
 expect(raised.propose({base:raised.capture(),operations:Array.from({length:201},()=>({op:'replace',path:'/n',value:2}))}).operations).toHaveLength(201);
 expect(()=>raised.propose({base:raised.capture(),operations:[{op:'add',path:'/__proto__/x',value:1}]})).toThrow(expect.objectContaining({code:'INVALID_INPUT'}));raised.dispose();
});
it('checks deep-path budgets and protects stale transactions after conflicts',async()=>{
 const stage=createAgentStage(createMemoryAdapter({a:{b:{c:1}}}),{workload:{maxWorkUnits:10}});
 expect(()=>stage.propose({base:stage.capture(),operations:[{op:'replace',path:'/a/b/c',value:2}]})).toThrow(expect.objectContaining({code:'WORKLOAD_LIMIT_EXCEEDED'}));stage.dispose();
 const adapter=createMemoryAdapter({n:1});const stale=createAgentStage(adapter,{maxClosedTransactions:0,maxOpenTransactions:1});
 const tx=stale.propose({base:stale.capture(),operations:[{op:'replace',path:'/n',value:2}]});stale.acceptChange(tx.id,tx.changes[0]!.id);
 await adapter.commit({expectedRevision:'0',operations:[{op:'replace',path:'/n',value:3}]});
 expect((await stale.commit(tx.id)).status).toBe('conflict');expect(stale.getTransaction(tx.id).status).toBe('open');expect(()=>empty(stale)).toThrow();stale.rollback(tx.id);expect(empty(stale).status).toBe('open');stale.dispose();
});
