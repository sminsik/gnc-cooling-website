import {pbkdf2} from 'node:crypto';
import {adminPage} from './admin-pages.ts';
import {defaultStaffPath} from './access-policy.ts';
import {StaffError,localPasswordException,checkOrigin,cookie,cookieValue,hash,randomToken,staffJson,text,requirePermission,requestId,expectedVersion,claim,audit,executeMutation,SESSION_COOKIE} from './staff-session.ts';
import type {StaffEnv,StaffPrincipal} from './staff-session.ts';
export const PASSWORD_ISSUER='https://gnc.internal/password';
const START_COOKIE='gnc_staff_start',ITERATIONS=600000;
export function passwordConfigured(env:StaffEnv){
 try{const origin=new URL(env.APP_ORIGIN||'');return env.STAFF_AUTH_MODE==='password'&&(env.STAFF_DEV_SHORT_PASSWORD!=='true'||localPasswordException(env))&&origin.protocol==='https:'&&origin.origin===env.APP_ORIGIN&&(env.STAFF_AUTH_RATE_SECRET?.length||0)>=32;}catch{return false;}
}
export function staffIssuer(env:StaffEnv){return env.STAFF_AUTH_MODE==='password'?PASSWORD_ISSUER:env.OIDC_ISSUER;}
export async function passwordDigest(password:string,salt:string){
 return new Promise<string>((resolve,reject)=>pbkdf2(password,salt,ITERATIONS,32,'sha256',(error,result)=>error?reject(error):resolve(result.toString('hex'))));
}
function equal(a:string,b:string){let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
function passwordInput(input:Record<string,unknown>,setting=false,minimum=15){
 const value=text(input,'password',256,true);
 if(setting&&([...value].length<minimum||input.passwordConfirm!==value))throw new StaffError(400,`비밀번호는 ${minimum}자 이상으로 입력하고 확인란에도 같게 입력해주세요.`);
 return value;
}
function emailInput(input:Record<string,unknown>){const email=text(input,'email',254,true).trim();const at=email.lastIndexOf('@');return email.slice(0,at)+'@'+email.slice(at+1).toLowerCase();}
async function rate(env:StaffEnv,request:Request,purpose:string,email=''){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.STAFF_AUTH_RATE_SECRET!),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const now=Date.now(),window=Math.floor(now/900000);
 for(const [value,limit] of [[request.headers.get('CF-Connecting-IP')||'local',40],...(email?[[email,10]]:[])] as [string,number][]){
  const signed=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(purpose+'\n'+window+'\n'+value));const id=Array.from(new Uint8Array(signed)).map(n=>n.toString(16).padStart(2,'0')).join('');
  const row=await env.DB.prepare('INSERT INTO staff_auth_rates(key_hash,count,expires_at) VALUES(?,1,?) ON CONFLICT(key_hash) DO UPDATE SET count=count+1 RETURNING count').bind(id,now+86400000).first<{count:number}>();
  if(!row||row.count>limit)throw new StaffError(429,'시도가 많습니다. 잠시 후 다시 시도해주세요.');
 }
}
async function inputFor(request:Request,env:StaffEnv){
 if(!passwordConfigured(env))throw new StaffError(503,'직원 로그인 설정을 준비 중입니다.');
 if(request.method!=='POST')throw new StaffError(405,'허용되지 않는 요청입니다.');checkOrigin(request,env);
 if(Number(request.headers.get('Content-Length')||0)>8192)throw new StaffError(413,'입력 내용이 너무 깁니다.');
 const raw=await request.text();if(raw.length>8192)throw new StaffError(413,'입력 내용이 너무 깁니다.');
 let input:Record<string,unknown>;try{input=JSON.parse(raw);if(!input||Array.isArray(input)||typeof input!=='object')throw Error();}catch{throw new StaffError(400,'입력 내용을 확인해주세요.');}
 const seed=cookieValue(request,START_COOKIE);if(!seed||!/^[-\w]{43}$/.test(seed)||!equal(seed,String(input.startToken||'')))throw new StaffError(403,'로그인 화면을 새로 열고 다시 시도해주세요.');
 return input;
}
export function passwordPage(env:StaffEnv,setup=false){
 const configured=passwordConfigured(env),seed=randomToken();
 const field=(name:string,label:string,type:string,autocomplete:string)=>`<label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" autocomplete="${autocomplete}" maxlength="${type==='password'?256:254}" required>`;
 const body=configured?`<p>${setup?'받은 링크에서 본인 비밀번호를 설정해주세요. 비밀번호는 '+(localPasswordException(env)?4:15)+'자 이상입니다.':'홈페이지 전용 직원 계정으로 로그인해주세요.'}</p>${localPasswordException(env)?'<p>이 컴퓨터의 개발 시험에서는 4자 이상 비밀번호를 허용합니다.</p>':''}<form class="admin-form" data-api="/api/staff-auth/${setup?'password-set':'password-login'}"><input type="hidden" name="startToken" value="${seed}">${setup?'<input type="hidden" name="token" id="password-token"><input type="hidden" name="kind" id="password-kind">':field('email','이메일','email','username')}${field('password',setup?'새 비밀번호':'비밀번호','password',setup?'new-password':'current-password')}${setup?field('passwordConfirm','새 비밀번호 확인','password','new-password'):''}<button>${setup?'비밀번호 설정':'로그인'}</button><p class="form-result" role="status" aria-live="polite"></p></form><p>${setup?'<a href="/admin/login">로그인 화면으로</a>':'비밀번호를 잊었으면 책임자에게 재설정 링크를 요청해주세요.'}</p><noscript>이 기능에는 JavaScript가 필요합니다.</noscript>`:'<p>직원 로그인 설정을 준비 중입니다.</p>';
 const response=adminPage(setup?'직원 비밀번호 설정':'직원 로그인',body,null,configured?200:503);response.headers.append('Set-Cookie',cookie(START_COOKIE,seed,600));return response;
}
async function sessionStatements(env:StaffEnv,id:string,condition:string,values:unknown[],now:number){
 const token=randomToken(),csrf=randomToken(),sessionHash=await hash(token);
 return {token,csrf,statements:[env.DB.prepare(`INSERT INTO staff_sessions(token_hash,staff_id,csrf_hash,auth_version,created_at,last_seen_at,expires_at) SELECT ?,s.id,?,s.auth_version,?,?,? FROM staff s WHERE s.id=? AND s.status='active' AND (${condition})`).bind(sessionHash,await hash(csrf),now,now,now+28800000,id,...values),
 env.DB.prepare('UPDATE staff SET last_login_at=? WHERE id=? AND EXISTS(SELECT 1 FROM staff_sessions WHERE token_hash=?)').bind(now,id,sessionHash),
 env.DB.prepare("INSERT INTO staff_auth_events(id,staff_id,event,at) SELECT ?,?,'login',? WHERE EXISTS(SELECT 1 FROM staff_sessions WHERE token_hash=?)").bind(crypto.randomUUID(),id,now,sessionHash)]};
}
async function sessionResponse(env:StaffEnv,id:string,session:{token:string;csrf:string}){
 const roles=(await env.DB.prepare('SELECT role FROM staff_roles WHERE staff_id=?').bind(id).all<{role:'admin'|'content_manager'|'inquiry_manager'}>()).results.map(r=>r.role);
 const response=staffJson({redirect:defaultStaffPath({status:'active',roles})});response.headers.append('Set-Cookie',cookie(SESSION_COOKIE,session.token+'.'+session.csrf,28800));response.headers.append('Set-Cookie',cookie(START_COOKIE,'',0));return response;
}
export async function passwordLogin(request:Request,env:StaffEnv){
 const input=await inputFor(request,env),email=emailInput(input);await rate(env,request,'login',email);const password=passwordInput(input);
 const row=await env.DB.prepare("SELECT s.id,s.auth_version,p.salt,p.digest,p.version FROM staff s JOIN staff_passwords p ON p.staff_id=s.id WHERE s.email=? AND s.status='active' AND s.provider_issuer=? AND (p.local_only=0 OR ?=1)").bind(email,PASSWORD_ISSUER,localPasswordException(env)?1:0).first<{id:string;auth_version:number;salt:string;digest:string;version:number}>();
 const digest=await passwordDigest(password,row?.salt||'unknown-account-salt-not-secret');
 if(!row||!equal(digest,row.digest))throw new StaffError(401,'이메일 또는 비밀번호를 확인해주세요.');
 const now=Date.now(),session=await sessionStatements(env,row.id,'s.auth_version=? AND EXISTS(SELECT 1 FROM staff_passwords p WHERE p.staff_id=s.id AND p.version=? AND p.digest=? AND (p.local_only=0 OR ?=1))',[row.auth_version,row.version,row.digest,localPasswordException(env)?1:0],now);
 const result=await env.DB.batch(session.statements);if(result[0].meta.changes!==1)throw new StaffError(401,'이메일 또는 비밀번호를 확인해주세요.');return sessionResponse(env,row.id,session);
}
export async function setPassword(request:Request,env:StaffEnv){
 const input=await inputFor(request,env);await rate(env,request,'set');const token=text(input,'token',43,true);if(!/^[-\w]{43}$/.test(token)||!['invitation','reset'].includes(String(input.kind)))throw new StaffError(400,'유효한 초대·재설정 링크가 필요합니다.');
 const reset=input.kind==='reset',table=reset?'staff_password_resets':'staff_invitations',now=Date.now(),tokenHash=await hash(token);
 const row=await env.DB.prepare(`SELECT t.id,t.staff_id,s.auth_version FROM ${table} t JOIN staff s ON s.id=t.staff_id WHERE t.token_hash=? AND t.expires_at>? AND t.used_at IS NULL AND t.revoked_at IS NULL AND s.provider_issuer=? AND ${reset?"s.status='active' AND t.auth_version=s.auth_version AND EXISTS(SELECT 1 FROM staff_passwords WHERE staff_id=s.id)":"s.status='invited' AND NOT EXISTS(SELECT 1 FROM staff_passwords WHERE staff_id=s.id)"}`).bind(tokenHash,now,PASSWORD_ISSUER).first<{id:string;staff_id:string;auth_version:number}>();
 if(!row)throw new StaffError(400,'링크가 만료되었거나 이미 사용되었습니다. 책임자에게 다시 요청해주세요.');
 const password=passwordInput(input,true,localPasswordException(env)?4:15),salt=randomToken(),digest=await passwordDigest(password,salt),marker=crypto.randomUUID();
 const gate=`EXISTS(SELECT 1 FROM ${table} WHERE id=? AND consumed_by=?)`,values=[row.id,marker];
 const session=await sessionStatements(env,row.staff_id,gate,values,now);
 const statements=[env.DB.prepare(`UPDATE ${table} SET used_at=?,consumed_by=? WHERE id=? AND expires_at>? AND used_at IS NULL AND revoked_at IS NULL AND EXISTS(SELECT 1 FROM staff s WHERE s.id=staff_id AND s.auth_version=? AND s.provider_issuer=? AND s.status=? ${reset?'':'AND NOT EXISTS(SELECT 1 FROM staff_passwords WHERE staff_id=s.id)'})`).bind(now,marker,row.id,now,row.auth_version,PASSWORD_ISSUER,reset?'active':'invited'),
 env.DB.prepare(`INSERT INTO staff_passwords(staff_id,salt,digest,iterations,changed_at,local_only) SELECT ?,?,?,?,?,? WHERE ${gate} ON CONFLICT(staff_id) DO UPDATE SET salt=excluded.salt,digest=excluded.digest,iterations=excluded.iterations,changed_at=excluded.changed_at,version=staff_passwords.version+1,local_only=excluded.local_only`).bind(row.staff_id,salt,digest,ITERATIONS,now,[...password].length<15?1:0,...values),
 env.DB.prepare(`UPDATE staff SET status='active',provider_subject=id,auth_version=auth_version+1,version=version+1 WHERE id=? AND ${gate}`).bind(row.staff_id,...values),
 env.DB.prepare(`UPDATE staff_sessions SET revoked_at=? WHERE staff_id=? AND ${gate}`).bind(now,row.staff_id,...values),
 env.DB.prepare(`UPDATE staff_invitations SET revoked_at=? WHERE staff_id=? AND used_at IS NULL AND ${gate}`).bind(now,row.staff_id,...values),
 env.DB.prepare(`UPDATE staff_password_resets SET revoked_at=? WHERE staff_id=? AND used_at IS NULL AND ${gate}`).bind(now,row.staff_id,...values),...session.statements];
 const result=await env.DB.batch(statements);if(result[0].meta.changes!==1)throw new StaffError(409,'링크 또는 계정 상태가 변경되었습니다. 다시 확인해주세요.');return sessionResponse(env,row.staff_id,session);
}
export async function issuePasswordReset(env:StaffEnv,actor:StaffPrincipal,id:string,input:Record<string,unknown>){
 requirePermission(actor,'staff');if(!passwordConfigured(env))throw new StaffError(503,'비밀번호 인증 설정을 확인해주세요.');
 if(input.confirmed!==true)throw new StaffError(400,'직원의 본인 확인 후 발급해주세요.');
 const operation=requestId(input),reason=text(input,'reason',1000,true),now=Date.now(),token=randomToken(),expiresAt=now+3600000;
 const gate='EXISTS(SELECT 1 FROM operation_claims WHERE id=?)';
 await executeMutation(env.DB,[claim(env.DB,actor,'staff',operation,'staff',id,"EXISTS(SELECT 1 FROM staff s JOIN staff_passwords p ON p.staff_id=s.id WHERE s.id=? AND s.version=? AND s.status='active' AND s.provider_issuer=?)",[id,expectedVersion(input),PASSWORD_ISSUER]),
 env.DB.prepare(`UPDATE staff_password_resets SET revoked_at=? WHERE staff_id=? AND used_at IS NULL AND ${gate}`).bind(now,id,operation),
 env.DB.prepare(`INSERT INTO staff_password_resets(id,staff_id,token_hash,auth_version,expires_at) SELECT ?,s.id,?,s.auth_version,? FROM staff s WHERE s.id=? AND ${gate}`).bind(crypto.randomUUID(),await hash(token),expiresAt,id,operation),
 env.DB.prepare(`UPDATE staff SET version=version+1 WHERE id=? AND ${gate}`).bind(id,operation),audit(env.DB,operation,'password-reset-issue',reason)]);
 return {resetUrl:env.APP_ORIGIN+'/admin/password#reset='+token,expiresAt};
}
