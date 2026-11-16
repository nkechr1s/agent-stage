import {performance} from 'node:perf_hooks';
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const target=process.argv[2]||'../dist/index.js';
const {createAgentStage,createMemoryAdapter}=await import(target.startsWith('/')?pathToFileURL(target):new URL(target,import.meta.url));
const rows=[];
async function sample(name,fn,count=20){for(let i=0;i<3;i++){try{await fn();}catch(e){if(e.code!=='WORKLOAD_LIMIT_EXCEEDED')throw e;}}const times=[];let rejected=0;for(let i=0;i<count;i++){const start=performance.now();try{if(await fn()==='rejected')rejected++;}catch(error){if(error.code!=='WORKLOAD_LIMIT_EXCEEDED')throw error;rejected++;}times.push(performance.now()-start);}times.sort((a,b)=>a-b);rows.push({name,count,rejected,medianMs:times[Math.floor(count/2)],p95Ms:times[Math.min(count-1,Math.floor(count*.95))]});}
for(const [name,state,path,operations] of [
 ['small',{n:1},'/n',1],['medium',Object.fromEntries(Array.from({length:500},(_,i)=>['k'+i,{n:i,label:'item'}])),'/k0/n',10],['large array',Array.from({length:20000},()=>0),'/0',1],['large batch',{n:1},'/n',200],['combined',Array.from({length:20000},()=>0),'/0',1000]]){
 const stage=createAgentStage(createMemoryAdapter(state));const base=stage.capture();
 const patch=Array.from({length:operations},(_,i)=>({op:'replace',path,value:i}));
 // Warmups for rejected cases must also be caught.
 const run=()=>{const tx=stage.propose({base,operations:patch});stage.rollback(tx.id);};
 let allowed=true;try{run();}catch(e){if(e.code!=='WORKLOAD_LIMIT_EXCEEDED')throw e;allowed=false;}
 await sample(name+' proposal',()=>{try{run();}catch(e){if(!allowed&&e.code==='WORKLOAD_LIMIT_EXCEEDED')return 'rejected';throw e;}},name==='combined'?5:20);
 rows.at(-1).outcome=allowed?'executed':'rejected';
 if(allowed){const tx=stage.propose({base,operations:patch});await sample(name+' repeated preview',()=>stage.preview(tx.id));stage.rollback(tx.id);}stage.dispose();
}
const combined=createAgentStage(createMemoryAdapter(Array.from({length:20000},()=>0)),{workload:{maxOperations:1000}});const combinedBase=combined.capture();
await sample('combined with maxOperations raised (work-unit guard)',()=>combined.propose({base:combinedBase,operations:Array.from({length:1000},()=>({op:'replace',path:'/0',value:1}))}),5);combined.dispose();
if (!target.startsWith('/')) {
 const {measureJson}=await import('../dist/core/json.js');const {checkWorkload}=await import('../dist/core/limits.js');
 const state=Array.from({length:20000},()=>0);const units=measureJson(state).units;const patch=[{op:'replace',path:'/0',value:1}];
 await sample('alternative: recount base for each admission',()=>checkWorkload(measureJson(state).units,patch,250000));
 await sample('alternative: reuse validated capture size',()=>checkWorkload(units,patch,250000));
}
await sample('1000 sequential transactions',()=>{const stage=createAgentStage(createMemoryAdapter({n:1}));const base=stage.capture();for(let i=0;i<1000;i++){const t=stage.propose({base,operations:[]});stage.rollback(t.id);}stage.dispose();},10);
globalThis.gc?.();const before=process.memoryUsage().heapUsed;const stage=createAgentStage(createMemoryAdapter({payload:'x'.repeat(10000)}));
for(let i=0;i<3000;i++){const t=stage.propose({base:stage.capture(),operations:[]});stage.rollback(t.id);}
globalThis.gc?.();const retained=process.memoryUsage().heapUsed;stage.dispose();await new Promise(setImmediate);globalThis.gc?.();const disposed=process.memoryUsage().heapUsed;
const report={target,node:process.version,platform:process.platform,arch:process.arch,rows,memory:{before,retained,disposed}};console.log(JSON.stringify(report,null,2));if(process.argv[3])writeFileSync(process.env.HARDENING_RESULTS || process.argv[3],JSON.stringify(report,null,2)+'\n');
