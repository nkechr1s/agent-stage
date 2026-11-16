import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { createAgentStage, createMemoryAdapter } from '../../src/index.js';
const stage=createAgentStage(createMemoryAdapter({payload:'x'.repeat(10000)}),{maxClosedTransactions:0});
const capture=stage.capture();
const original=globalThis.structuredClone;
const copies:WeakRef<object>[]=[];
globalThis.structuredClone=<T>(value:T, options?:StructuredSerializeOptions):T=>{
 if(value && typeof value==='object' && 'operations' in value && Array.isArray(value.operations)) copies.push(new WeakRef(value.operations));
 const copy=original(value,options);
 if(copy!==null&&typeof copy==='object')copies.push(new WeakRef(copy));
 return copy;
};
function close():string{const tx=stage.propose({base:capture,operations:[{op:'replace',path:'/payload',value:'proposed'}]});stage.rollback(tx.id);return tx.id;}
const id=close();globalThis.structuredClone=original;
for(let i=0;i<30;i++){await setImmediate();globalThis.gc!();if(copies.every(copy=>copy.deref()===undefined))break;}
assert.ok(copies.length>0);assert.ok(copies.every(copy=>copy.deref()===undefined),'Pruned private base or view still retained');
assert.throws(()=>stage.getTransaction(id));assert.equal(capture.revision,'0');
for(let cycle=0;cycle<20;cycle++){
 const s=createAgentStage(createMemoryAdapter({payload:'x'.repeat(10000)}));
 const offs=Array.from({length:10},()=>s.subscribe(()=>{}));
 for(let i=0;i<200;i++){const tx=s.propose({base:s.capture(),operations:[]});s.rollback(tx.id);}
 offs.forEach(off=>off());s.dispose();assert.throws(()=>s.capture());
}
stage.dispose();
