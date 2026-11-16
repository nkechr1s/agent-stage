// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { act, Suspense, startTransition, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { createAgentStage, createMemoryAdapter } from '../../src/index.js';
import { useAgentStage } from '../../src/react/index.js';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('keeps host updates current across a suspended concurrent render',async()=>{
 const adapter=createMemoryAdapter({n:1});const stage=createAgentStage(adapter);let setMode!:(mode:boolean)=>void;let release!:()=>void;let ready=false;const gate=new Promise<void>(resolve=>{release=()=>{ready=true;resolve();};});
 function View(){const snapshot=useAgentStage(stage);const [mode,set]=useState(false);setMode=set;if(mode&&!ready)throw gate;return <p>{JSON.stringify(snapshot.state)}</p>;}
 const element=document.createElement('div');const root=createRoot(element);
 try{await act(async()=>root.render(<Suspense fallback="waiting"><View/></Suspense>));await act(async()=>startTransition(()=>setMode(true)));await act(async()=>{await adapter.commit({expectedRevision:'0',operations:[{op:'replace',path:'/n',value:2}]});release();await gate;});expect(element.textContent).toBe('{"n":2}');}finally{await act(async()=>root.unmount());stage.dispose();}
});
it('explicitly rejects server rendering without a server snapshot contract',()=>{const stage=createAgentStage(createMemoryAdapter({}));function View(){useAgentStage(stage);return null;}expect(()=>renderToString(<View/>)).toThrow();stage.dispose();});
