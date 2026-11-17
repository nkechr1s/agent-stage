import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
const reports=[];
for(const name of readdirSync('scripts/compatibility',{withFileTypes:true}).filter(item=>item.isDirectory()).map(item=>item.name)){
 const result=spawnSync('npm',['audit','--json','--prefix',`scripts/compatibility/${name}`],{encoding:'utf8'});
 let audit;try{audit=JSON.parse(result.stdout);}catch{throw Error(`Audit transport failed for ${name}: ${result.stderr}`);}
 if(audit.error||!audit.metadata)throw Error(`Audit could not run for ${name}: ${JSON.stringify(audit.error)}`);
 if(['critical','high','moderate','low','info'].some(level=>!Number.isSafeInteger(audit.metadata.vulnerabilities?.[level])||audit.metadata.vulnerabilities[level]<0))throw Error(`Invalid audit counts for ${name}`);
 reports.push({consumer:name,audit});console.log(name,JSON.stringify(audit.metadata.vulnerabilities));
}
mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/compatibility-audit.json',JSON.stringify(reports,null,2)+'\n');
const blocked=reports.filter(report=>report.audit.metadata.vulnerabilities.critical>0||report.audit.metadata.vulnerabilities.high>0);
if(blocked.length)throw Error(`High/Critical compatibility dependencies in: ${blocked.map(report=>report.consumer).join(', ')}`);
