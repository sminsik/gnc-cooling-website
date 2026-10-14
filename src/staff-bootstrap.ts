// Offline initial registration only. Never expose this module through an HTTP route.
import {hash,randomToken,StaffError,text} from './staff-session.ts';
import type {StaffEnv} from './staff-session.ts';
import {staffIssuer,PASSWORD_ISSUER} from './password-auth.ts';
export interface InitialAdminPlan {id:string;invitationUrl:string;expiresAt:number;statements:{sql:string;values:unknown[]}[]}
export async function initialAdminPlan(input:Record<string,unknown>,now=Date.now()):Promise<InitialAdminPlan>{
 const name=text(input,'name',100,true),email=text(input,'email',254,true).trim(),issuer=text(input,'issuer',500,true),origin=text(input,'origin',500,true);
 if(input.accountConfirmed!==true)throw new StaffError(400,'회사에서 확인한 개인 책임 관리자 계정이어야 합니다.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new StaffError(400,'책임 관리자 이메일을 확인해주세요.');
 let provider,site;try{provider=new URL(issuer);site=new URL(origin);}catch{throw new StaffError(400,'인증 서비스와 사이트 주소를 확인해주세요.');}
 if(provider.protocol!=='https:'||provider.username||provider.password||provider.hash||provider.search||site.protocol!=='https:'||site.origin!==origin)throw new StaffError(400,'확정한 HTTPS 인증 서비스와 사이트 주소를 입력해주세요.');
 const at=email.lastIndexOf('@'),normalized=email.slice(0,at)+'@'+email.slice(at+1).toLowerCase(),id=crypto.randomUUID(),token=randomToken(),expiresAt=now+172800000;
 const gate='EXISTS(SELECT 1 FROM staff WHERE id=?)';
 const statements=[
 {sql:"INSERT INTO staff(id,name,email,provider_issuer,status,created_at) SELECT ?,?,?,?,'invited',? WHERE NOT EXISTS(SELECT 1 FROM staff) AND NOT EXISTS(SELECT 1 FROM staff_bootstrap)",values:[id,name,normalized,issuer,now]},
 {sql:`INSERT INTO staff_roles(staff_id,role) SELECT ?,'admin' WHERE ${gate}`,values:[id,id]},
 {sql:`INSERT INTO staff_invitations(id,staff_id,token_hash,expires_at) SELECT ?,?,?,? WHERE ${gate}`,values:[crypto.randomUUID(),id,await hash(token),expiresAt,id]},
 {sql:`INSERT INTO staff_bootstrap(id,staff_id,created_at) SELECT 'initial',?,? WHERE ${gate}`,values:[id,now,id]},
 {sql:`INSERT INTO staff_auth_events(id,staff_id,event,at) SELECT ?,?,'bootstrap',? WHERE ${gate}`,values:[crypto.randomUUID(),id,now,id]},
 ];return {id,invitationUrl:origin+(issuer===PASSWORD_ISSUER?'/admin/password':'/admin/login')+'#invitation='+token,expiresAt,statements};
}
export async function applyInitialAdmin(env:StaffEnv,plan:InitialAdminPlan){
 if(staffIssuer(env)!==plan.statements[0].values[3]||env.APP_ORIGIN!==new URL(plan.invitationUrl).origin)throw new StaffError(409,'현재 인증 설정과 초기 등록 정보가 다릅니다.');
 const result=await env.DB.batch(plan.statements.map(s=>env.DB.prepare(s.sql).bind(...s.values)));
 if(result[0].meta.changes!==1)throw new StaffError(409,'최초 책임 관리자 등록은 한 번만 가능합니다. 기존 계정을 확인해주세요.');
 return {id:plan.id,invitationUrl:plan.invitationUrl,expiresAt:plan.expiresAt};
}
export async function reissueInitialAdmin(env:StaffEnv,input:Record<string,unknown>,now=Date.now()){
 if(input.accountConfirmed!==true)throw new StaffError(400,'회사에서 확인한 책임 관리자 계정이어야 합니다.');
 const email=text(input,'email',254,true).trim(),at=email.lastIndexOf('@'),normalized=email.slice(0,at)+'@'+email.slice(at+1).toLowerCase();
 const current=await env.DB.prepare("SELECT s.id,s.version FROM staff_bootstrap b JOIN staff s ON s.id=b.staff_id WHERE b.id='initial' AND s.email=? AND s.provider_issuer=? AND s.status='invited' AND s.provider_subject IS NULL AND EXISTS(SELECT 1 FROM staff_roles WHERE staff_id=s.id AND role='admin')").bind(normalized,staffIssuer(env)).first<{id:string;version:number}>();
 if(!current||!env.APP_ORIGIN)throw new StaffError(409,'수락 전 최초 책임 관리자 초대만 다시 발급할 수 있습니다.');
 const operation=crypto.randomUUID(),token=randomToken(),expiresAt=now+172800000;
 const result=await env.DB.batch([
  env.DB.prepare(`INSERT INTO operation_claims(id,request_id,actor_id,target_type,target_id,created_at) SELECT ?,?,s.id,'staff',s.id,? FROM staff s JOIN staff_bootstrap b ON b.staff_id=s.id WHERE b.id='initial' AND s.id=? AND s.version=? AND s.email=? AND s.provider_issuer=? AND s.status='invited' AND s.provider_subject IS NULL AND EXISTS(SELECT 1 FROM staff_roles WHERE staff_id=s.id AND role='admin') AND NOT EXISTS(SELECT 1 FROM staff a JOIN staff_roles r ON r.staff_id=a.id WHERE a.status='active' AND r.role='admin')`).bind(operation,operation,now,current.id,current.version,normalized,staffIssuer(env)),
  env.DB.prepare('UPDATE staff_invitations SET revoked_at=? WHERE staff_id=? AND used_at IS NULL AND EXISTS(SELECT 1 FROM operation_claims WHERE id=?)').bind(now,current.id,operation),
  env.DB.prepare('UPDATE staff SET version=version+1 WHERE id=? AND EXISTS(SELECT 1 FROM operation_claims WHERE id=?)').bind(current.id,operation),
  env.DB.prepare('INSERT INTO staff_invitations(id,staff_id,token_hash,expires_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM operation_claims WHERE id=?)').bind(crypto.randomUUID(),current.id,await hash(token),expiresAt,operation),
  env.DB.prepare("INSERT INTO staff_auth_events(id,staff_id,event,at) SELECT ?,?,'reinvite',? WHERE EXISTS(SELECT 1 FROM operation_claims WHERE id=?)").bind(crypto.randomUUID(),current.id,now,operation),
 ]);
 if(result[0].meta.changes!==1)throw new StaffError(409,'현재 초기 계정 상태가 변경되었습니다. 다시 확인해주세요.');
 return {id:current.id,invitationUrl:env.APP_ORIGIN+(env.STAFF_AUTH_MODE==='password'?'/admin/password':'/admin/login')+'#invitation='+token,expiresAt};
}
