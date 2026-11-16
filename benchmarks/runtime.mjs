import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { createAgentStage, createMemoryAdapter } from '../dist/index.js';
const results=[];
async function measure(name,iterations,fn){for(let i=0;i<3;i++)await fn();const times=[];for(let i=0;i<iterations;i++){const start=performance.now();await fn();times.push(performance.now()-start);}times.sort((a,b)=>a-b);results.push({name,iterations,medianMs:+times[Math.floor(times.length/2)].toFixed(6),p95Ms:+times[Math.min(times.length-1,Math.floor(times.length*.95))].toFixed(6)});}
for(const [name,state] of [['small',{n:1}],['nested',Object.fromEntries(Array.from({length:2000},(_,i)=>['k'+i,{n:i,details:{label:'entry',enabled:true}}]))],['array',Array.from({length:20000},(_,i)=>i)]]){
 const adapter=createMemoryAdapter(state);const stage=createAgentStage(adapter);const path=name==='small'?'/n':name==='nested'?'/k0/n':'/0';
 await measure(name+' capture/propose',20,()=>{const t=stage.propose({base:stage.capture(),operations:[{op:'replace',path,value:2}]});stage.rollback(t.id);});
 const tx=stage.propose({base:stage.capture(),operations:[{op:'replace',path,value:2}]});
 await measure(name+' preview',30,()=>stage.preview(tx.id));
 await measure(name+' decisions',100,()=>{stage.acceptChange(tx.id,tx.changes[0].id);stage.rejectChange(tx.id,tx.changes[0].id);});
 await measure(name+' commit',20,async()=>{const t=stage.propose({base:stage.capture(),operations:[{op:'replace',path,value:3}]});stage.acceptChange(t.id,t.changes[0].id);const start=performance.now();const r=await stage.commit(t.id);if(r.status!=='committed')throw Error('commit');return performance.now()-start;});
 const commitTimes=[];
 for(let i=0;i<20;i++){const t=stage.propose({base:stage.capture(),operations:[{op:'replace',path,value:4}]});stage.acceptChange(t.id,t.changes[0].id);const start=performance.now();await stage.commit(t.id);commitTimes.push(performance.now()-start);}
 commitTimes.sort((a,b)=>a-b);results.push({name:name+' commit only',iterations:20,medianMs:+commitTimes[10].toFixed(6),p95Ms:+commitTimes[19].toFixed(6)});
 stage.dispose();
}
await measure('1000 independent small transactions (configured capacity)',5,()=>{const s=createAgentStage(createMemoryAdapter({n:1}),{maxOpenTransactions:1000});const base=s.capture();for(let i=0;i<1000;i++)s.propose({base,operations:[]});s.dispose();});
const stage=createAgentStage(createMemoryAdapter({}),{maxOpenTransactions:1000});const base=stage.capture();
const operations=Array.from({length:1000},(_,i)=>({op:'add',path:'/k'+i,value:i}));
await measure('1000 operations rejected by default',5,()=>{try{stage.propose({base,operations});throw Error('Expected rejection');}catch(e){if(e.code!=='WORKLOAD_LIMIT_EXCEEDED')throw e;}});
let calls=0;const offs=Array.from({length:1000},()=>stage.subscribe(()=>calls++));
await measure('1000 subscriber notification',100,()=>stage.propose({base,operations:[]}));offs.forEach(off=>off());stage.dispose();
const large=createAgentStage(createMemoryAdapter(Array.from({length:20000},()=>0)));
const largeBase=large.capture();const largeStart=performance.now();try{large.propose({base:largeBase,operations:Array.from({length:1000},(_,i)=>({op:'replace',path:'/0',value:i}))});throw Error('Expected rejection');}catch(e){if(e.code!=='WORKLOAD_LIMIT_EXCEEDED')throw e;}results.push({name:'20000-element state with 1000 operations rejected (single sample)',iterations:1,medianMs:+(performance.now()-largeStart).toFixed(6)});large.dispose();
const history=createAgentStage(createMemoryAdapter({payload:'x'.repeat(10000)}));
globalThis.gc?.();const before=process.memoryUsage().heapUsed;
for(let i=0;i<3000;i++){const tx=history.propose({base:history.capture(),operations:[]});history.rollback(tx.id);}
globalThis.gc?.();const retained=process.memoryUsage().heapUsed;history.dispose();await new Promise(setImmediate);globalThis.gc?.();const after=process.memoryUsage().heapUsed;
const cycleStart=process.memoryUsage().heapUsed;
for(let cycle=0;cycle<20;cycle++){const s=createAgentStage(createMemoryAdapter({payload:'x'.repeat(10000)}));const offs=Array.from({length:10},()=>s.subscribe(()=>{}));for(let i=0;i<200;i++){const tx=s.propose({base:s.capture(),operations:[]});s.rollback(tx.id);}offs.forEach(off=>off());s.dispose();await new Promise(setImmediate);globalThis.gc?.();}
const cycleEnd=process.memoryUsage().heapUsed;
const report={cycles:{count:20,transactionsPerCycle:200,subscribersPerCycle:10,beforeBytes:cycleStart,afterBytes:cycleEnd},node:process.version,platform:process.platform,arch:process.arch,results,memory:{transactions:3000,payloadBytes:10000,beforeBytes:before,retainedBytes:retained,afterDisposeBytes:after},notifications:calls,notes:'Rows named commit include capture/propose/approval; commit only rows exclude preparation. Single process; timings are descriptive, not CI thresholds.'};
console.log(JSON.stringify(report,null,2));writeFileSync(new URL('./results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
