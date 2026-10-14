// Read-only local readiness report. Never print account addresses, keys, tokens or object keys.
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {authConfigured} from '../src/staff-auth.ts';
import {passwordConfigured} from '../src/password-auth.ts';
export async function checkMvpC(root,environment=''){
 const items=[];let config={};
 try{const raw=await readFile(resolve(root,environment?'.dev.vars.'+environment:'.dev.vars'),'utf8');config=Object.fromEntries(raw.split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const at=l.indexOf('=');return [l.slice(0,at),l.slice(at+1).trim().replace(/^(['"])(.*)\1$/,'$2')]}));}catch{}
 const password=config.STAFF_AUTH_MODE==='password';
 const missing=(password?['APP_ORIGIN','STAFF_AUTH_RATE_SECRET']:['APP_ORIGIN','OIDC_ISSUER','OIDC_CLIENT_ID','OIDC_CLIENT_SECRET','STAFF_AUTH_RATE_SECRET']).filter(k=>!config[k]);
 items.push({id:'staff-auth',label:'직원 로그인 설정',state:missing.length?'missing':(password?passwordConfigured(config):authConfigured(config))?'configured':'invalid',missing});
 let wrangler;
 try{const raw=await readFile(resolve(root,'wrangler.jsonc'),'utf8');const uncommented=raw.replace(/"(?:\\.|[^"\\])*"|\/\/[^\r\n]*|\/\*[\s\S]*?\*\//g,token=>token.startsWith('"')?token:token.replace(/[^\r\n]/g,' '));wrangler=JSON.parse(uncommented.replace(/"(?:\\.|[^"\\])*"|,\s*(?=[}\]])/g,token=>token.startsWith('"')?token:token.slice(1)));}catch{}
 if(environment&&wrangler)wrangler=wrangler.env?.[environment];
 const scanner=Array.isArray(wrangler?.services)&&wrangler.services.some(s=>s.binding==='FILE_SCANNER'&&typeof s.service==='string'&&s.service.trim());
 items.push({id:'scanner-binding',label:'파일 검사 서비스 연결 설정',state:wrangler?(scanner?'declared':'missing'):'invalid'});
 const dir=resolve(root,'.wrangler/state/v3/d1/miniflare-D1DatabaseObject');const candidates=[];
 try{for(const name of await readdir(dir)){if(!/^[a-f0-9]+\.sqlite$/.test(name))continue;const db=new DatabaseSync(resolve(dir,name),{readOnly:true});try{if(db.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE name IN('staff','staff_roles','staff_bootstrap','file_jobs')").get().n===4)candidates.push(name);}finally{db.close();}}}catch{}
 if(candidates.length!==1)items.push({id:'initial-admin',label:'최초 책임 관리자',state:'database-unavailable'});
 else{const db=new DatabaseSync(resolve(dir,candidates[0]),{readOnly:true});try{
  const count=db.prepare("SELECT COUNT(DISTINCT s.id) n FROM staff s JOIN staff_roles r ON r.staff_id=s.id WHERE s.status='active' AND r.role='admin'").get().n;
  const invited=db.prepare("SELECT COUNT(DISTINCT s.id) n FROM staff s JOIN staff_roles r ON r.staff_id=s.id WHERE s.status='invited' AND r.role='admin'").get().n;
  items.push({id:'initial-admin',label:'최초 책임 관리자',state:count?'active':invited?'invited':'missing',activeCount:count});
  items.push({id:'file-jobs',label:'파일 검사 작업',state:'read-only',pending:db.prepare('SELECT COUNT(*) n FROM file_jobs WHERE completed_at IS NULL').get().n});
 }finally{db.close();}}
 return {scope:'MVP C 연결 준비 점검',readOnly:true,items,notice:'설정·로컬 상태 확인만 수행했습니다. 실제 로그인·안전 파일 검사·회사 업무 검수 성공을 뜻하지 않습니다.'};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(await checkMvpC(fileURLToPath(new URL('../',import.meta.url)),process.argv.includes('--password-local')?'c-local':''),null,2));}catch{console.log(JSON.stringify({error:'연결 준비 상태를 확인하지 못했습니다.',readOnly:true}));process.exitCode=1;}
}
