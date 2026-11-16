import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { setImmediate } from 'node:timers/promises';
import { createAgentStage, createMemoryAdapter } from '../dist/index.js';
const cycles=Number(process.env.SOAK_CYCLES||100);const transactions=Number(process.env.SOAK_TRANSACTIONS||1000);
assert(Number.isSafeInteger(cycles)&&cycles>0&&Number.isSafeInteger(transactions)&&transactions>0);
const samples=[];const start=performance.now();
for(let cycle=0;cycle<cycles;cycle++){
 const stage=createAgentStage(createMemoryAdapter({n:0,payload:'x'.repeat(10000)}),{maxClosedTransactions:10,maxOpenTransactions:2});let notifications=0;
 const off=stage.subscribe(()=>notifications++);let oldest;
 for(let i=0;i<transactions;i++){const tx=stage.propose({base:stage.capture(),operations:[{op:'replace',path:'/n',value:i}]});oldest??=tx.id;stage.acceptChange(tx.id,tx.changes[0].id);assert.equal((await stage.commit(tx.id)).status,'committed');}
 if(transactions>10)assert.throws(()=>stage.getTransaction(oldest),{code:'NOT_FOUND'});
 assert.throws(()=>stage.propose({base:stage.capture(),operations:Array.from({length:1000},()=>({op:'replace',path:'/n',value:1}))}),{code:'WORKLOAD_LIMIT_EXCEEDED'});
 off();const before=notifications;const last=stage.propose({base:stage.capture(),operations:[]});stage.rollback(last.id);assert.equal(notifications,before);stage.dispose();assert.throws(()=>stage.capture(),{code:'DISPOSED'});
 await setImmediate();globalThis.gc?.();samples.push({cycle,heapUsed:process.memoryUsage().heapUsed,notifications});
}
const report={node:process.version,cycles,transactionsPerCycle:transactions,elapsedMs:performance.now()-start,samples,notes:'No heap/timing threshold: descriptive measurements, correctness assertions only.'};
console.log(JSON.stringify(report,null,2));writeFileSync(process.env.SOAK_RESULTS||'benchmarks/soak-results.json',JSON.stringify(report,null,2)+'\n');
