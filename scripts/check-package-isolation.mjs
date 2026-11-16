import ts from 'typescript';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('..', import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), 'agent-stage-exports-'));
const [pack] = JSON.parse(execFileSync('npm', ['pack', '--json', '--pack-destination', temporary, '--cache', join(temporary, 'cache')], { cwd: repository, encoding: 'utf8' }));
const examples = [
  { entry: '.', peers: [], allowed: [], code: `import {createAgentStage,createMemoryAdapter} from 'agent-stage';
const stage=createAgentStage(createMemoryAdapter({n:1}),{maxClosedTransactions:0,maxOpenTransactions:10,workload:{maxOperations:20,maxWorkUnits:250000}});
const tx=stage.propose({base:stage.capture(),operations:[]});
if((await stage.commit(tx.id)).status!=='committed') throw Error('core commit'); let pruned=false;try{stage.getTransaction(tx.id);}catch{pruned=true;}if(!pruned)throw Error('history');stage.dispose();` },
  { entry: './react', peers: ['react', '@types/react'], allowed: ['react'], code: `import {useAgentStage,useTransaction,useStageChange} from 'agent-stage/react';
if(![useAgentStage,useTransaction,useStageChange].every(fn=>typeof fn==='function')) throw Error('hooks');` },
  { entry: './zustand', peers: ['zustand'], allowed: ['zustand/vanilla'], code: `import {createZustandAdapter} from 'agent-stage/zustand'; import {createStore} from 'zustand/vanilla';
const store=createStore(()=>({data:{n:1},action:()=>42}));
const adapter=createZustandAdapter(store,{select:s=>s.data,update:(_s,data)=>({data})});
const result=await adapter.commit({expectedRevision:adapter.getSnapshot().revision,operations:[{op:'replace',path:'/n',value:2}]});
if(result.status!=='committed'||store.getState().action()!==42) throw Error('zustand');adapter.dispose();` },
  { entry: './vue', peers: ['vue'], allowed: ['vue'], code: `import {effectScope,shallowRef} from 'vue';
import {useAgentStage,useTransaction,useStageChange} from 'agent-stage/vue';
import {createAgentStage,createMemoryAdapter} from 'agent-stage';
const stage=createAgentStage(createMemoryAdapter({n:1})); const scope=effectScope();
scope.run(()=>{const host=useAgentStage(stage);const base=host.value;if(host.value!==base)throw Error('identity');
const tx=stage.propose({base,operations:[{op:'replace',path:'/n',value:2}]});
const view=useTransaction(stage,shallowRef(tx.id));const change=useStageChange(stage,tx.id,tx.changes[0]!.id);
stage.acceptChange(tx.id,tx.changes[0]!.id);if(change.value?.decision!=='accepted'||!view.value)throw Error('vue');});scope.stop();stage.dispose();` },
  { entry: './angular', peers: ['@angular/core'], allowed: ['@angular/core'], code: `import {Injector,runInInjectionContext,signal} from '@angular/core';
import {injectAgentStage,injectTransaction,injectStageChange} from 'agent-stage/angular';
import {createAgentStage,createMemoryAdapter} from 'agent-stage';
const stage=createAgentStage(createMemoryAdapter({n:1}));const injector=Injector.create({providers:[]});
runInInjectionContext(injector,()=>{const host=injectAgentStage(stage);const base=host();if(host()!==base)throw Error('identity');
const tx=stage.propose({base,operations:[{op:'replace',path:'/n',value:2}]});
const view=injectTransaction(stage,signal(tx.id));const change=injectStageChange(stage,tx.id,tx.changes[0]!.id);
stage.acceptChange(tx.id,tx.changes[0]!.id);if(change()?.decision!=='accepted'||!view())throw Error('angular');});injector.destroy();stage.dispose();` },
];
for (const example of examples) {
  const consumer = join(temporary, example.entry.replace('./', '') === '.' ? 'core' : example.entry.slice(2));
  const modules = join(consumer, 'node_modules'); mkdirSync(join(modules, 'agent-stage'), { recursive: true });
  execFileSync('tar', ['-xzf', join(temporary, pack.filename), '--strip-components=1', '-C', join(modules, 'agent-stage')]);
  if (process.argv.includes('--install')) {
    const dependencies = { 'agent-stage': 'file:' + join(temporary, pack.filename) };
    for (const peer of example.peers) dependencies[peer] = JSON.parse(readFileSync(join(repository, 'node_modules', peer, 'package.json'), 'utf8')).version;
    writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies }));
    execFileSync('npm', ['install', '--omit=dev', '--no-audit', '--fetch-retries=0', '--fetch-timeout=30000', '--cache', join(temporary, 'cache')], { cwd: consumer, stdio: 'inherit' });
  }
  for (const peer of process.argv.includes('--install') ? [] : example.peers) {
    const target = join(modules, peer); mkdirSync(dirname(target), { recursive: true });
    symlinkSync(join(repository, 'node_modules', peer), target, 'dir');
  }
  if (process.argv.includes('--install')) assert(!existsSync(join(modules, 'husky')), 'Package consumers must not install Husky');
  const packageRoot = join(modules, 'agent-stage');
  const metadata = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  const visited = new Set(); const stack = new Set();
  function inspect(path) {
    assert(!stack.has(path), `Circular import: ${path}`);
    if (visited.has(path)) return;
    visited.add(path); stack.add(path);
    const source = readFileSync(path, 'utf8');
    const syntax = ts.createSourceFile(path, source, ts.ScriptTarget.Latest);
    for (const statement of syntax.statements) {
      if (!(ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement))) continue;
      if (!statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const specifier = statement.moduleSpecifier.text;
      if (specifier.startsWith('.')) inspect(resolve(dirname(path), path.endsWith('.d.ts') ? specifier.replace(/\.js$/, '.d.ts') : specifier));
      else assert(example.allowed.includes(specifier), `Unexpected dependency from ${example.entry}: ${specifier}`);
    }
    stack.delete(path);
  }
  inspect(join(packageRoot, metadata.exports[example.entry].import));
  inspect(join(packageRoot, metadata.exports[example.entry].types));
  writeFileSync(join(consumer, 'package.json'), '{"type":"module"}');
  const typeChecks = `
function publicReadonlyChecks(snapshot: import('agent-stage').Snapshot, typed: import('agent-stage').DeepReadonly<{items:{name:string}[]}>) {
  // @ts-expect-error returned snapshot roots are readonly
  snapshot.state = null;
  // @ts-expect-error nested arrays and properties stay readonly
  typed.items[0]!.name = 'changed';
  // @ts-expect-error array mutation is forbidden
  typed.items.push({name:'changed'});
}
`;
  writeFileSync(join(consumer, 'consumer.ts'), example.code + typeChecks);
  execFileSync(join(repository, 'node_modules/.bin/tsc'), ['--strict', '--noUncheckedIndexedAccess', '--target', 'es2022', '--module', 'nodenext', 'consumer.ts'], { cwd: consumer, stdio: 'pipe' });
  execFileSync(join(repository, 'node_modules/.bin/tsc'), ['--strict', '--noEmit', '--target', 'es2022', '--module', 'esnext', '--moduleResolution', 'bundler', 'consumer.ts'], { cwd: consumer, stdio: 'pipe' });
  execFileSync(process.execPath, ['consumer.js'], { cwd: consumer, stdio: 'pipe' });
  console.log(`${example.entry}: isolated packed import, strict declarations, runtime and dependency graph passed`);
}
console.log(`Local verification artifacts: ${temporary}`);
