import { StaffError, requirePermission, text, expectedVersion, requestId, claim, audit, executeMutation, hash, randomToken } from './staff-session.ts';
import type { StaffEnv, StaffPrincipal } from './staff-session.ts';
import type { StaffRole } from './access-policy.ts';
import {staffIssuer,passwordConfigured} from './password-auth.ts';
export function roleConfig(input:Record<string,unknown>):StaffRole[] {
 if(!Array.isArray(input.roles)||input.roles.length<1||input.roles.length>3||input.roles.some(r=>!['content_manager','inquiry_manager','admin'].includes(r)))throw new StaffError(400,'직원에게 부여할 역할을 선택해주세요.');
 return [...new Set(input.roles)] as StaffRole[];
}
export async function staffList(db:D1Database) {
 const rows=(await db.prepare('SELECT id,name,email,status,version FROM staff ORDER BY name,id').all<{id:string;name:string;email:string;status:string;version:number}>()).results;
 return Promise.all(rows.map(async row=>({...row,roles:(await db.prepare('SELECT role FROM staff_roles WHERE staff_id=? ORDER BY role').bind(row.id).all<{role:StaffRole}>()).results.map(r=>r.role)})));
}
export async function inviteStaff(env:StaffEnv,actor:StaffPrincipal,input:Record<string,unknown>) {
 requirePermission(actor,'staff');if(!staffIssuer(env)||!env.APP_ORIGIN||(env.STAFF_AUTH_MODE==='password'&&!passwordConfigured(env)))throw new StaffError(503,'로그인 서비스 설정을 먼저 완료해주세요.');
 const name=text(input,'name',100,true),email=text(input,'email',254,true).trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new StaffError(400,'이메일 주소를 확인해주세요.');
 const at=email.lastIndexOf('@'),normalized=email.slice(0,at)+'@'+email.slice(at+1).toLowerCase();
 const roles=roleConfig(input),operation=requestId(input),id=crypto.randomUUID(),invitationId=crypto.randomUUID(),token=randomToken(),now=Date.now();
 const statements=[claim(env.DB,actor,'staff',operation,'staff',id),
 env.DB.prepare(`INSERT INTO staff(id,name,email,provider_issuer,status,created_at) SELECT ?,?,?,?,'invited',? WHERE EXISTS(SELECT 1 FROM operation_claims WHERE id=?)`).bind(id,name,normalized,staffIssuer(env),now,operation),
 env.DB.prepare(`INSERT INTO staff_invitations(id,staff_id,token_hash,expires_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM operation_claims WHERE id=?)`).bind(invitationId,id,await hash(token),now+48*3600000,operation)];
 for(const role of roles)statements.push(env.DB.prepare('INSERT INTO staff_roles(staff_id,role) SELECT ?,? WHERE EXISTS(SELECT 1 FROM operation_claims WHERE id=?)').bind(id,role,operation));
 statements.push(audit(env.DB,operation,'invite'));await executeMutation(env.DB,statements);
 return {id,invitationUrl:env.APP_ORIGIN+(env.STAFF_AUTH_MODE==='password'?'/admin/password':'/admin/login')+'#invitation='+token,expiresAt:now+48*3600000};
}
export async function changeStaff(env:StaffEnv,actor:StaffPrincipal,id:string,action:string,input:Record<string,unknown>) {
 requirePermission(actor,'staff');const operation=requestId(input),reason=text(input,'reason',1000,true),version=expectedVersion(input);
 const roles=action==='roles'?roleConfig(input):[];
 const removesAdmin=action==='suspend'||(action==='roles'&&!roles.includes('admin'));
 const condition=`EXISTS(SELECT 1 FROM staff target WHERE target.id=? AND target.version=? ${action==='activate'?"AND target.provider_subject IS NOT NULL":''}
 AND (?=0 OR target.status<>'active' OR NOT EXISTS(SELECT 1 FROM staff_roles WHERE staff_id=target.id AND role='admin') OR (SELECT COUNT(*) FROM staff current JOIN staff_roles r ON r.staff_id=current.id WHERE current.status='active' AND r.role='admin')>1))`;
 const statements=[claim(env.DB,actor,'staff',operation,'staff',id,condition,[id,version,removesAdmin?1:0])];
 if(action==='roles') {
  statements.push(env.DB.prepare('DELETE FROM staff_roles WHERE staff_id=? AND EXISTS(SELECT 1 FROM operation_claims WHERE id=?)').bind(id,operation));
  for(const role of roles)statements.push(env.DB.prepare('INSERT INTO staff_roles(staff_id,role) SELECT ?,? WHERE EXISTS(SELECT 1 FROM operation_claims WHERE id=?)').bind(id,role,operation));
  statements.push(env.DB.prepare('UPDATE staff SET version=version+1 WHERE id=? AND EXISTS(SELECT 1 FROM operation_claims WHERE id=?)').bind(id,operation));
 }else {
  statements.push(env.DB.prepare(`UPDATE staff SET status=?,auth_version=auth_version+1,version=version+1 WHERE id=? AND EXISTS(SELECT 1 FROM operation_claims WHERE id=?)`).bind(action==='activate'?'active':'suspended',id,operation));
  if(action==='suspend')statements.push(env.DB.prepare('UPDATE staff_invitations SET revoked_at=? WHERE staff_id=? AND used_at IS NULL AND EXISTS(SELECT 1 FROM operation_claims WHERE id=?)').bind(Date.now(),id,operation));
 }
 statements.push(audit(env.DB,operation,action,reason));await executeMutation(env.DB,statements);
}
export async function renewStaffInvitation(env:StaffEnv,actor:StaffPrincipal,id:string,input:Record<string,unknown>){
 requirePermission(actor,'staff');if(!env.APP_ORIGIN||!staffIssuer(env))throw new StaffError(503,'인증 설정을 먼저 확인해주세요.');
 const operation=requestId(input),token=randomToken(),now=Date.now(),reason=text(input,'reason',1000,true),expiresAt=now+172800000;
 await executeMutation(env.DB,[claim(env.DB,actor,'staff',operation,'staff',id,"EXISTS(SELECT 1 FROM staff WHERE id=? AND version=? AND status='invited' AND provider_subject IS NULL AND provider_issuer=?)",[id,expectedVersion(input),staffIssuer(env)]),
 env.DB.prepare('UPDATE staff_invitations SET revoked_at=? WHERE staff_id=? AND used_at IS NULL AND EXISTS(SELECT 1 FROM operation_claims WHERE id=?)').bind(now,id,operation),
 env.DB.prepare('UPDATE staff SET version=version+1 WHERE id=? AND EXISTS(SELECT 1 FROM operation_claims WHERE id=?)').bind(id,operation),
 env.DB.prepare('INSERT INTO staff_invitations(id,staff_id,token_hash,expires_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM operation_claims WHERE id=?)').bind(crypto.randomUUID(),id,await hash(token),expiresAt,operation),audit(env.DB,operation,'reinvite',reason)]);
 return {id,invitationUrl:env.APP_ORIGIN+(env.STAFF_AUTH_MODE==='password'?'/admin/password':'/admin/login')+'#invitation='+token,expiresAt};
}
