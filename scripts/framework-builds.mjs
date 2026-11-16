import {mkdtempSync,writeFileSync,mkdirSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {pathToFileURL} from 'node:url';
const root=mkdtempSync(join(tmpdir(),'agent-stage-apps-'));const repo=process.cwd();
const [pack]=JSON.parse(execFileSync('npm',['pack','--json','--pack-destination',root],{encoding:'utf8'}));
const results=[];
for(const framework of (process.argv.slice(2).length ? process.argv.slice(2) : ['vue','vue32','react18','react19','angular17','angular21'])){
 const dir=join(root,framework);mkdirSync(dir);const write=(name,data)=>writeFileSync(join(dir,name),typeof data==='string'?data:JSON.stringify(data,null,2));
 const react=framework.startsWith('react');const angular=framework.startsWith('angular');const major=framework.slice(7);const version=major==='17'?'17.3.12':'21.2.26';
 const dependencies=angular?{'@angular/core':version,'@angular/common':version,'@angular/compiler':version,'@angular/platform-browser':version,'@angular/compiler-cli':version,'@angular/cli':major,'@angular-devkit/build-angular':major,typescript:major==='17'?'5.4.5':'5.9.3','zone.js':major==='17'?'~0.14.0':'~0.16.0',rxjs:'^7.8.2'}:react?{react:framework==='react18'?'18.3.1':'19.3.1','react-dom':framework==='react18'?'18.3.1':'19.3.1',vite:'7',typescript:'5.9.3'}:{vue:framework==='vue32'?'3.2.47':'3.5.45',vite:'7','@vitejs/plugin-vue':'6',typescript:'5.9.3'};
 write('package.json',{name:'audit-consumer',private:true,type:'module',dependencies:{...dependencies,'agent-stage':'file:'+join(root,pack.filename),playwright:'^1.56.0'}});
 console.log('Installing',framework,dir);execFileSync('npm',['install','--ignore-scripts','--no-audit','--fetch-retries=0','--fetch-timeout=30000'],{cwd:dir,stdio:'inherit'});
 write('index.html','<!doctype html><html><head><meta charset="UTF-8"><base href="/"></head><body><audit-app></audit-app>'+(angular?'':'<script type="module" src="/main.ts"></script>')+'</body></html>');
 const model=`import {createAgentStage,createMemoryAdapter} from 'agent-stage';export const stage=createAgentStage(createMemoryAdapter({n:1}));export const tx=stage.propose({base:stage.capture(),operations:[{op:'replace',path:'/n',value:2}]});`;
 write('model.ts',model);
 if(angular){
 write('tsconfig.json',{compilerOptions:{target:'ES2022',module:'ES2022',moduleResolution:'bundler',experimentalDecorators:true,strict:true,skipLibCheck:true,lib:['ES2022','DOM']},angularCompilerOptions:{strictTemplates:true},files:['main.ts']});
 write('angular.json',{version:1,projects:{audit:{projectType:'application',root:'',architect:{build:{builder:'@angular-devkit/build-angular:browser-esbuild',options:{outputPath:'dist',index:'index.html',main:'main.ts',tsConfig:'tsconfig.json',polyfills:['zone.js'],aot:true,optimization:true,assets:[],styles:[]}}}}}});
 write('main.ts',`import {Component} from '@angular/core';import {bootstrapApplication} from '@angular/platform-browser';import {injectAgentStage,injectTransaction} from 'agent-stage/angular';import {stage,tx} from './model';@Component({standalone:true,selector:'audit-app',template:'<p id="host">{{host().state | json}}</p><p>{{view()?.status}}</p><button (click)="accept()">Accept</button><button (click)="commit()">Commit</button>',imports:[JsonPipe]})class App {host=injectAgentStage(stage);view=injectTransaction(stage,tx.id);accept(){stage.acceptChange(tx.id,tx.changes[0]!.id)}commit(){void stage.commit(tx.id)}}import {JsonPipe} from '@angular/common';bootstrapApplication(App).catch(console.error);`);
 execFileSync(join(dir,'node_modules/.bin/ng'),['build','--no-progress'],{cwd:dir,stdio:'inherit',env:{...process.env,NG_CLI_ANALYTICS:'false'}});
 }else if(react){
 write('main.ts',`import React,{StrictMode} from 'react';import {createRoot} from 'react-dom/client';import {useAgentStage,useTransaction} from 'agent-stage/react';import {stage,tx} from './model';function App(){const host=useAgentStage(stage);const view=useTransaction(stage,tx.id);return React.createElement('div',null,React.createElement('p',{id:'host'},JSON.stringify(host.state)),React.createElement('p',null,view?.status),React.createElement('button',{onClick:()=>stage.acceptChange(tx.id,tx.changes[0].id)},'Accept'),React.createElement('button',{onClick:()=>stage.commit(tx.id)},'Commit'))}createRoot(document.querySelector('audit-app')!).render(React.createElement(StrictMode,null,React.createElement(App)));`);
 execFileSync(join(dir,'node_modules/.bin/vite'),['build'],{cwd:dir,stdio:'inherit'});
 }else{
 write('vite.config.mjs',`import {defineConfig} from 'vite';import vue from '@vitejs/plugin-vue';export default defineConfig({plugins:[vue()]});`);
 write('main.ts',`import {createApp} from 'vue';import App from './App.vue';createApp(App).mount('audit-app');`);
 write('App.vue',`<script setup lang="ts">import {useAgentStage,useTransaction} from 'agent-stage/vue';import {stage,tx} from './model';const host=useAgentStage(stage);const view=useTransaction(stage,tx.id);function accept(){stage.acceptChange(tx.id,tx.changes[0]!.id)}function commit(){void stage.commit(tx.id)}</script><template><p id="host">{{host.state}}</p><p>{{view?.status}}</p><button @click="accept">Accept</button><button @click="commit">Commit</button></template>`);
 execFileSync(join(dir,'node_modules/.bin/vite'),['build'],{cwd:dir,stdio:'inherit'});
 }
 const output=join(dir,'dist');const server=createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const file=join(output,pathname==='/'?'index.html':pathname);try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(readFileSync(file));}catch{res.statusCode=404;res.end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const {chromium}=await import(pathToFileURL(join(dir,'node_modules/playwright/index.mjs')).href);const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';let browser;
 try{browser=await chromium.launch(existsSync(chrome)?{headless:true,executablePath:chrome}:{headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByRole('button',{name:'Accept',exact:true}).click();await page.getByRole('button',{name:'Commit',exact:true}).click();await page.waitForFunction(()=>document.body.textContent.includes('committed'));const text=await page.locator('#host').innerText();if(!text.includes('2')||errors.length)throw Error(JSON.stringify({text,errors}));results.push({framework,build:'passed',browser:'passed'});}
 finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
 console.log('Passed build and browser lifecycle:',framework);
}
const file=join(repo,'benchmarks/framework-results.json');const prior=existsSync(file)?JSON.parse(readFileSync(file,'utf8')).results:[];
writeFileSync(file,JSON.stringify({directory:root,results:[...prior.filter(p=>!results.some(r=>r.framework===p.framework)),...results]},null,2)+'\n');
