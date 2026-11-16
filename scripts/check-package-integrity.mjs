import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const root=mkdtempSync(join(tmpdir(),'agent-stage-integrity-'));
const pack=()=>JSON.parse(execFileSync('npm',['pack','--json','--pack-destination',root,'--cache',join(root,'cache')],{encoding:'utf8'}))[0];
mkdirSync('dist',{recursive:true});writeFileSync('dist/__stale-audit-marker.js','throw Error("stale build");');
const first=pack();assert(!existsSync('dist/__stale-audit-marker.js'),'Build must remove stale generated outputs');const firstBytes=readFileSync(join(root,first.filename));const second=pack();
assert.deepEqual(firstBytes,readFileSync(join(root,second.filename)),'Repeated package builds must be byte-identical');
const files=new Set(second.files.map(file=>file.path));
for(const name of ['package.json','README.md','CONTRIBUTING.md','LICENSE','dist/index.js','dist/index.d.ts','dist/react/index.js','dist/adapters/zustand.js','dist/vue/index.js','dist/angular/index.js'])assert(files.has(name),`Missing ${name}`);
for(const path of files)assert(/^(dist\/|src\/|docs\/|benchmarks\/[^/]+\.json$|README\.md$|CONTRIBUTING\.md$|LICENSE$|PRODUCTION-READINESS\.md$|package\.json$)/.test(path),`Unexpected package file: ${path}`);
for(const path of files)assert(!/(^|\/)(node_modules|\.husky|\.git|\.github|tests|scripts)(\/|$)|(^|\/)\.env(\.|$)|(^|\/)\.npmrc$|\.(pem|key)$/.test(path),`Forbidden package content: ${path}`);
const unpack=join(root,'unpacked');mkdirSync(unpack);execFileSync('tar',['-xzf',join(root,second.filename),'-C',unpack]);
const metadata=JSON.parse(readFileSync(join(unpack,'package/package.json'),'utf8'));
assert.equal(metadata.license,'MIT');assert.equal(Object.keys(metadata.dependencies||{}).length,0);assert.equal(Object.keys(metadata.exports).length,5);
for(const peer of Object.keys(metadata.peerDependencies))assert.equal(metadata.peerDependenciesMeta[peer].optional,true);
for(const entry of Object.values(metadata.exports)){assert(files.has(entry.import.slice(2)));assert(files.has(entry.types.slice(2)));}
const lock=JSON.parse(readFileSync('package-lock.json','utf8')).packages[''];
for(const field of ['version','license','engines','dependencies','devDependencies','peerDependencies','peerDependenciesMeta'])assert.deepEqual(metadata[field],lock[field],`Root lock metadata mismatch: ${field}`);
const sha256=createHash('sha256').update(firstBytes).digest('hex');console.log(JSON.stringify({version:metadata.version,files:files.size,bytes:firstBytes.length,sha256,reproducible:true,root},null,2));
// No hooks, tests, credentials, lockfiles or tooling can pass the package allowlist.
