// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import '@angular/compiler';
import { Component, createComponent, provideZonelessChangeDetection } from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { createApp, defineComponent, h, nextTick, shallowRef } from 'vue';
import { createAgentStage, createMemoryAdapter } from '../../src/index.js';
import { injectAgentStage, injectTransaction, injectStageChange } from '../../src/angular/index.js';
import { useAgentStage, useTransaction } from '../../src/vue/index.js';
function runtime(){const adapter=createMemoryAdapter({n:1});const stage=createAgentStage(adapter);const tx=stage.propose({base:stage.capture(),operations:[{op:'replace',path:'/n',value:2}]});return {adapter,stage,tx};}
it('updates an actual Vue component and cleans up on unmount/remount',async()=>{
 const {stage,tx}=runtime();const original=stage.subscribe;let active=0;
 vi.spyOn(stage,'subscribe').mockImplementation(fn=>{active++;const off=original(fn);return()=>{active--;off();};});
 const id=shallowRef<string|null>(null);const App=defineComponent({setup(){const host=useAgentStage(stage);const transaction=useTransaction(stage,id);return()=>h('div',JSON.stringify({host:host.value.state,status:transaction.value?.status}));}});
 const element=document.createElement('div');document.body.append(element);let app=createApp(App);app.mount(element);expect(active).toBe(1);
 id.value=tx.id;await nextTick();expect(element.textContent).toContain('open');stage.acceptChange(tx.id,tx.changes[0]!.id);await stage.commit(tx.id);await nextTick();expect(element.textContent).toContain('"n":2');
 app.unmount();expect(active).toBe(0);app=createApp(App);app.mount(element);expect(active).toBe(1);app.unmount();expect(active).toBe(0);stage.dispose();element.remove();
});
it('updates an actual Angular component and shares one subscription for its injection lifetime',async()=>{
 const {stage,tx}=runtime();const original=stage.subscribe;let active=0;
 vi.spyOn(stage,'subscribe').mockImplementation(fn=>{active++;const off=original(fn);return()=>{active--;off();};});
 class View{host=injectAgentStage(stage);transaction=injectTransaction(stage,tx.id);change=injectStageChange(stage,tx.id,tx.changes[0]!.id);}
 Component({standalone:true,selector:'audit-view',template:'<p>{{host().revision}} {{transaction()?.status}} {{change()?.decision}}</p>'})(View);
 const application=await createApplication({providers:[provideZonelessChangeDetection()]});const environment=application.injector;
 const element=document.createElement('audit-view');document.body.append(element);
 const component=createComponent(View,{hostElement:element,environmentInjector:environment});
 try{component.changeDetectorRef.detectChanges();expect(active).toBe(1);expect(element.textContent).toContain('pending');stage.acceptChange(tx.id,tx.changes[0]!.id);await stage.commit(tx.id);component.changeDetectorRef.detectChanges();expect(element.textContent).toContain('committed');}
 finally{component.destroy();application.destroy();element.remove();stage.dispose();}
 expect(active).toBe(0);
});
