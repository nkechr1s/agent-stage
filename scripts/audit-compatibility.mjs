import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
const reports=[];
for(const name of readdirSync('scripts/compatibility',{withFileTypes:true}).filter(item=>item.isDirectory()).map(item=>item.name)){
 const result=spawnSync('npm',['audit','--json','--prefix',`scripts/compatibility/${name}`],{encoding:'utf8'});
 let audit;try{audit=JSON.parse(result.stdout);}catch{throw Error(`Audit transport failed for ${name}: ${result.stderr}`);}
 if(audit.error||!audit.metadata)throw Error(`Audit could not run for ${name}: ${JSON.stringify(audit.error)}`);
 reports.push({consumer:name,audit});console.log(name,JSON.stringify(audit.metadata.vulnerabilities));
}
mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/compatibility-audit.json',JSON.stringify(reports,null,2)+'\n');
// Historical/minimum versions are intentionally vulnerable compatibility fixtures.
// Report them for review, do not silently upgrade or suppress the root audit gate.
