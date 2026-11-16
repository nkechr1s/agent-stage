import {mkdtempSync,writeFileSync,mkdirSync,readFileSync,existsSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {pathToFileURL} from 'node:url';
const root=mkdtempSync(join(tmpdir(),'agent-stage-apps-'));const repo=process.cwd();
const [pack]=JSON.parse(execFileSync('npm',['pack','--json','--pack-destination',root],{encoding:'utf8'}));
const results=[];
let browserInstalled=false;
for(const framework of (process.argv.slice(2).length ? process.argv.slice(2) : ['vue','vue32','react18','react19','angular17','angular21'])){
 const dir=join(root,framework);mkdirSync(dir);const write=(name,data)=>writeFileSync(join(dir,name),typeof data==='string'?data:JSON.stringify(data,null,2));
 const react=framework.startsWith('react');const angular=framework.startsWith('angular');
 const fixture=join(repo,'scripts/compatibility',framework);
 if(!existsSync(join(fixture,'package-lock.json')))throw Error(`Missing committed consumer lockfile for ${framework}`);
 copyFileSync(join(fixture,'package.json'),join(dir,'package.json'));
 copyFileSync(join(fixture,'package-lock.json'),join(dir,'package-lock.json'));
 console.log('Installing locked consumer',framework,dir);
 execFileSync('npm',['ci','--ignore-scripts','--no-audit','--fetch-retries=0','--fetch-timeout=30000'],{cwd:dir,stdio:'inherit'});
 mkdirSync(join(dir,'node_modules/agent-stage'));
 execFileSync('tar',['-xzf',join(root,pack.filename),'--strip-components=1','-C',join(dir,'node_modules/agent-stage')]);
 if(!browserInstalled){
  execFileSync(join(dir,'node_modules/.bin/playwright'),['install',...(process.env.CI?['--with-deps']:[]),'chromium'],{cwd:dir,stdio:'inherit'});
  browserInstalled=true;
 }
 const entry=react?'react':angular?'angular':'vue';
 const symbol=angular?'injectAgentStage':'useAgentStage';
 write('declarations.ts',`import {${symbol}} from 'agent-stage/${entry}';import type {Snapshot,DeepReadonly} from 'agent-stage';const binding=${symbol};void binding;function readonlyCheck(s:Snapshot,v:DeepReadonly<{items:{n:number}[]}>){
// @ts-expect-error snapshot is readonly
s.state=null;
// @ts-expect-error nested values are readonly
v.items[0]!.n=2;}`);
 for(const [module,resolution] of [['nodenext','nodenext'],['esnext','bundler']])execFileSync(join(dir,'node_modules/.bin/tsc'),['--noEmit','--strict','--target','es2022','--module',module,'--moduleResolution',resolution,'declarations.ts'],{cwd:dir,stdio:'inherit'});
 write('index.html','<!doctype html><html><head><meta charset="UTF-8"><base href="/"></head><body><audit-app></audit-app>'+(angular?'':'<script type="module" src="/main.ts"></script>')+'</body></html>');
 const hostModel=react?`import {createZustandAdapter} from 'agent-stage/zustand';import {createStore} from 'zustand/vanilla';const store=createStore(()=>({data:{n:1},action:()=>42}));const adapter=createZustandAdapter(store,{select:s=>s.data,update:(_s,data)=>({data})});(globalThis as unknown as {auditAction:()=>number}).auditAction=()=>store.getState().action();const runtime=createAgentStage(adapter);`:`const runtime=createAgentStage(createMemoryAdapter({n:1}));`;
 const model=`import {createAgentStage,createMemoryAdapter} from 'agent-stage';let active=0;${hostModel}const subscribe=runtime.subscribe;export const stage={...runtime,subscribe:(listener:()=>void)=>{active++;const off=subscribe(listener);return()=>{active--;off()}}};(globalThis as unknown as {auditActive:()=>number}).auditActive=()=>active;export const tx=stage.propose({base:stage.capture(),operations:[{op:'replace',path:'/n',value:2}]});`;
 write('model.ts',model);
 if(angular){
 write('tsconfig.json',{compilerOptions:{target:'ES2022',module:'ES2022',moduleResolution:'bundler',experimentalDecorators:true,strict:true,skipLibCheck:true,lib:['ES2022','DOM']},angularCompilerOptions:{strictTemplates:true},files:['main.ts']});
 write('angular.json',{version:1,projects:{audit:{projectType:'application',root:'',architect:{build:{builder:'@angular-devkit/build-angular:browser-esbuild',options:{outputPath:'dist',index:'index.html',main:'main.ts',tsConfig:'tsconfig.json',polyfills:['zone.js'],aot:true,optimization:true,assets:[],styles:[]}}}}}});
 write('main.ts',`import {Component} from '@angular/core';import {bootstrapApplication} from '@angular/platform-browser';import {injectAgentStage,injectTransaction} from 'agent-stage/angular';import {stage,tx} from './model';@Component({standalone:true,selector:'audit-app',template:'<p id="host">{{host().state | json}}</p><p>{{view()?.status}}</p><button (click)="accept()">Accept</button><button (click)="commit()">Commit</button>',imports:[JsonPipe]})class App {host=injectAgentStage(stage);view=injectTransaction(stage,tx.id);accept(){stage.acceptChange(tx.id,tx.changes[0]!.id)}commit(){void stage.commit(tx.id)}}import {JsonPipe} from '@angular/common';bootstrapApplication(App).then(app=>(globalThis as unknown as {auditUnmount:()=>void}).auditUnmount=()=>app.destroy()).catch(console.error);`);
 execFileSync(join(dir,'node_modules/.bin/ng'),['build','--no-progress'],{cwd:dir,stdio:'inherit',env:{...process.env,NG_CLI_ANALYTICS:'false'}});
 }else if(react){
 write('main.ts',`import React,{StrictMode} from 'react';import {createRoot} from 'react-dom/client';import {useAgentStage,useTransaction} from 'agent-stage/react';import {stage,tx} from './model';function App(){const host=useAgentStage(stage);const view=useTransaction(stage,tx.id);return React.createElement('div',null,React.createElement('p',{id:'host'},JSON.stringify(host.state)),React.createElement('p',null,view?.status),React.createElement('button',{onClick:()=>stage.acceptChange(tx.id,tx.changes[0].id)},'Accept'),React.createElement('button',{onClick:()=>stage.commit(tx.id)},'Commit'))}const root=createRoot(document.querySelector('audit-app')!);root.render(React.createElement(StrictMode,null,React.createElement(App)));(globalThis as unknown as {auditUnmount:()=>void}).auditUnmount=()=>root.unmount();`);
 execFileSync(join(dir,'node_modules/.bin/vite'),['build'],{cwd:dir,stdio:'inherit'});
 }else{
 write('vite.config.mjs',`import {defineConfig} from 'vite';import vue from '@vitejs/plugin-vue';export default defineConfig({plugins:[vue()]});`);
 write('main.ts',`import {createApp} from 'vue';import App from './App.vue';const app=createApp(App);app.mount('audit-app');(globalThis as unknown as {auditUnmount:()=>void}).auditUnmount=()=>app.unmount();`);
 write('App.vue',`<script setup lang="ts">import {useAgentStage,useTransaction} from 'agent-stage/vue';import {stage,tx} from './model';const host=useAgentStage(stage);const view=useTransaction(stage,tx.id);function accept(){stage.acceptChange(tx.id,tx.changes[0]!.id)}function commit(){void stage.commit(tx.id)}</script><template><p id="host">{{host.state}}</p><p>{{view?.status}}</p><button @click="accept">Accept</button><button @click="commit">Commit</button></template>`);
 execFileSync(join(dir,'node_modules/.bin/vite'),['build'],{cwd:dir,stdio:'inherit'});
 }
 const output=join(dir,'dist');const server=createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const file=join(output,pathname==='/'?'index.html':pathname);try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(readFileSync(file));}catch{res.statusCode=404;res.end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const {chromium}=await import(pathToFileURL(join(dir,'node_modules/playwright/index.mjs')).href);const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';let browser;
 try{browser=await chromium.launch(existsSync(chrome)?{headless:true,executablePath:chrome}:{headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByRole('button',{name:'Accept',exact:true}).click();await page.getByRole('button',{name:'Commit',exact:true}).click();await page.locator('body').filter({hasText:'committed'}).waitFor();const text=await page.locator('#host').innerText();if(!text.includes('2')||errors.length)throw Error(JSON.stringify({text,errors}));if(react && await page.evaluate(()=>globalThis.auditAction())!==42)throw Error('Zustand action was lost');await page.evaluate(()=>globalThis.auditUnmount());await page.waitForFunction(()=>globalThis.auditActive()===0);results.push({framework,declarations:'passed',build:'passed',browser:'passed',cleanup:'passed'});}
 finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
 console.log('Passed build and browser lifecycle:',framework);
}
const file=process.env.FRAMEWORK_RESULTS || join(repo,'benchmarks/framework-results.json');
writeFileSync(file,JSON.stringify({directory:root,node:process.version,results},null,2)+'\n');
