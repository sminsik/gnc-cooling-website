import { createRemoteJWKSet, jwtVerify } from 'jose';
import { FLOW_COOKIE, SESSION_COOKIE, StaffError, checkOrigin, cookie, cookieValue, hash, randomToken, staffJson } from './staff-session.ts';
import type { StaffEnv } from './staff-session.ts';
import { staffReturnPath } from './access-policy.ts';
import type { StaffRole } from './access-policy.ts';
interface Discovery { issuer:string; authorization_endpoint:string; token_endpoint:string; jwks_uri:string;token_endpoint_auth_methods_supported?:string[] }
function configured(env:StaffEnv):env is StaffEnv & {APP_ORIGIN:string;OIDC_ISSUER:string;OIDC_CLIENT_ID:string;OIDC_CLIENT_SECRET:string} {
 if(!env.APP_ORIGIN||!env.OIDC_ISSUER||!env.OIDC_CLIENT_ID||!env.OIDC_CLIENT_SECRET||!env.STAFF_AUTH_RATE_SECRET||env.STAFF_AUTH_RATE_SECRET.length<32)return false;
 try{const origin=new URL(env.APP_ORIGIN),issuer=new URL(env.OIDC_ISSUER);return origin.protocol==='https:'&&origin.origin===env.APP_ORIGIN&&!origin.username&&!origin.password&&issuer.protocol==='https:'&&!issuer.username&&!issuer.password&&!issuer.search&&!issuer.hash;}catch{return false;}
}
export const authConfigured=configured;
async function rateLimit(request:Request,env:StaffEnv,purpose:string):Promise<void> {
 if(!env.STAFF_AUTH_RATE_SECRET)throw new StaffError(503,'로그인 설정을 준비 중입니다.');
 const now=Date.now(),window=Math.floor(now/900000);
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.STAFF_AUTH_RATE_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode((request.headers.get('CF-Connecting-IP')||'local')+'|'+purpose+'|'+window));
 const keyHash=Array.from(new Uint8Array(bytes)).map(n=>n.toString(16).padStart(2,'0')).join('');
 const row=await env.DB.prepare('INSERT INTO staff_auth_rates(key_hash,count,expires_at) VALUES(?,1,?) ON CONFLICT(key_hash) DO UPDATE SET count=count+1 WHERE count<10 RETURNING count').bind(keyHash,now+86400000).first();
 if(!row)throw new StaffError(429,'로그인 요청이 많습니다. 잠시 후 다시 시도해주세요.');
}

async function provider(env:StaffEnv):Promise<Discovery> {
 if(!configured(env))throw new StaffError(503,'직원 로그인 서비스 설정을 준비 중입니다.');
 const issuer=new URL(env.OIDC_ISSUER);
 if(issuer.protocol!=='https:'||issuer.username||issuer.password||issuer.search||issuer.hash)throw new StaffError(503,'직원 로그인 설정을 확인해주세요.');
 const response=await fetch(env.OIDC_ISSUER.replace(/\/$/,'')+'/.well-known/openid-configuration',{signal:AbortSignal.timeout(10000),redirect:'error'});
 if(!response.ok)throw new StaffError(503,'로그인 서비스에 연결하지 못했습니다.');
 const data=await response.json() as Discovery;
 if(data.issuer!==env.OIDC_ISSUER)throw new StaffError(503,'로그인 서비스 설정이 일치하지 않습니다.');
 for(const key of ['authorization_endpoint','token_endpoint','jwks_uri'] as const){
  const url=new URL(data[key]);if(url.protocol!=='https:'||url.username||url.password||url.hash)throw new StaffError(503,'로그인 서비스 설정을 확인해주세요.');
 }
 return data;
}
export async function startAuth(request:Request,env:StaffEnv):Promise<Response> {
 if(!configured(env))throw new StaffError(503,'직원 로그인 서비스 설정을 준비 중입니다.');
 if(request.method!=='POST')throw new StaffError(405,'로그인 화면에서 시작해주세요.');
 checkOrigin(request,env);
 await rateLimit(request,env,'start');
 const raw=await request.text();if(raw.length>4096)throw new StaffError(400,'로그인 요청을 다시 준비해주세요.');
 const input=new URLSearchParams(raw);
 const seed=cookieValue(request,'gnc_staff_start');
 if(!seed||!/^[-\w]{43}$/.test(seed)||input.get('startToken')!==seed)throw new StaffError(403,'로그인 화면을 새로 열어주세요.');
 const invitation=input.get('invitation');let invitationId:string|null=null;
 if(invitation) {
  const found=await env.DB.prepare(`SELECT i.id FROM staff_invitations i JOIN staff s ON s.id=i.staff_id WHERE i.token_hash=? AND i.used_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>? AND s.status='invited' AND s.provider_issuer=?`).bind(await hash(invitation),Date.now(),env.OIDC_ISSUER).first<{id:string}>();
  if(!found)throw new StaffError(400,'초대가 만료되었거나 사용할 수 없습니다.');invitationId=found.id;
 }
 const discovery=await provider(env),state=randomToken(),nonce=randomToken(),verifier=randomToken();
 const challenge=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 await env.DB.prepare(`INSERT INTO staff_auth_flows(state_hash,nonce_hash,verifier_hash,invitation_id,return_path,expires_at) VALUES(?,?,?,?,?,?)`).bind(await hash(state),await hash(nonce),await hash(verifier),invitationId,input.get('returnTo')||'/admin',Date.now()+600000).run();
 const url=new URL(discovery.authorization_endpoint);
 for(const [key,value] of Object.entries({client_id:env.OIDC_CLIENT_ID,response_type:'code',scope:'openid email profile',redirect_uri:env.APP_ORIGIN+'/api/staff-auth/callback',state,nonce,code_challenge:challenge,code_challenge_method:'S256',prompt:'select_account'}))url.searchParams.set(key,value);
 const headers=new Headers({'Location':url.href,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'});
 headers.append('Set-Cookie',cookie(FLOW_COOKIE,state+'.'+verifier,600));headers.append('Set-Cookie',cookie('gnc_staff_start','',0));
 if(request.headers.get('Accept')==='application/json'){headers.delete('Location');headers.set('Content-Type','application/json');return new Response(JSON.stringify({authorizationUrl:url.href}),{status:200,headers});}
 return new Response(null,{status:303,headers});
}
export async function completeAuth(request:Request,env:StaffEnv):Promise<Response> {
 if(!configured(env))throw new StaffError(503,'직원 로그인 서비스 설정을 준비 중입니다.');
 if(request.method!=='GET'||new URL(request.url).origin!==env.APP_ORIGIN)throw new StaffError(400,'로그인 요청을 확인해주세요.');
 await rateLimit(request,env,'callback');
 const url=new URL(request.url),state=url.searchParams.get('state'),code=url.searchParams.get('code');
 if(!state||!code||state.length>100||code.length>4096)throw new StaffError(400,'로그인을 다시 시작해주세요.');
 const flowCookie=cookieValue(request,FLOW_COOKIE);
 if(!flowCookie||!/^[-\w]{43}\.[-\w]{43}$/.test(flowCookie))throw new StaffError(400,'로그인을 다시 시작해주세요.');
 const [cookieState,verifier]=flowCookie.split('.');if(cookieState!==state)throw new StaffError(400,'로그인을 다시 시작해주세요.');
 const stateHash=await hash(state),now=Date.now();
 const flow=await env.DB.prepare('SELECT nonce_hash,verifier_hash,invitation_id,return_path FROM staff_auth_flows WHERE state_hash=? AND used_at IS NULL AND expires_at>?').bind(stateHash,now).first<{nonce_hash:string;verifier_hash:string;invitation_id:string|null;return_path:string}>();
 if(!flow||flow.verifier_hash!==await hash(verifier))throw new StaffError(400,'로그인을 다시 시작해주세요.');
 const discovery=await provider(env);
 const methods=discovery.token_endpoint_auth_methods_supported||['client_secret_basic'];
 const post=methods.includes('client_secret_post');if(!post&&!methods.includes('client_secret_basic'))throw new StaffError(503,'지원되는 인증 서비스 설정을 확인해주세요.');
 const body=new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:env.APP_ORIGIN+'/api/staff-auth/callback',client_id:env.OIDC_CLIENT_ID,code_verifier:verifier});
 const exchangeHeaders:Record<string,string>={'Content-Type':'application/x-www-form-urlencoded'};
 if(post)body.set('client_secret',env.OIDC_CLIENT_SECRET);
 else {const encode=(value:string)=>new URLSearchParams({v:value}).toString().slice(2);exchangeHeaders.Authorization='Basic '+btoa(encode(env.OIDC_CLIENT_ID)+':'+encode(env.OIDC_CLIENT_SECRET));}
 const exchange=await fetch(discovery.token_endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:exchangeHeaders,body});
 if(!exchange.ok)throw new StaffError(400,'로그인을 완료하지 못했습니다. 다시 시작해주세요.');
 const tokens=await exchange.json() as {id_token?:string};if(!tokens.id_token)throw new StaffError(400,'로그인 결과를 확인하지 못했습니다.');
 let verified;try {verified=await jwtVerify(tokens.id_token,createRemoteJWKSet(new URL(discovery.jwks_uri)),{issuer:env.OIDC_ISSUER,audience:env.OIDC_CLIENT_ID,algorithms:['RS256','ES256'],requiredClaims:['sub','exp','iat','nonce','email','email_verified'],maxTokenAge:'10m',clockTolerance:5});}catch{throw new StaffError(400,'로그인 결과를 확인하지 못했습니다. 다시 로그인해주세요.');}
 const {payload}=verified;
 if(!payload.sub||payload.email_verified!==true||typeof payload.email!=='string'||typeof payload.nonce!=='string'||await hash(payload.nonce)!==flow.nonce_hash||(payload.azp!==undefined&&payload.azp!==env.OIDC_CLIENT_ID)||(Array.isArray(payload.aud)&&payload.aud.length>1&&payload.azp!==env.OIDC_CLIENT_ID))throw new StaffError(400,'확인된 직원 계정으로 다시 로그인해주세요.');
 const email=payload.email.trim();const at=email.lastIndexOf('@');if(at<1||email.length>254)throw new StaffError(400,'계정 이메일을 확인해주세요.');
 const normalized=email.slice(0,at)+'@'+email.slice(at+1).toLowerCase();
 const staff=await env.DB.prepare(`SELECT s.id FROM staff s WHERE s.provider_issuer=? AND (
 (s.provider_subject=? AND s.status='active' AND ? IS NULL) OR
 (s.status='invited' AND s.provider_subject IS NULL AND s.email=? AND EXISTS(SELECT 1 FROM staff_invitations i WHERE i.id=? AND i.staff_id=s.id AND i.used_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>?)))`).bind(env.OIDC_ISSUER,payload.sub,flow.invitation_id,normalized,flow.invitation_id,now).first<{id:string}>();
 if(!staff)throw new StaffError(403,'초대된 개인 계정 또는 등록된 직원 계정으로 로그인해주세요.');
 const marker=randomToken(),token=randomToken(),csrf=randomToken();
 const result=await env.DB.batch([
  env.DB.prepare(`UPDATE staff_auth_flows SET used_at=?,consumed_by=? WHERE state_hash=? AND used_at IS NULL AND expires_at>?
   AND EXISTS(SELECT 1 FROM staff s WHERE s.id=? AND s.provider_issuer=? AND ((s.status='active' AND s.provider_subject=? AND staff_auth_flows.invitation_id IS NULL) OR
   (s.status='invited' AND s.provider_subject IS NULL AND s.email=? AND EXISTS(SELECT 1 FROM staff_invitations i WHERE i.id=staff_auth_flows.invitation_id AND i.staff_id=s.id AND i.used_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>?))))`).bind(now,marker,stateHash,now,staff.id,env.OIDC_ISSUER,payload.sub,normalized,now),
  env.DB.prepare(`UPDATE staff SET provider_subject=?,status='active',last_login_at=? WHERE id=? AND EXISTS(SELECT 1 FROM staff_auth_flows WHERE state_hash=? AND consumed_by=?)`).bind(payload.sub,now,staff.id,stateHash,marker),
  env.DB.prepare(`UPDATE staff_invitations SET used_at=? WHERE id=? AND EXISTS(SELECT 1 FROM staff_auth_flows WHERE state_hash=? AND consumed_by=?)`).bind(now,flow.invitation_id,stateHash,marker),
  env.DB.prepare(`INSERT INTO staff_sessions(token_hash,staff_id,csrf_hash,auth_version,created_at,last_seen_at,expires_at)
   SELECT ?,id,?,auth_version,?,?,? FROM staff WHERE id=? AND status='active' AND EXISTS(SELECT 1 FROM staff_auth_flows WHERE state_hash=? AND consumed_by=?)`).bind(await hash(token),await hash(csrf),now,now,now+8*60*60*1000,staff.id,stateHash,marker),
  env.DB.prepare(`INSERT INTO staff_auth_events(id,staff_id,event,at) SELECT ?,?,'login',? WHERE EXISTS(SELECT 1 FROM staff_auth_flows WHERE state_hash=? AND consumed_by=?)`).bind(crypto.randomUUID(),staff.id,now,stateHash,marker),
 ]);
 if(result[0].meta.changes!==1)throw new StaffError(400,'로그인을 다시 시작해주세요.');
 const roles=(await env.DB.prepare('SELECT role FROM staff_roles WHERE staff_id=?').bind(staff.id).all<{role:StaffRole}>()).results.map(r=>r.role);
 const headers=new Headers({'Location':staffReturnPath({status:'active',roles},flow.return_path),'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'});
 headers.append('Set-Cookie',cookie(SESSION_COOKIE,token+'.'+csrf,28800));headers.append('Set-Cookie',cookie(FLOW_COOKIE,'',0));
 return new Response(null,{status:303,headers});
}
