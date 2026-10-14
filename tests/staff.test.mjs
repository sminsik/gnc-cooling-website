import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { generateKeyPair,exportJWK,SignJWT } from 'jose';
import worker from '../src/index.ts';
import { randomToken,hash,resolveStaff } from '../src/staff-session.ts';
import { saveContent } from '../src/content-admin.ts';
import { setup } from './helpers/staff-fixture.mjs';
const notice=(title='공지')=>({title,body:'시험 공지 본문',pinned:false});
const product={name:'가상 제품',category_id:'cooling-towers',intro:'시험 소개',description:'시험 설명',image_id:'',image_alt:''};
test('current role matrix gates data APIs and menu; dual roles cannot manage staff or delete',async()=>{
 const s=setup();await s.staff('content',['content_manager']);await s.staff('inquiry',['inquiry_manager']);await s.staff('dual',['content_manager','inquiry_manager']);await s.staff('root',['admin']);await s.staff('none',[]);
 assert.equal((await s.request('/api/admin/products','content')).status,200);assert.equal((await s.request('/api/admin/products','inquiry')).status,403);
 assert.equal((await s.request('/api/admin/dashboard','content')).status,403);assert.equal((await s.request('/api/admin/dashboard','inquiry')).status,200);
 for(const id of ['content','dual']){assert.equal((await s.request('/api/admin/staff',id)).status,403);assert.equal((await s.request('/api/admin/notices/x/delete',id,'POST',{expectedVersion:1,reason:'시험'})).status,403);}
 assert.equal((await s.request('/admin','content')).headers.get('Location'),'/admin/products');assert.equal((await s.request('/admin','none')).headers.get('Location'),'/admin/account');
 const html=await(await s.request('/admin/products','content')).text();assert.equal(html.includes('문의 관리'),false);assert.equal(html.includes('직원 계정 관리'),false);
 s.sql.close();
});
test('cookie spoofing, expiry, idle timeout, suspension and logout invalidate server access',async()=>{
 const s=setup();await s.staff('root',['admin']);
 assert.equal((await s.request('/api/admin/products',null,'GET',undefined,{Cookie:'gnc_staff_session=admin.admin','X-Staff-Role':'admin'})).status,401);
 s.sql.exec('UPDATE staff_sessions SET last_seen_at=1');assert.equal((await s.request('/api/admin/products','root')).status,401);
 s.sql.prepare('UPDATE staff_sessions SET last_seen_at=?,expires_at=1').run(Date.now());assert.equal((await s.request('/api/admin/products','root')).status,401);
 s.sql.prepare('UPDATE staff_sessions SET expires_at=?').run(Date.now()+100000);
 s.sql.exec("UPDATE staff SET status='suspended'");assert.equal((await s.request('/api/admin/products','root')).status,401);
 s.sql.exec("UPDATE staff SET status='active'");assert.equal((await s.request('/api/staff-auth/logout','root','POST',{})).status,200);assert.equal((await s.request('/api/admin/products','root')).status,401);
 s.sql.close();
});
test('origin/CSRF/input checks prevent mutation and preserve records',async()=>{
 const s=setup();await s.staff('content',['content_manager']);
 assert.equal((await s.request('/api/admin/notices','content','POST',notice(),{Origin:'https://evil.test'})).status,403);
 assert.equal((await s.request('/api/admin/notices','content','POST',notice(),{'X-CSRF-Token':'wrong'})).status,403);
 assert.equal((await s.request('/api/admin/notices','content','POST',notice(' '.repeat(2)))).status,400);
 assert.equal(s.sql.prepare('SELECT COUNT(*) AS n FROM notices').get().n,0);s.sql.close();
});
test('notice draft/publication/hiding, fixed posted time, plaintext output and optimistic conflict',async()=>{
 const s=setup();await s.staff('content',['content_manager']);
 const created=await(await s.request('/api/admin/notices','content','POST',notice('<script>bad</script>'))).json();const id=created.id;
 assert.equal((await(await s.request('/api/notices')).json()).total,0);
 assert.equal((await s.request('/api/admin/notices/'+id+'/publication','content','POST',{expectedVersion:1,publication_status:'published'})).status,200);
 const posted=s.sql.prepare('SELECT posted_at FROM notices').get().posted_at;assert.ok(posted);
 const html=await(await s.request('/notices/'+id)).text();assert.ok(html.includes('&lt;script&gt;'));assert.equal(html.includes('<script>bad'),false);
 assert.equal((await s.request('/api/admin/notices/'+id,'content','PATCH',{...notice('latest'),expectedVersion:1})).status,409);
 assert.equal(s.sql.prepare('SELECT title FROM notices').get().title,'<script>bad</script>');
 await s.request('/api/admin/notices/'+id+'/publication','content','POST',{expectedVersion:2,publication_status:'hidden'});assert.equal((await s.request('/api/notices/'+id)).status,404);
 await s.request('/api/admin/notices/'+id+'/publication','content','POST',{expectedVersion:3,publication_status:'published'});assert.equal(s.sql.prepare('SELECT posted_at FROM notices').get().posted_at,posted);s.sql.close();
});
test('reusing request ID after a failed claim cannot execute writes using an old successful claim',async()=>{
 const s=setup();await s.staff('content',['content_manager']);
 const requestId=crypto.randomUUID();const created=await(await s.request('/api/admin/notices','content','POST',{...notice('original'),requestId})).json();
 const stale=await s.request('/api/admin/notices/'+created.id,'content','PATCH',{...notice('attack'),requestId,expectedVersion:999});assert.equal(stale.status,409);
 assert.equal(s.sql.prepare('SELECT title FROM notices').get().title,'original');
 assert.equal((await s.request('/api/admin/notices/'+created.id,'content','PATCH',{...notice('attack2'),requestId,expectedVersion:1})).status,409);
 assert.equal(s.sql.prepare('SELECT title FROM notices').get().title,'original');assert.equal(s.sql.prepare('SELECT COUNT(*) AS n FROM audit_logs').get().n,1);s.sql.close();
});
test('latest roles are checked atomically even after principal resolution, with no partial writes or audit',async()=>{
 const s=setup();await s.staff('dual',['content_manager','inquiry_manager']);
 const actor=await resolveStaff(new Request(s.env.APP_ORIGIN+'/api/admin/notices',{headers:{Cookie:s.sessions.dual.cookie}}),s.env);
 s.sql.exec("DELETE FROM staff_roles WHERE staff_id='dual' AND role='content_manager'");
 await assert.rejects(()=>saveContent(s.env.DB,actor,'notices',null,{...notice(),requestId:crypto.randomUUID()}),error=>error.status===409);
 assert.equal(s.sql.prepare('SELECT COUNT(*) AS n FROM notices').get().n,0);assert.equal(s.sql.prepare('SELECT COUNT(*) AS n FROM audit_logs').get().n,0);
 assert.equal((await s.request('/api/admin/notices','dual')).status,403);assert.equal((await s.request('/api/admin/dashboard','dual')).status,200);s.sql.close();
});
test('product publication requires validated public image, and model/spec mutations preserve zero',async()=>{
 const s=setup();await s.staff('content',['content_manager']);
 const id=(await(await s.request('/api/admin/products','content','POST',product)).json()).id;
 assert.equal((await s.request('/api/admin/products/'+id+'/publication','content','POST',{expectedVersion:1,publication_status:'published'})).status,409);
 s.sql.exec("INSERT INTO files(id,object_key,original_name,mime,size_bytes,purpose,status,validated_at) VALUES('image','private-storage-key','sample.png','image/png',1,'public_image','ready','test')");
 await s.request('/api/admin/products/'+id,'content','PATCH',{...product,image_id:'image',image_alt:'시험 이미지',expectedVersion:1});
 assert.equal((await s.request('/api/admin/products/'+id+'/publication','content','POST',{expectedVersion:2,publication_status:'published'})).status,200);
 assert.equal((await(await s.request('/api/products')).json()).total,1);
 const modelInput={name:'M',description:'',availability:'available',specifications:[{name:'시험 항목',value:'0',unit:''}]};
 const mid=(await(await s.request('/api/admin/products/'+id+'/models','content','POST',modelInput)).json()).id;
 assert.equal((await s.request(`/api/admin/products/${id}/models/${mid}/publication`,'content','POST',{expectedVersion:1,publication_status:'published'})).status,200);
 assert.equal((await(await s.request('/api/products/'+id)).json()).models[0].specifications[0].value_text,'0');
 assert.equal((await s.request(`/api/admin/products/${id}/models/${mid}`,'content','PATCH',{...modelInput,specifications:[],expectedVersion:2})).status,409);
 await s.request('/api/admin/products/'+id+'/publication','content','POST',{expectedVersion:3,publication_status:'hidden'});assert.equal((await s.request('/api/products/'+id)).status,404);s.sql.close();
});
test('duplicate model name rolls back updated model, specifications, operation and audit together',async()=>{
 const s=setup();await s.staff('content',['content_manager']);const id=(await(await s.request('/api/admin/products','content','POST',product)).json()).id;
 const base={description:'',availability:'available',specifications:[{name:'항목',value:'old',unit:''}]};
 const mid=(await(await s.request(`/api/admin/products/${id}/models`,'content','POST',{...base,name:'M1'})).json()).id;
 await s.request(`/api/admin/products/${id}/models`,'content','POST',{...base,name:'M2'});
 const before=s.sql.prepare('SELECT COUNT(*) AS n FROM audit_logs').get().n;
 assert.equal((await s.request(`/api/admin/products/${id}/models/${mid}`,'content','PATCH',{...base,name:'M2',expectedVersion:1})).status,409);
 assert.equal(s.sql.prepare('SELECT name FROM product_models WHERE id=?').get(mid).name,'M1');assert.equal(s.sql.prepare('SELECT COUNT(*) AS n FROM audit_logs').get().n,before);s.sql.close();
});
test('category cycles and stopping a category linked to published products are rejected',async()=>{
 const s=setup();await s.staff('content',['content_manager']);
 const id=(await(await s.request('/api/admin/categories','content','POST',{name:'child',parent_id:'cooling-towers',active:true})).json()).id;
 assert.equal((await s.request('/api/admin/categories/cooling-towers','content','PATCH',{name:'parent',parent_id:id,active:true,expectedVersion:1})).status,409);
 s.sql.exec("INSERT INTO products(id,category_id,name,publication_status) VALUES('p','cooling-towers','p','published')");
 assert.equal((await s.request('/api/admin/categories/cooling-towers','content','PATCH',{name:'parent',parent_id:'',active:false,expectedVersion:1})).status,409);s.sql.close();
});
test('responsible admin alone deletes/restores; restoration remains hidden',async()=>{
 const s=setup();await s.staff('content',['content_manager']);await s.staff('root',['admin']);
 const id=(await(await s.request('/api/admin/notices','content','POST',notice())).json()).id;
 assert.equal((await s.request('/api/admin/notices/'+id+'/delete','content','POST',{expectedVersion:1,reason:'test'})).status,403);
 assert.equal((await s.request('/api/admin/notices/'+id+'/delete','root','POST',{expectedVersion:1,reason:'test'})).status,200);
 assert.equal((await s.request('/api/admin/notices/'+id,'content')).status,404);
 assert.equal((await s.request('/api/admin/notices/'+id+'/restore','root','POST',{expectedVersion:2,reason:'test'})).status,200);
 assert.equal(s.sql.prepare('SELECT publication_status FROM notices').get().publication_status,'hidden');s.sql.close();
});
test('last active administrator survives sequential competing removals and account suspension',async()=>{
 const s=setup();await s.staff('a',['admin']);await s.staff('b',['admin']);
 const responses=await Promise.all([s.request('/api/admin/staff/a/roles','a','POST',{expectedVersion:1,roles:['content_manager'],reason:'test'}),s.request('/api/admin/staff/b/suspend','b','POST',{expectedVersion:1,reason:'test'})]);
 assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
 assert.equal(s.sql.prepare("SELECT COUNT(*) AS n FROM staff s JOIN staff_roles r ON r.staff_id=s.id WHERE s.status='active' AND r.role='admin'").get().n,1);s.sql.close();
});
test('invite stores a hash, no automatic mail; unreadied project/resource publication is blocked',async()=>{
 const s=setup();await s.staff('root',['admin']);await s.staff('content',['content_manager']);
 const response=await(await s.request('/api/admin/staff','root','POST',{name:'New',email:'new@example.test',roles:['content_manager']})).json();
 const token=new URL(response.invitationUrl).hash.split('=')[1];assert.equal(s.sql.prepare('SELECT token_hash FROM staff_invitations').get().token_hash,await hash(token));
 for(const type of ['projects','resources']){const id=(await(await s.request('/api/admin/'+type,'content','POST',{title:'draft',work_type:'repair',category:'catalog',description:'draft'})).json()).id;assert.ok(id);assert.equal((await s.request(`/api/admin/${type}/${id}/publication`,'content','POST',{expectedVersion:1,publication_status:'published'})).status,409);}
 s.sql.close();
});
async function mockProvider(s,action){
 const keys=await generateKeyPair('RS256');const jwk=await exportJWK(keys.publicKey);jwk.kid='test-key';
 const original=globalThis.fetch;let claims={sub:'root',email:'root@example.test',email_verified:true},nonce='',verifier='',jwtIssuer=s.env.OIDC_ISSUER,audience='client',issuedAt=null,expires='5m',signingKey=keys.privateKey;
 globalThis.fetch=async(url,options)=>{
  if(String(url).endsWith('openid-configuration'))return Response.json({issuer:s.env.OIDC_ISSUER,authorization_endpoint:s.env.OIDC_ISSUER+'/authorize',token_endpoint:s.env.OIDC_ISSUER+'/token',jwks_uri:s.env.OIDC_ISSUER+'/jwks',token_endpoint_auth_methods_supported:['client_secret_post']});
  if(String(url).endsWith('/jwks'))return Response.json({keys:[jwk]});
  if(String(url).endsWith('/token')){assert.equal(new URLSearchParams(options.body).get('code_verifier'),verifier);return Response.json({id_token:await new SignJWT({...claims,nonce}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setIssuer(jwtIssuer).setAudience(audience).setIssuedAt(issuedAt??Math.floor(Date.now()/1000)).setExpirationTime(expires).sign(signingKey)});}
  throw new Error('unexpected provider request');
 };
 async function begin(invitation){
  const seed=randomToken();const response=await worker.fetch(new Request(s.env.APP_ORIGIN+'/api/staff-auth/start',{method:'POST',headers:{Origin:s.env.APP_ORIGIN,Cookie:'gnc_staff_start='+seed,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({startToken:seed,...(invitation?{invitation}: {})})}),s.env);
  assert.equal(response.status,303);const location=new URL(response.headers.get('Location'));nonce=location.searchParams.get('nonce');
  const flow=response.headers.getSetCookie().find(v=>v.startsWith('gnc_staff_flow=')).split(';')[0];verifier=flow.split('=')[1].split('.')[1];
  assert.equal(location.searchParams.get('code_challenge_method'),'S256');
  return {flow,state:location.searchParams.get('state'),callback:()=>worker.fetch(new Request(s.env.APP_ORIGIN+'/api/staff-auth/callback?state='+location.searchParams.get('state')+'&code=mock-code',{headers:{Cookie:flow}}),s.env)};
 }
 try{await action({begin,setClaims:value=>{claims={...claims,...value}},setNonce:value=>{nonce=value},setToken:value=>{jwtIssuer=value.issuer??s.env.OIDC_ISSUER;audience=value.audience??'client';issuedAt=value.iat??null;expires=value.expires??'5m';signingKey=value.key??keys.privateKey}});}finally{globalThis.fetch=original;}
}
test('OIDC code+PKCE+nonce login binds issuer/subject, generates hash-only session and denies state replay',async()=>{
 const s=setup();await s.staff('root',['admin']);
 await mockProvider(s,async({begin})=>{const flow=await begin();const response=await flow.callback();assert.equal(response.status,303);assert.equal(response.headers.get('Location'),'/admin/dashboard');const cookie=response.headers.getSetCookie().find(v=>v.startsWith('gnc_staff_session=')).split(';')[0];
  assert.ok(response.headers.get('Set-Cookie').includes('HttpOnly'));assert.ok(response.headers.get('Set-Cookie').includes('Secure'));
  const check=await worker.fetch(new Request(s.env.APP_ORIGIN+'/api/staff/me',{headers:{Cookie:cookie}}),s.env);assert.equal(check.status,200);assert.equal((await check.json()).id,'root');
  const count=s.sql.prepare('SELECT COUNT(*) AS n FROM staff_sessions').get().n;assert.equal((await flow.callback()).status,400);assert.equal(s.sql.prepare('SELECT COUNT(*) AS n FROM staff_sessions').get().n,count);
 });s.sql.close();
});
test('OIDC rejects wrong nonce, unverified email, new subject sharing same email and rate overflow',async()=>{
 const s=setup();await s.staff('root',['admin']);
 await mockProvider(s,async({begin,setClaims,setNonce})=>{
  let flow=await begin();setNonce('wrong');assert.equal((await flow.callback()).status,400);
  flow=await begin();setClaims({email_verified:false});assert.equal((await flow.callback()).status,400);
  flow=await begin();setClaims({email_verified:true,sub:'different'});assert.equal((await flow.callback()).status,403);
  for(let i=0;i<7;i++)await begin();
  const seed=randomToken();assert.equal((await worker.fetch(new Request(s.env.APP_ORIGIN+'/api/staff-auth/start',{method:'POST',headers:{Origin:s.env.APP_ORIGIN,Cookie:'gnc_staff_start='+seed},body:new URLSearchParams({startToken:seed})}),s.env)).status,429);
 });s.sql.close();
});
test('invitation activation requires matching verified email and token; GET login never consumes it',async()=>{
 const s=setup();await s.staff('root',['admin']);
 const invite=await(await s.request('/api/admin/staff','root','POST',{name:'New',email:'new@example.test',roles:['content_manager']})).json();const token=new URL(invite.invitationUrl).hash.split('=')[1];
 await s.request('/admin/login');assert.equal(s.sql.prepare('SELECT used_at FROM staff_invitations').get().used_at,null);
 await mockProvider(s,async({begin,setClaims})=>{let flow=await begin(token);assert.equal((await flow.callback()).status,403);setClaims({sub:'new-subject',email:'new@example.test'});flow=await begin(token);const response=await flow.callback();assert.equal(response.status,303);assert.equal(response.headers.get('Location'),'/admin/products');assert.equal(s.sql.prepare("SELECT status FROM staff WHERE email='new@example.test'").get().status,'active');assert.ok(s.sql.prepare('SELECT used_at FROM staff_invitations').get().used_at);});s.sql.close();
});
test('OIDC rejects wrong issuer/audience/signature, expired or old/future token before creating session',async()=>{
 const s=setup();await s.staff('root',['admin']);const other=await generateKeyPair('RS256');const now=Math.floor(Date.now()/1000);
 await mockProvider(s,async({begin,setToken})=>{for(const invalid of [{issuer:'https://different.test'},{audience:'different-client'},{key:other.privateKey},{expires:now-30},{iat:now-700},{iat:now+60}]){const flow=await begin();setToken(invalid);assert.equal((await flow.callback()).status,400);}
 assert.equal(s.sql.prepare("SELECT COUNT(*) AS n FROM staff_auth_events WHERE event='login'").get().n,0);assert.equal(s.sql.prepare('SELECT COUNT(*) AS n FROM staff_sessions').get().n,1);});s.sql.close();
});
test('OIDC bootstrap invitation activates only designated verified identity, then bootstrap stays locked',async()=>{
 const {initialAdminPlan,applyInitialAdmin}=await import('../src/staff-bootstrap.ts');const s=setup();const plan=await initialAdminPlan({name:'Initial',email:'first@example.test',issuer:s.env.OIDC_ISSUER,origin:s.env.APP_ORIGIN,accountConfirmed:true});await applyInitialAdmin(s.env,plan);const invite=new URL(plan.invitationUrl).hash.slice('#invitation='.length);
 await mockProvider(s,async({begin,setClaims})=>{setClaims({sub:'personal-first',email:'first@example.test'});const flow=await begin(invite);const response=await flow.callback();assert.equal(response.status,303);assert.equal(s.sql.prepare('SELECT status FROM staff').get().status,'active');assert.equal(s.sql.prepare("SELECT COUNT(*) AS n FROM staff_auth_events WHERE event='login'").get().n,1);
 assert.equal((await flow.callback()).status,400);assert.equal(s.sql.prepare("SELECT COUNT(*) AS n FROM staff_auth_events WHERE event='login'").get().n,1);await assert.rejects(applyInitialAdmin(s.env,await initialAdminPlan({name:'Other',email:'other@example.test',issuer:s.env.OIDC_ISSUER,origin:s.env.APP_ORIGIN,accountConfirmed:true})),/한 번/);});s.sql.close();
});
test('browser login start uses same-origin JSON handoff without exposing verifier or provider secret',async()=>{
 const s=setup();await s.staff('root',['admin']);await mockProvider(s,async()=>{const seed=randomToken();const response=await worker.fetch(new Request(s.env.APP_ORIGIN+'/api/staff-auth/start',{method:'POST',headers:{Origin:s.env.APP_ORIGIN,Accept:'application/json',Cookie:'gnc_staff_start='+seed,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({startToken:seed})}),s.env);assert.equal(response.status,200);const json=await response.json();assert.equal(new URL(json.authorizationUrl).origin,s.env.OIDC_ISSUER);assert.equal(response.headers.has('Location'),false);const verifier=response.headers.getSetCookie().find(v=>v.startsWith('gnc_staff_flow=')).split(';')[0].split('=')[1].split('.')[1];assert.equal(JSON.stringify(json).includes(verifier),false);assert.equal(JSON.stringify(json).includes(s.env.OIDC_CLIENT_SECRET),false);});s.sql.close();
});
