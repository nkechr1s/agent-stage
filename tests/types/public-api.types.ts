import { createAgentStage, createMemoryAdapter, applyPatch } from 'agent-stage';
import type { DeepReadonly, Snapshot, Transaction, Operation, CommitResult, ReadonlyJsonValue, StateAdapter } from 'agent-stage';
import { useAgentStage as reactHost, useTransaction as reactTransaction, useStageChange as reactChange } from 'agent-stage/react';
import { useAgentStage as vueHost, useTransaction as vueTransaction, useStageChange as vueChange } from 'agent-stage/vue';
import { injectAgentStage, injectTransaction, injectStageChange } from 'agent-stage/angular';
import { createZustandAdapter } from 'agent-stage/zustand';
import { createStore } from 'zustand/vanilla';

// Compile only. Never invoke framework hooks outside their lifecycle contexts.
export function checkPublicTypes(performMutations: boolean) {
 const input={nested:{items:[{labels:['a']} ]}};
 const operations:Operation[]=[{op:'replace',path:'/nested',value:input.nested}];
 operations.push({op:'test',path:'',value:input}); input.nested.items[0]!.labels.push('b');
 const adapter=createMemoryAdapter(input);const stage=createAgentStage(adapter);
 const capture=stage.capture();const tx=stage.propose({base:capture,operations});
 stage.propose({base:capture,operations:tx.operations});
 // @ts-expect-error snapshot root is readonly
 if(performMutations)capture.state=null;
 const object=capture.state as Extract<Snapshot['state'],{readonly [key:string]:ReadonlyJsonValue}>;
 // @ts-expect-error nested object properties are readonly
 if(performMutations)object.nested=null;
 const array=object.nested as Extract<ReadonlyJsonValue,readonly unknown[]>;
 // @ts-expect-error array mutators are unavailable
 array.push(null);
 // @ts-expect-error array elements cannot be replaced
 if(performMutations)array[0]=null;
 const nested=array[0] as Extract<ReadonlyJsonValue,{readonly [key:string]:ReadonlyJsonValue}>;
 // @ts-expect-error nested elements retain readonly properties
 nested.labels=[];
 // @ts-expect-error transaction decisions array is readonly
 tx.changes.pop();
 // @ts-expect-error decision is readonly
 tx.changes[0]!.decision='accepted';
 // @ts-expect-error related operation indexes are readonly
 tx.changes[0]!.operationIndexes.push(0);
 // @ts-expect-error previous values are readonly
 (tx.base.state as typeof object).nested=null;
 const op=tx.operations[0]!;
 if('value' in op){
  // @ts-expect-error operation values are readonly
  op.value=null;
  // @ts-expect-error nested proposed values are readonly
  (op.value as typeof object).nested=null;
 }
 const preview=stage.preview(tx.id) as typeof object;
 // @ts-expect-error preview is recursively readonly
 preview.nested=null;
 const patch=applyPatch(input,operations) as typeof object;
 // @ts-expect-error detached patch output is readonly
 patch.nested=null;
 type Project={nested:{items:{labels:string[]}[]}};
 const typed:DeepReadonly<Project>=input;
 const label:string=typed.nested.items[0]!.labels[0]!;void label;
 // @ts-expect-error inferred nested arrays retain readonly methods
 typed.nested.items[0]!.labels.push('c');
 // @ts-expect-error nested object mutation is unavailable
 typed.nested.items[0]!.labels=[];
 const tuple:DeepReadonly<[{n:number},string]>=[{n:1},'x'];
 // @ts-expect-error tuples preserve readonly nested properties
 tuple[0].n=2;
 const views:Snapshot[]=[reactHost(stage),vueHost(stage).value,injectAgentStage(stage)(),adapter.getSnapshot()];
 views.forEach(view=>{
  // @ts-expect-error framework/adapter snapshots retain readonly nested contracts
  (view.state as typeof object).nested=null;
 });
 const transactions:(Transaction|null)[]=[reactTransaction(stage,tx.id),vueTransaction(stage,tx.id).value,injectTransaction(stage,tx.id)()];
 transactions.forEach(view=>{
  // @ts-expect-error framework transaction operation arrays are readonly
  view?.operations.push(operations[0]!);
 });
 const changes=[reactChange(stage,tx.id,null),vueChange(stage,tx.id,null).value,injectStageChange(stage,tx.id,null)()];
 changes.forEach(change=>{
  // @ts-expect-error all frameworks return readonly decisions
  if(change)change.decision='accepted';
 });
 const store=createStore(()=>({project:input,action:()=>42}));
 const zustand=createZustandAdapter(store,{select:s=>s.project,update:(_s,project)=>({project})});
 // @ts-expect-error Zustand snapshot data is readonly too
 (zustand.getSnapshot().state as typeof object).nested=null;
 return stage;
}
export async function checkResults(result:CommitResult,adapter:StateAdapter){
 if(result.status==='committed'){
  // @ts-expect-error commit snapshot revisions are readonly
  result.snapshot.revision='x';
  // @ts-expect-error commit snapshot arrays are deeply readonly
  (result.snapshot.state as Extract<ReadonlyJsonValue,readonly unknown[]>).push(null);
 }
 switch(result.status){case 'committed':case 'conflict':case 'failed':case 'indeterminate':break;default:{const exhaustive:never=result;void exhaustive;}}
 const r=await adapter.commit({expectedRevision:'0',operations:[]});
 if(r.status==='committed'){
  // @ts-expect-error adapter commit state has readonly nested arrays
  (r.snapshot.state as Extract<ReadonlyJsonValue,readonly unknown[]>)[0]=null;
 }
}
