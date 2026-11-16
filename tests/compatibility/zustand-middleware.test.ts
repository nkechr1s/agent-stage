import { expect, it } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';
import { createZustandAdapter } from '../../src/adapters/zustand.js';
it('works with synchronous subscribeWithSelector middleware and preserves actions',async()=>{
 const store=createStore(subscribeWithSelector(()=>({project:{n:1},action:()=>42})));
 const adapter=createZustandAdapter(store,{select:s=>s.project,update:(_s,project)=>({project})});
 const values:number[]=[];const off=store.subscribe(s=>s.project.n,n=>values.push(n));
 const result=await adapter.commit({expectedRevision:adapter.getSnapshot().revision,operations:[{op:'replace',path:'/n',value:2}]});
 expect(result.status).toBe('committed');expect(values).toEqual([2]);expect(store.getState().action()).toBe(42);off();adapter.dispose();
});
it('preserves a subsequent reentrant host update after publishing an adapter commit',async()=>{
 const store=createStore(()=>({project:{n:1}}));const adapter=createZustandAdapter(store,{select:s=>s.project,update:(_s,project)=>({project})});
 const off=store.subscribe(state=>{if(state.project.n===2)store.setState({project:{n:3}});});
 const result=await adapter.commit({expectedRevision:adapter.getSnapshot().revision,operations:[{op:'replace',path:'/n',value:2}]});
 expect(result.status).toBe('committed');expect(adapter.getSnapshot().state).toEqual({n:3});
 if(result.status==='committed')expect(adapter.getSnapshot().revision).not.toBe(result.snapshot.revision);
 off();adapter.dispose();
});
