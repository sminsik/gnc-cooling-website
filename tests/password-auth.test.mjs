import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './helpers/staff-fixture.mjs';
import worker from '../src/index.ts';
import {initialAdminPlan,applyInitialAdmin} from '../src/staff-bootstrap.ts';
import {PASSWORD_ISSUER,passwordDigest} from '../src/password-auth.ts';
async function fixture(){
 const f=setup();f.env.STAFF_AUTH_MODE='password';
 const plan=await initialAdminPlan({name:'책임자',email:'root@example.test',issuer:PASSWORD_ISSUER,origin:f.env.APP_ORIGIN,accountConfirmed:true});await applyInitialAdmin(f.env,plan);
 async function anonymous(path,body,extra={}){
  const page=await f.request('/admin/login');const html=await page.text(),seed=html.match(/name="startToken" value="([^"]+)"/)[1];
  return worker.fetch(new Request(f.env.APP_ORIGIN+path,{method:'POST',headers:{Origin:f.env.APP_ORIGIN,'Content-Type':'application/json',Cookie:'gnc_staff_start='+seed,...extra},body:JSON.stringify({startToken:seed,...body})}),f.env);
 }
 const password='testing-only-password-12345',token=new URL(plan.invitationUrl).hash.slice('#invitation='.length);
 async function activate(){const response=await anonymous('/api/staff-auth/password-set',{kind:'invitation',token,password,passwordConfirm:password});assert.equal(response.status,200);const value=response.headers.get('Set-Cookie').match(/gnc_staff_session=([^;]+)/)[1];f.sessions[plan.id]={cookie:'gnc_staff_session='+value,csrf:value.split('.')[1]};return response;}
 return {...f,plan,anonymous,activate,password,token};
}
test('password invitation is single-use, stores a salted digest and grants current roles',async()=>{
 const f=await fixture();try{
  assert.equal((await f.request('/api/staff-auth/start',null,'POST',{})).status,404);
  assert.equal((await f.request('/admin/password')).status,200);assert.equal(f.sql.prepare('SELECT used_at FROM staff_invitations').get().used_at,null);
  await f.activate();const row=f.sql.prepare('SELECT * FROM staff_passwords').get();assert.equal(row.iterations,600000);assert.notEqual(row.digest,f.password);assert.equal(row.digest,await passwordDigest(f.password,row.salt));
  assert.equal((await f.anonymous('/api/staff-auth/password-set',{kind:'invitation',token:f.token,password:f.password,passwordConfirm:f.password})).status,400);
  assert.equal((await f.request('/admin/staff',f.plan.id)).status,200);
  assert.equal((await f.anonymous('/api/staff-auth/password-login',{email:'root@example.test',password:f.password})).status,200);
 }finally{f.sql.close();}
});
test('uninvited users, CSRF, wrong origins and weak passwords cannot create credentials',async()=>{
 const f=await fixture();try{
  assert.equal((await f.anonymous('/api/staff-auth/password-set',{kind:'invitation',token:'a'.repeat(43),password:f.password,passwordConfirm:f.password})).status,400);
  assert.equal((await f.anonymous('/api/staff-auth/password-set',{kind:'invitation',token:f.token,password:'short',passwordConfirm:'short'})).status,400);
  assert.equal((await f.anonymous('/api/staff-auth/password-set',{kind:'invitation',token:f.token,password:f.password,passwordConfirm:f.password},{Origin:'https://other.test'})).status,403);
  assert.equal((await f.anonymous('/api/staff-auth/password-login',{email:'root@example.test',password:f.password},{Cookie:''})).status,403);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM staff_passwords').get().n,0);
 }finally{f.sql.close();}
});
test('manual reset requires admin confirmation, replaces password and revokes previous sessions',async()=>{
 const f=await fixture();try{
  await f.activate();const payload={expectedVersion:2,reason:'본인 확인 시험',confirmed:true};
  assert.equal((await f.request('/api/admin/staff/'+f.plan.id+'/reset',f.plan.id,'POST',{...payload,confirmed:false})).status,400);
  const issued=await f.request('/api/admin/staff/'+f.plan.id+'/reset',f.plan.id,'POST',payload);assert.equal(issued.status,200);const {resetUrl}=await issued.json();const reset=new URL(resetUrl).hash.slice(7),password='different-testing-password-67890';
  const response=await f.anonymous('/api/staff-auth/password-set',{kind:'reset',token:reset,password,passwordConfirm:password});assert.equal(response.status,200);
  assert.equal((await f.request('/admin/staff',f.plan.id)).status,401);
  assert.equal((await f.anonymous('/api/staff-auth/password-login',{email:'root@example.test',password:f.password})).status,401);
  assert.equal((await f.anonymous('/api/staff-auth/password-login',{email:'root@example.test',password})).status,200);
  assert.equal((await f.anonymous('/api/staff-auth/password-set',{kind:'reset',token:reset,password,passwordConfirm:password})).status,400);
 }finally{f.sql.close();}
});
test('content staff receives no inquiry or invitation permissions and suspended staff cannot login',async()=>{
 const f=await fixture();try{
  await f.activate();const response=await f.request('/api/admin/staff',f.plan.id,'POST',{name:'김관리',email:'content@example.test',roles:['content_manager']});assert.equal(response.status,201);const {id,invitationUrl}=await response.json();
  const token=new URL(invitationUrl).hash.slice(12);const activated=await f.anonymous('/api/staff-auth/password-set',{kind:'invitation',token,password:f.password,passwordConfirm:f.password});assert.equal(activated.status,200);const value=activated.headers.get('Set-Cookie').match(/gnc_staff_session=([^;]+)/)[1];f.sessions[id]={cookie:'gnc_staff_session='+value,csrf:value.split('.')[1]};
  assert.equal((await f.request('/admin/products',id)).status,200);assert.equal((await f.request('/admin/inquiries',id)).status,403);assert.equal((await f.request('/admin/staff',id)).status,403);
  assert.equal((await f.request('/api/admin/staff/'+f.plan.id+'/reset',id,'POST',{expectedVersion:2,reason:'test',confirmed:true})).status,403);
  assert.equal((await f.request('/api/admin/staff/'+id+'/suspend',f.plan.id,'POST',{expectedVersion:2,reason:'test'})).status,200);
  assert.equal((await f.request('/admin/products',id)).status,401);assert.equal((await f.anonymous('/api/staff-auth/password-login',{email:'content@example.test',password:f.password})).status,401);
 }finally{f.sql.close();}
});
test('racing invitation redemption has one winner; revoked links do not change credentials',async()=>{
 const f=await fixture();try{
  const body={kind:'invitation',token:f.token,password:f.password,passwordConfirm:f.password};const results=await Promise.all([f.anonymous('/api/staff-auth/password-set',body),f.anonymous('/api/staff-auth/password-set',body)]);assert.equal(results.filter(r=>r.status===200).length,1);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM staff_passwords').get().n,1);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM staff_sessions WHERE revoked_at IS NULL').get().n,1);
 }finally{f.sql.close();}
});
test('bad login does not disclose unknown accounts and repeated requests are limited',async()=>{
 const f=await fixture();try{
  await f.activate();const unknown=await f.anonymous('/api/staff-auth/password-login',{email:'unknown@example.test',password:f.password});const wrong=await f.anonymous('/api/staff-auth/password-login',{email:'root@example.test',password:'wrong-test-password'});assert.equal(unknown.status,401);assert.deepEqual(await unknown.json(),await wrong.json());
  for(let i=0;i<9;i++)assert.equal((await f.anonymous('/api/staff-auth/password-login',{email:'root@example.test',password:'wrong-test-password'})).status,401);
  assert.equal((await f.anonymous('/api/staff-auth/password-login',{email:'root@example.test',password:f.password})).status,429);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM staff_sessions').get().n,1);
 }finally{f.sql.close();}
});
test('expired invitations and revoked resets do not create or replace credentials',async()=>{
 const f=await fixture();try{
  f.sql.prepare('UPDATE staff_invitations SET expires_at=0').run();const body={kind:'invitation',token:f.token,password:f.password,passwordConfirm:f.password};assert.equal((await f.anonymous('/api/staff-auth/password-set',body)).status,400);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM staff_passwords').get().n,0);
  f.sql.prepare('UPDATE staff_invitations SET expires_at=?').run(Date.now()+60000);await f.activate();
  const r=await f.request('/api/admin/staff/'+f.plan.id+'/reset',f.plan.id,'POST',{expectedVersion:2,confirmed:true,reason:'test'});assert.equal(r.status,200);const {resetUrl}=await r.json();f.sql.prepare('UPDATE staff_password_resets SET revoked_at=?').run(Date.now());
  const before=f.sql.prepare('SELECT digest,version FROM staff_passwords').get();assert.equal((await f.anonymous('/api/staff-auth/password-set',{kind:'reset',token:new URL(resetUrl).hash.slice(7),password:'different-test-password',passwordConfirm:'different-test-password'})).status,400);assert.deepEqual(f.sql.prepare('SELECT digest,version FROM staff_passwords').get(),before);
 }finally{f.sql.close();}
});
test('confirmed content invitation defaults are visible only to responsible admin and do not register staff',async()=>{
 const f=await fixture();try{
  await f.activate();f.env.STAFF_PENDING_CONTENT_NAME='시험 직원';f.env.STAFF_PENDING_CONTENT_EMAIL='private-content@example.test';
  const page=await f.request('/admin/staff',f.plan.id);assert.equal(page.status,200);const html=await page.text();assert.match(html,/private-content@example.test/);assert.match(html,/value="content_manager" checked/);assert.doesNotMatch(html,/value="inquiry_manager" checked/);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM staff').get().n,1);
  const publicPage=await f.request('/');assert.equal((await publicPage.text()).includes('private-content@example.test'),false);assert.equal((await f.request('/admin/staff')).status,401);
 }finally{f.sql.close();}
});

test('short development password and its existing session stop working when local exception is disabled',async()=>{
 const f=await fixture();try{
  f.env.APP_ORIGIN='https://localhost:8788';f.env.STAFF_DEV_SHORT_PASSWORD='true';
  const response=await f.anonymous('/api/staff-auth/password-set',{kind:'invitation',token:f.token,password:'1111',passwordConfirm:'1111'});assert.equal(response.status,200);
  const value=response.headers.get('Set-Cookie').match(/gnc_staff_session=([^;]+)/)[1];f.sessions[f.plan.id]={cookie:'gnc_staff_session='+value,csrf:value.split('.')[1]};
  assert.equal(f.sql.prepare('SELECT local_only FROM staff_passwords').get().local_only,1);assert.equal((await f.request('/admin/staff',f.plan.id)).status,200);
  assert.equal((await f.anonymous('/api/staff-auth/password-login',{email:'root@example.test',password:'1111'})).status,200);
  f.env.STAFF_DEV_SHORT_PASSWORD='false';assert.equal((await f.request('/admin/staff',f.plan.id)).status,401);assert.equal((await f.anonymous('/api/staff-auth/password-login',{email:'root@example.test',password:'1111'})).status,401);
  f.env.APP_ORIGIN='https://app.test';f.env.STAFF_DEV_SHORT_PASSWORD='true';assert.equal((await f.request('/admin/login')).status,503);assert.equal((await f.request('/admin/staff',f.plan.id)).status,401);
 }finally{f.sql.close();}
});
test('normal strength password clears development scope on a confirmed reset',async()=>{
 const f=await fixture();try{
  f.env.APP_ORIGIN='https://localhost:8788';f.env.STAFF_DEV_SHORT_PASSWORD='true';
  const response=await f.anonymous('/api/staff-auth/password-set',{kind:'invitation',token:f.token,password:'1111',passwordConfirm:'1111'});assert.equal(response.status,200);
  const value=response.headers.get('Set-Cookie').match(/gnc_staff_session=([^;]+)/)[1];f.sessions[f.plan.id]={cookie:'gnc_staff_session='+value,csrf:value.split('.')[1]};
  const issued=await f.request('/api/admin/staff/'+f.plan.id+'/reset',f.plan.id,'POST',{expectedVersion:2,reason:'개발 비밀번호 교체 시험',confirmed:true});assert.equal(issued.status,200);
  const token=new URL((await issued.json()).resetUrl).hash.slice(7);assert.equal((await f.anonymous('/api/staff-auth/password-set',{kind:'reset',token,password:f.password,passwordConfirm:f.password})).status,200);
  assert.equal(f.sql.prepare('SELECT local_only FROM staff_passwords').get().local_only,0);f.env.STAFF_DEV_SHORT_PASSWORD='false';assert.equal((await f.anonymous('/api/staff-auth/password-login',{email:'root@example.test',password:f.password})).status,200);
 }finally{f.sql.close();}
});
