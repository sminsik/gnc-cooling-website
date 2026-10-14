// Read-only CLI allowlist; no login, deployment, creation, SQL or migration commands.
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {stripVTControlCharacters} from 'node:util';
const root=resolve(import.meta.dirname,'..');
const candidates={d1:'gnc-cooling-development',r2:'gnc-cooling-development-files'};
function command(args,account){
 const result=spawnSync(process.execPath,[resolve(root,'node_modules/wrangler/bin/wrangler.js'),...args],{
  cwd:root,encoding:'utf8',timeout:30000,env:{...process.env,WRANGLER_SEND_METRICS:'false',...(account?{CLOUDFLARE_ACCOUNT_ID:account}:{})}});
 let data;
 for(const output of [result.stdout,result.stderr]){try{data=JSON.parse(output);break;}catch{}}
 const output=stripVTControlCharacters(result.stdout||'');
 // Wrangler 4.149's R2 list has labelled text, not a --json option.
 const bucketNames=[...output.matchAll(/^name:\s+([a-z0-9][a-z0-9-]{1,61}[a-z0-9])\s*$/gm)].map(m=>m[1]);
 const listBody=output.includes('Listing buckets...')?output.slice(output.indexOf('Listing buckets...')+'Listing buckets...'.length).trim():undefined;
 const recordCount=[...output.matchAll(/^creation_date:/gm)].length;
 const labelledBuckets=listBody!==undefined&&(listBody===''||(bucketNames.length>0&&recordCount===bucketNames.length))?bucketNames.map(name=>({name})):undefined;
 const combined=(result.stdout||'')+(result.stderr||'');
 const apiCodes=[...combined.matchAll(/\[code: (\d+)\]/g)].map(m=>m[1]);
 return {ok:result.status===0,data,labelledBuckets,apiCodes,
  r2EnableRequired:apiCodes.includes('10042')&&/enable R2/i.test(combined),
  loggedOut:/"loggedIn"\s*:\s*false/.test(combined)};
}
const auth=command(['whoami','--json']);
const report={checkedAt:new Date().toISOString(),readOnly:true,authenticated:auth.data?.loggedIn===true,
 accountCount:auth.data?.accounts?.length??null,accountSelection:'unconfirmed',
 existingD1:'unconfirmed',existingR2:'unconfirmed',plan:'unconfirmed',r2Subscription:'unconfirmed',r2Readiness:'unconfirmed'};
if(auth.loggedOut){report.authenticated=false;report.reason='Browser login required; no resource queries were attempted.';}
else if(!auth.ok||!auth.data?.loggedIn){report.authenticated=null;report.reason='Account query failed; raw output suppressed.';}
else{
 const accounts=auth.data.accounts||[],requested=process.env.CLOUDFLARE_ACCOUNT_ID;
 const selected=requested?accounts.find(a=>a.id===requested):accounts.length===1?accounts[0]:undefined;
 if(selected){
  report.accountSelection='confirmed';report.accountName=String(selected.name||'').replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[email redacted]');
  const d1=command(['d1','list','--json'],selected.id);
  const r2=command(['r2','bucket','list'],selected.id);
  const databases=Array.isArray(d1.data)?d1.data:d1.data?.result;
  const buckets=Array.isArray(r2.data)?r2.data:r2.data?.buckets??r2.labelledBuckets;
  if(d1.ok&&Array.isArray(databases))report.existingD1={total:databases.length,developmentCandidatePresent:databases.some(d=>d.name===candidates.d1),names:databases.map(d=>d.name)};
  if(r2.ok&&Array.isArray(buckets))report.existingR2={total:buckets.length,developmentCandidatePresent:buckets.some(b=>b.name===candidates.r2),names:buckets.map(b=>b.name)};
  if(r2.ok)report.r2Readiness='Bucket listing available; billing details unconfirmed.';
  else{
   report.r2QueryErrorCodes=r2.apiCodes;
   if(r2.r2EnableRequired)report.r2Readiness='API requires R2 enablement in dashboard; existing buckets and billing remain unconfirmed.';
  }
 }else report.reason='Select an authenticated account explicitly; resource queries were not attempted.';
}
console.log(JSON.stringify(report,null,2));
