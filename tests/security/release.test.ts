import { expect, it } from 'vitest';
import { createAgentStage, createMemoryAdapter, applyPatch } from '../../src/index.js';
import type { CommitResult, Operation, Snapshot } from '../../src/index.js';
it.each([null, {}, {status:'wat'}, {status:'committed',snapshot:null}])('handles malformed adapter results without an unhandled exception: %j', async result => {
 const memory=createMemoryAdapter({n:1});
 const stage=createAgentStage({...memory,commit:()=>result as unknown as CommitResult});
 const tx=stage.propose({base:stage.capture(),operations:[]});
 await expect(stage.commit(tx.id)).resolves.toMatchObject({status:'failed',code:'INVALID_ADAPTER'});
 expect(stage.getTransaction(tx.id).status).toBe('committing');
 await expect(stage.commit(tx.id)).rejects.toThrow();stage.dispose();
});
it('rejects forged metadata without changing another transaction',()=>{
 const stage=createAgentStage(createMemoryAdapter({n:1}));const base=stage.capture();
 const tx=stage.propose({base,operations:[]});
 expect(()=>stage.propose({base:JSON.parse(JSON.stringify(base)) as Snapshot,operations:[]})).toThrow();
 expect(()=>stage.acceptChange('__proto__','constructor')).toThrow();
 expect(stage.getTransaction(tx.id).status).toBe('open');stage.dispose();
});
it('rejects pollution through both source and destination pointers and nested values',()=>{
 for(const path of ['/__proto__/x','/constructor/prototype/x','/prototype/x']){
  expect(()=>applyPatch({},[{op:'copy',from:path,path:'/x'}])).toThrow();
  expect(()=>applyPatch({},[{op:'add',path,value:1}])).toThrow();
 }
 expect(()=>applyPatch({},[{op:'add',path:'/x',value:JSON.parse('{"constructor":{"prototype":{"polluted":true}}}')}])).toThrow();
 expect(Object.hasOwn(Object.prototype,'polluted')).toBe(false);
});
it('rejects limit overflows and does not publish partially applied patches',async()=>{
 const adapter=createMemoryAdapter({n:1});
 const operations=Array.from({length:1001},()=>({op:'replace',path:'/n',value:2} as Operation));
 expect((await adapter.commit({expectedRevision:'0',operations})).status).toBe('failed');
 expect(adapter.getSnapshot()).toEqual({revision:'0',state:{n:1}});
});
it('prevents reentrant duplicate commits and decision changes from committing observers',async()=>{
 const adapter=createMemoryAdapter({n:1});const stage=createAgentStage(adapter);
 const tx=stage.propose({base:stage.capture(),operations:[{op:'replace',path:'/n',value:2}]});stage.acceptChange(tx.id,tx.changes[0]!.id);
 let attempted=false;const nested:Promise<unknown>[]=[];
 stage.subscribe(()=>{if(!attempted&&stage.getTransaction(tx.id).status==='committing'){attempted=true;expect(()=>stage.rejectChange(tx.id,tx.changes[0]!.id)).toThrow();nested.push(expect(stage.commit(tx.id)).rejects.toThrow());}});
 expect((await stage.commit(tx.id)).status).toBe('committed');await Promise.all(nested);expect(adapter.getSnapshot().revision).toBe('1');stage.dispose();
});
it('validates a maximum-size snapshot independently of its result envelope',async()=>{
 const stage=createAgentStage(createMemoryAdapter(Array.from({length:99999},()=>null)));
 const tx=stage.propose({base:stage.capture(),operations:[]});expect((await stage.commit(tx.id)).status).toBe('committed');stage.dispose();
});
