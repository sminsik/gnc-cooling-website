import { canAccess } from './access-policy.ts';
import type { StaffAccess, StaffRole, Permission } from './access-policy.ts';
export interface StaffEnv {
 DB: D1Database; APP_ORIGIN?: string; OIDC_ISSUER?: string; OIDC_CLIENT_ID?: string; OIDC_CLIENT_SECRET?: string; STAFF_AUTH_RATE_SECRET?: string; STAFF_AUTH_MODE?: string; STAFF_DEV_SHORT_PASSWORD?:string; STAFF_PENDING_CONTENT_NAME?:string; STAFF_PENDING_CONTENT_EMAIL?:string;
}
export interface StaffPrincipal extends StaffAccess {
 id:string; name:string; email:string; version:number; auth_version:number;
 session_hash:string; csrf:string; session_auth_version:number;
}
export class StaffError extends Error {
 status:number;
 constructor(status:number,message:string){super(message);this.status=status;}
}
export const SESSION_COOKIE='gnc_staff_session';
export const FLOW_COOKIE='gnc_staff_flow';
export function randomToken():string {
 return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export async function hash(value:string):Promise<string>{
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(n=>n.toString(16).padStart(2,'0')).join('');
}
export function cookieValue(request:Request,name:string):string|null {
 const values=(request.headers.get('Cookie')||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(name+'='));
 if(values.length!==1)return null;return values[0].slice(name.length+1);
}
export function cookie(name:string,value:string,maxAge:number):string {
 return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
export function staffJson(data:unknown,status=200):Response {
 return Response.json(data,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
}
export function checkOrigin(request:Request,env:StaffEnv):void {
 if(!env.APP_ORIGIN || request.headers.get('Origin')!==env.APP_ORIGIN || new URL(request.url).origin!==env.APP_ORIGIN)
  throw new StaffError(403,'이 요청은 허용되지 않습니다.');
}
export function localPasswordException(env:StaffEnv):boolean {
 try {const origin=new URL(env.APP_ORIGIN||'');return env.STAFF_DEV_SHORT_PASSWORD==='true'&&origin.protocol==='https:'&&['localhost','127.0.0.1'].includes(origin.hostname)&&origin.origin===env.APP_ORIGIN;}catch{return false;}
}
export async function resolveStaff(request:Request,env:StaffEnv,now=Date.now()):Promise<StaffPrincipal|null>{
 const value=cookieValue(request,SESSION_COOKIE);
 if(!value||!/^[-\w]{43}\.[-\w]{43}$/.test(value))return null;
 if(!env.APP_ORIGIN||new URL(request.url).origin!==env.APP_ORIGIN)return null;
 const [token,csrf]=value.split('.'),tokenHash=await hash(token);
 const row=await env.DB.prepare(`SELECT s.id,s.name,s.email,s.status,s.version,s.auth_version,
 x.auth_version AS session_auth_version,x.csrf_hash FROM staff_sessions x JOIN staff s ON s.id=x.staff_id
 WHERE x.token_hash=? AND x.revoked_at IS NULL AND x.expires_at>? AND x.last_seen_at>? AND s.status='active' AND s.auth_version=x.auth_version`).bind(tokenHash,now,now-30*60*1000).first<StaffPrincipal & {csrf_hash:string}>();
 if(!row||row.csrf_hash!==await hash(csrf))return null;
 if(env.STAFF_AUTH_MODE==='password'&&!localPasswordException(env)){
  const credential=await env.DB.prepare('SELECT local_only FROM staff_passwords WHERE staff_id=?').bind(row.id).first<{local_only:number}>();
  if(!credential||credential.local_only)return null;
 }
 const roles=(await env.DB.prepare('SELECT role FROM staff_roles WHERE staff_id=? ORDER BY role').bind(row.id).all<{role:StaffRole}>()).results.map(r=>r.role);
 await env.DB.prepare('UPDATE staff_sessions SET last_seen_at=? WHERE token_hash=? AND revoked_at IS NULL').bind(now,tokenHash).run();
 return {...row,roles,session_hash:tokenHash,csrf};
}
export async function mutationInput(request:Request,env:StaffEnv,staff:StaffPrincipal):Promise<Record<string,unknown>> {
 checkOrigin(request,env);
 const size=Number(request.headers.get('Content-Length')||0);if(size>128000)throw new StaffError(413,'입력 내용이 너무 깁니다.');
 const raw=await request.text();if(raw.length>64000)throw new StaffError(413,'입력 내용이 너무 깁니다.');
 let input:Record<string,unknown>;
 try {
  if(request.headers.get('Content-Type')?.includes('application/json'))input=JSON.parse(raw);
  else if(request.headers.get('Content-Type')?.includes('application/x-www-form-urlencoded'))input=Object.fromEntries(new URLSearchParams(raw));
  else throw new Error();
 }catch{throw new StaffError(400,'입력 형식을 확인해주세요.');}
 if(!input||Array.isArray(input)||typeof input!=='object')throw new StaffError(400,'입력 형식을 확인해주세요.');
 if((request.headers.get('X-CSRF-Token')||input.csrf)!==staff.csrf)throw new StaffError(403,'화면을 새로 열고 다시 시도해주세요.');
 return input;
}
function snapshot(type:string,target:string):string {
 const table:Record<string,string>={products:'products',projects:'projects',resources:'resources',notices:'notices',models:'product_models',categories:'product_categories',staff:'staff',files:'files',inquiries:'inquiries'};
 const name=table[type];if(!name)return 'NULL';
 const fields=type==='inquiries'?"'version',item.version,'status',item.status,'classification',item.classification,'authVersion',item.auth_version,'verified',item.verified_at IS NOT NULL,'assigneeId',item.assignee_id,'deletedAt',item.deleted_at":type==='files'?"'version',item.version,'status',item.status,'deletedAt',item.deleted_at":type==='staff'?"'version',item.version,'status',item.status,'roles',(SELECT json_group_array(role) FROM staff_roles WHERE staff_id=item.id)":type==='categories'?"'version',item.version,'active',item.active,'parentId',item.parent_id":"'version',item.version,'publicationStatus',item.publication_status,'deletedAt',item.deleted_at";
 return `(SELECT json_object(${fields}) FROM ${name} item WHERE item.id=${target})`;
}
// All writes include current session, account state and role in the same DB batch.
export function claim(db:D1Database,staff:StaffPrincipal,permission:Permission,id:string,type:string,target:string,condition='1',values:unknown[]=[],now=Date.now()):D1PreparedStatement {
 const role=permission==='content'?'content_manager':permission==='inquiries'?'inquiry_manager':'admin';
 return db.prepare(`INSERT INTO operation_claims(id,request_id,actor_id,target_type,target_id,created_at,before_json)
 SELECT ?,?,s.id,?,?,?,${snapshot(type,'?')} FROM staff s JOIN staff_sessions x ON x.staff_id=s.id
 WHERE s.id=? AND s.status='active' AND s.auth_version=x.auth_version
 AND x.token_hash=? AND x.revoked_at IS NULL AND x.expires_at>? AND x.last_seen_at>?
 AND EXISTS(SELECT 1 FROM staff_roles r WHERE r.staff_id=s.id AND r.role IN(?, 'admin')) AND (${condition})`)
 .bind(id,id.slice(0,id.lastIndexOf('.')),type,target,now,target,staff.id,staff.session_hash,now,now-30*60*1000,role,...values);
}
export function audit(db:D1Database,id:string,action:string,reason=''):D1PreparedStatement {
 const after=['products','projects','resources','notices','models','categories','staff','inquiries'].map(type=>`WHEN '${type}' THEN ${snapshot(type,'o.target_id')}`).join(' ');
 return db.prepare(`INSERT INTO audit_logs(id,operation_id,actor_id,target_type,target_id,action,at,reason,before_json,after_json)
 SELECT ?,o.id,o.actor_id,o.target_type,o.target_id,?,o.created_at,?,o.before_json,CASE o.target_type ${after} ELSE NULL END FROM operation_claims o WHERE o.id=?`).bind(crypto.randomUUID(),action,reason,id);
}
export async function executeMutation(db:D1Database,statements:D1PreparedStatement[]):Promise<void> {
 try {
  const result=await db.batch(statements);
  if(result[0].meta.changes!==1)throw new StaffError(409,'다른 직원의 변경 또는 권한 변경이 있습니다. 최신 내용을 확인해주세요.');
 }catch(error){if(error instanceof StaffError)throw error;throw new StaffError(409,'저장하지 못했습니다. 최신 내용을 확인하고 다시 시도해주세요.');}
}
export function requirePermission(staff:StaffPrincipal,permission:Permission):void {
 if(!canAccess(staff,permission))throw new StaffError(403,'이 업무를 처리할 권한이 없습니다.');
}
export function text(input:Record<string,unknown>,key:string,max:number,required=false):string {
 const value=input[key];if(value!==undefined&&typeof value!=='string')throw new StaffError(400,'입력 항목을 확인해주세요.');
 const str=(value as string|undefined)||'';
 if(str.length>max||(required&&!str.trim()))throw new StaffError(400,`${key} 항목을 확인해주세요.`);return str;
}
export function expectedVersion(input:Record<string,unknown>):number {
 const version=Number(input.expectedVersion);if(!Number.isSafeInteger(version)||version<1)throw new StaffError(400,'변경 버전을 확인해주세요.');return version;
}
export function requestId(input:Record<string,unknown>):string {
 const id=text(input,'requestId',80,true);if(!/^[a-zA-Z0-9_-]{16,80}$/.test(id))throw new StaffError(400,'저장 요청을 다시 준비해주세요.');return id+'.'+crypto.randomUUID();
}
