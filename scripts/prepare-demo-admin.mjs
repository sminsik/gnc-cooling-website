// Operator-only invitation, scoped to the isolated synthetic environment. Never sets passwords.
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),work=resolve(root,'.local-https');
const credentials=JSON.parse(await readFile(resolve(work,'demo-credentials.json'),'utf8'));
if(credentials.developmentOnly!==true||credentials.origin!=='https://localhost:8788'||!credentials.admin.name.startsWith('[가상]')||!credentials.admin.email.endsWith('@gnc.example.test'))throw Error('Only the synthetic localhost account is accepted.');
const dir=resolve(work,'state/v3/d1/miniflare-D1DatabaseObject');
const candidates=(await readdir(dir)).filter(name=>/^[a-f0-9]+\.sqlite$/.test(name));
if(candidates.length!==1)throw Error('Exactly one isolated D1 database is required.');
const db=new DatabaseSync(resolve(dir,candidates[0]),{readOnly:true});let staff;
try{staff=db.prepare('SELECT email,status FROM staff').all();}finally{db.close();}
if(staff.some(row=>!row.email.endsWith('@gnc.example.test')))throw Error('Existing non-synthetic staff must be preserved; this environment cannot be used for this demo.');
const current=staff.find(row=>row.email===credentials.admin.email);
if(current?.status==='active'){console.log('Synthetic administrator is already active. Existing account was preserved.');process.exit(0);}
const output=resolve(work,'initial-admin-invitation.json');
if(current){await access(output);console.log('Existing synthetic invitation was preserved.');process.exit(0);}
if(staff.length)throw Error('Existing staff were preserved; initial registration is unavailable.');
execFileSync(process.execPath,[resolve(root,'scripts/initial-admin-local.mjs'),'--create','--password-local','--virtual-local','--persist-to',resolve(work,'state'),'--private-output',output],
 {cwd:root,input:JSON.stringify({name:credentials.admin.name,email:credentials.admin.email,accountConfirmed:true}),stdio:['pipe','inherit','inherit']});
