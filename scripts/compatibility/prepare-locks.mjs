// Manual dependency maintenance only: review generated manifests/locks, then run consumers.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const specs=['vue','vue32','react18','react19','angular17','angular18','angular19','angular20','angular21'];
function latest(spec){const values=JSON.parse(execFileSync('npm',['view',spec,'version','--json'],{encoding:'utf8'}));return Array.isArray(values)?values.at(-1):values;}
for(const name of specs){
 const dir=new URL(`./${name}/`,import.meta.url);mkdirSync(dir,{recursive:true});
 const dependencies={playwright:'1.56.1'};
 if(name.startsWith('angular')){
  const major=Number(name.slice(7));const version=major===17?'17.3.12':latest(`@angular/core@${major}`);
  for(const part of ['core','common','compiler','platform-browser','compiler-cli'])dependencies[`@angular/${part}`]=version;
  dependencies['@angular/cli']=latest(`@angular/cli@${major}`);dependencies['@angular-devkit/build-angular']=latest(`@angular-devkit/build-angular@${major}`);
  dependencies.typescript=major===17?'5.4.5':major===18?'5.5.4':major===19?'5.8.3':'5.9.3';
  dependencies['zone.js']=major===17?'0.14.10':major===18?'0.14.10':major===19?'0.15.1':major===20?'0.15.1':'0.16.0';dependencies.rxjs='7.8.2';if(major<=18)dependencies['@types/node']='20.11.30';
 }else{
  dependencies.vite='7.3.8';dependencies.typescript='5.9.3';
  if(name.startsWith('react')){dependencies.react=name==='react18'?'18.3.1':'19.3.1';dependencies['react-dom']=dependencies.react;dependencies['@types/react']='18.3.31';dependencies['@types/react-dom']='18.3.7';dependencies.zustand='5.1.0';}
  else{dependencies.vue=name==='vue32'?'3.2.47':'3.5.45';dependencies['@vitejs/plugin-vue']='6.0.2';}
 }
 writeFileSync(new URL('package.json',dir),JSON.stringify({name:`agent-stage-consumer-${name}`,private:true,type:'module',dependencies,...(['angular17','angular18'].includes(name)?{overrides:{'@types/node':'20.11.30'}}:{})},null,2)+'\n');
 execFileSync('npm',['install','--package-lock-only','--ignore-scripts','--no-audit','--fetch-retries=0','--fetch-timeout=30000'],{cwd:dir,stdio:'inherit'});
 console.log('Locked',name);
}
