import { expect, it, vi } from 'vitest';
import { createAgentStage, createMemoryAdapter } from '../../src/index.js';
import type { CommitResult } from '../../src/index.js';

it.each([false,true])('never retries a throw (host was applied: %s)',async apply=>{
 const memory=createMemoryAdapter({count:0});let calls=0;
 const stage=createAgentStage({...memory,async commit(request){calls++;if(apply)await memory.commit(request);throw new Error('transport lost');}});
 const tx=stage.propose({base:stage.capture(),operations:[{op:'replace',path:'/count',value:1}]});stage.acceptChange(tx.id,tx.changes[0]!.id);
 const result=await stage.commit(tx.id);expect(result).toEqual({status:'indeterminate',code:'ADAPTER_ERROR',message:'transport lost'});
 expect(stage.getTransaction(tx.id)).toMatchObject({status:'indeterminate',commitResult:result});
 await expect(stage.commit(tx.id)).rejects.toMatchObject({code:'INVALID_STATUS'});
 expect(()=>stage.rollback(tx.id)).toThrow(expect.objectContaining({code:'INVALID_STATUS'}));
 expect(()=>stage.acceptChange(tx.id,tx.changes[0]!.id)).toThrow();
 expect(calls).toBe(1);expect(memory.getSnapshot().state).toEqual({count:apply?1:0});stage.dispose();
});
it.each([{},null,{status:'failed'},{status:'failed',code:3,message:'bad'},{status:'committed',snapshot:{state:undefined,revision:'1'}},{status:'committed',snapshot:{state:new Date(),revision:'1'}},{status:'unsupported'},{status:'conflict',expectedRevision:'wrong',actualRevision:'1'}])('malformed results close explicitly with one terminal notification: %j',async response=>{
 const memory=createMemoryAdapter({});const stage=createAgentStage({...memory,commit:()=>response as CommitResult},{maxOpenTransactions:1,maxClosedTransactions:1});
 const tx=stage.propose({base:stage.capture(),operations:[]});const states:string[]=[];
 stage.subscribe(()=>states.push(stage.getTransaction(tx.id).status));
 const result=await stage.commit(tx.id);expect(result).toMatchObject({status:'indeterminate',code:'INVALID_ADAPTER'});
 expect(states).toEqual(['committing','indeterminate']);expect(stage.getTransaction(tx.id).commitResult).toEqual(result);
 expect(stage.propose({base:stage.capture(),operations:[]}).status).toBe('open');stage.dispose();
});
it('retains detached diagnostics and prunes by terminal closure order',async()=>{
 const memory=createMemoryAdapter({});const stage=createAgentStage({...memory,commit:()=>({status:'indeterminate',code:'TIMEOUT',message:'reconcile'})},{maxClosedTransactions:1});
 const first=stage.propose({base:stage.capture(),operations:[]});const result=await stage.commit(first.id);
 if(result.status!=='indeterminate')throw Error('outcome');(result as {message:string}).message='changed';
 expect(stage.getTransaction(first.id).commitResult?.message).toBe('reconcile');
 const next=stage.propose({base:stage.capture(),operations:[]});stage.rollback(next.id);
 expect(()=>stage.getTransaction(first.id)).toThrow(expect.objectContaining({code:'NOT_FOUND'}));stage.dispose();
});
it('zero history releases capacity and still returns the diagnostic',async()=>{
 const memory=createMemoryAdapter({});const stage=createAgentStage({...memory,commit(){throw 'unknown';}},{maxClosedTransactions:0,maxOpenTransactions:1});
 const tx=stage.propose({base:stage.capture(),operations:[]});const listener=vi.fn();stage.subscribe(listener);
 expect(await stage.commit(tx.id)).toEqual({status:'indeterminate',code:'ADAPTER_ERROR',message:'unknown'});
 expect(listener).toHaveBeenCalledTimes(2);expect(()=>stage.getTransaction(tx.id)).toThrow();
 expect(stage.propose({base:stage.capture(),operations:[]}).status).toBe('open');stage.dispose();
});
it.each(['failed','conflict'] as const)('keeps a valid %s outcome open without uncertainty',async status=>{
 const memory=createMemoryAdapter({});const stage=createAgentStage({...memory,commit:request=>status==='failed'?{status,code:'OFFLINE',message:'not applied'}:{status,expectedRevision:request.expectedRevision,actualRevision:'other'}});
 const tx=stage.propose({base:stage.capture(),operations:[]});expect((await stage.commit(tx.id)).status).toBe(status);expect(stage.getTransaction(tx.id).status).toBe('open');expect(stage.getTransaction(tx.id).commitResult).toBeUndefined();stage.dispose();
});
it.each([{status:'failed'},{status:'committed',snapshot:{state:null,revision:2}}])('prevents duplicate writes after malformed post-publication response: %j',async response=>{
 const memory=createMemoryAdapter({items:[]});let calls=0;
 const stage=createAgentStage({...memory,async commit(request){calls++;await memory.commit(request);return response as unknown as CommitResult;}});
 const tx=stage.propose({base:stage.capture(),operations:[{op:'add',path:'/items/-',value:'once'}]});stage.acceptChange(tx.id,tx.changes[0]!.id);
 expect((await stage.commit(tx.id)).status).toBe('indeterminate');await expect(stage.commit(tx.id)).rejects.toMatchObject({code:'INVALID_STATUS'});
 expect(memory.getSnapshot().state).toEqual({items:['once']});expect(calls).toBe(1);stage.dispose();
});
it('publishes diagnostics and releases capacity before the one terminal notification',async()=>{
 const memory=createMemoryAdapter({});const stage=createAgentStage({...memory,commit(){throw new Error('lost');}},{maxOpenTransactions:1});
 const tx=stage.propose({base:stage.capture(),operations:[]});let observed=0;let diagnostic:unknown;let admitted:unknown;
 const off=stage.subscribe(()=>{const view=stage.getTransaction(tx.id);if(view.status==='indeterminate'){observed++;diagnostic=view.commitResult;off();admitted=stage.propose({base:stage.capture(),operations:[]}).status;}});
 await stage.commit(tx.id);expect(observed).toBe(1);expect(diagnostic).toMatchObject({code:'ADAPTER_ERROR',message:'lost'});expect(admitted).toBe('open');stage.dispose();
});
it('normalizes validated result envelopes without losing nonenumerable fields',async()=>{
 const memory=createMemoryAdapter({});const response=Object.defineProperties({}, {status:{value:'committed'},snapshot:{value:memory.getSnapshot()}});
 const stage=createAgentStage({...memory,commit:()=>response as CommitResult});const tx=stage.propose({base:stage.capture(),operations:[]});
 expect((await stage.commit(tx.id)).status).toBe('committed');expect(stage.getTransaction(tx.id).status).toBe('committed');stage.dispose();
});
it('handles nonstandard thrown diagnostics without losing the terminal transition',async()=>{
 const memory=createMemoryAdapter({});const error=new Error('hidden');Object.defineProperty(error,'message',{get(){throw Error('getter');}});
 const stage=createAgentStage({...memory,commit(){throw error;}});const tx=stage.propose({base:stage.capture(),operations:[]});
 expect(await stage.commit(tx.id)).toMatchObject({status:'indeterminate',code:'ADAPTER_ERROR'});expect(stage.getTransaction(tx.id).status).toBe('indeterminate');stage.dispose();
});
it('returns uncertainty after disposal without resurrecting history or notifying disposed subscribers',async()=>{
 const memory=createMemoryAdapter({});let reject!:(reason:unknown)=>void;
 const stage=createAgentStage({...memory,commit:()=>new Promise<CommitResult>((_resolve,fail)=>{reject=fail;})});
 const tx=stage.propose({base:stage.capture(),operations:[]});const listener=vi.fn();stage.subscribe(listener);
 const pending=stage.commit(tx.id);stage.dispose();reject(new Error('late timeout'));
 expect(await pending).toMatchObject({status:'indeterminate',message:'late timeout'});expect(listener).toHaveBeenCalledTimes(1);
 expect(()=>stage.getTransaction(tx.id)).toThrow(expect.objectContaining({code:'DISPOSED'}));
});
