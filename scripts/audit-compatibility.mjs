import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
const root=process.argv.includes('--root');
const reports=[];const errors=[];
const names=root?['root']:readdirSync('scripts/compatibility',{withFileTypes:true}).filter(item=>item.isDirectory()).map(item=>item.name);
mkdirSync('artifacts',{recursive:true});
for(const name of names){
 const result=spawnSync('npm',['audit','--json',...(root?[]:['--prefix',`scripts/compatibility/${name}`])],{encoding:'utf8',timeout:120000,maxBuffer:16*1024*1024});
 let audit;
 try{
  audit=JSON.parse(result.stdout);
  if(audit.error||!audit.metadata)throw Error(`Audit could not run for ${name}: ${JSON.stringify(audit.error)}`);
  if(['critical','high','moderate','low','info'].some(level=>!Number.isSafeInteger(audit.metadata.vulnerabilities?.[level])||audit.metadata.vulnerabilities[level]<0))throw Error(`Invalid audit counts for ${name}`);
  if(!audit.vulnerabilities||typeof audit.vulnerabilities!=='object'||Array.isArray(audit.vulnerabilities))throw Error(`Invalid vulnerability report for ${name}`);
  if(result.error||![0,1].includes(result.status))throw Error(`Audit process failed for ${name}: ${result.error?.message||result.status}`);
 }catch(error){
  errors.push(name);
  reports.push({consumer:name,...(audit?{audit}:{}),error:String(error),stdout:result.stdout,stderr:result.stderr});
  console.error(`Audit failed for ${name}: ${error}`);
  continue;
 }
 reports.push({consumer:name,audit});console.log(name,JSON.stringify(audit.metadata.vulnerabilities));
}
writeFileSync(`artifacts/${root?'root':'compatibility'}-audit.json`,JSON.stringify(reports,null,2)+'\n');
const blocked=reports.filter(report=>report.audit?.metadata?.vulnerabilities?.critical>0||report.audit?.metadata?.vulnerabilities?.high>0||Object.values(report.audit?.vulnerabilities||{}).some(item=>item?.severity==='high'||item?.severity==='critical'));
if(errors.length)throw Error(`Invalid audits: ${errors.join(', ')}`);
if(blocked.length)throw Error(`High/Critical compatibility dependencies in: ${blocked.map(report=>report.consumer).join(', ')}`);
