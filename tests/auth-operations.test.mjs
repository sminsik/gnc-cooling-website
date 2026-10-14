import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './helpers/staff-fixture.mjs';
import {initialAdminPlan,applyInitialAdmin,reissueInitialAdmin} from '../src/staff-bootstrap.ts';
import {cleanStaffAuth} from '../src/staff-maintenance.ts';
import {authConfigured} from '../src/staff-auth.ts';
import {hash,randomToken} from '../src/staff-session.ts';
const account={name:'확인된 책임 관리자',email:'first@example.test',issuer:'https://idp.test',origin:'https://app.test',accountConfirmed:true};
test('initial admin remains invited, only one atomic bootstrap survives concurrency, no session bypass',async()=>{
 const f=setup();const a=await initialAdminPlan(account),b=await initialAdminPlan({...account,email:'second@example.test'});
 const results=await Promise.allSettled([applyInitialAdmin(f.env,a),applyInitialAdmin(f.env,b)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const staff=f.sql.prepare('SELECT * FROM staff').get();assert.equal(staff.status,'invited');assert.equal(staff.provider_subject,null);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM staff_sessions').get().n,0);assert.deepEqual(f.sql.prepare('SELECT role FROM staff_roles').get(),Object.assign(Object.create(null),{role:'admin'}));
 const token=new URL(a.invitationUrl).hash.split('=')[1];assert.equal(f.sql.prepare('SELECT token_hash FROM staff_invitations').get().token_hash,await hash(token));assert.equal(f.sql.prepare('SELECT event FROM staff_auth_events').get().event,'bootstrap');
 assert.equal((await f.request('/api/admin/staff/bootstrap',null,'POST',{})).status,401);assert.equal((await f.request('/admin/bootstrap')).status,401);
 await assert.rejects(applyInitialAdmin(f.env,await initialAdminPlan(account)),/한 번/);f.sql.close();
});
test('bootstrap requires explicit account confirmation and exact issuer/origin; no changes on rejected plan',async()=>{
 const f=setup();await assert.rejects(initialAdminPlan({...account,accountConfirmed:false}),/확인/);await assert.rejects(initialAdminPlan({...account,origin:'http://127.0.0.1:8787'}),/HTTPS/);
 await assert.rejects(applyInitialAdmin({...f.env,OIDC_ISSUER:'https://other.test'},await initialAdminPlan(account)),/다릅니다/);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM staff').get().n,0);f.sql.close();
});
test('initial invite reissue revokes old token without changing identity or roles, active bootstrap cannot be reopened',async()=>{
 const f=setup(),first=await applyInitialAdmin(f.env,await initialAdminPlan(account));
 const renewed=await reissueInitialAdmin(f.env,{email:account.email,accountConfirmed:true});assert.notEqual(renewed.invitationUrl,first.invitationUrl);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM staff').get().n,1);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM staff_invitations WHERE revoked_at IS NULL').get().n,1);
 await assert.rejects(reissueInitialAdmin(f.env,{email:'other@example.test',accountConfirmed:true}),/수락 전/);f.sql.prepare("UPDATE staff SET status='active',provider_subject='verified-subject'").run();await assert.rejects(reissueInitialAdmin(f.env,{email:account.email,accountConfirmed:true}),/수락 전/);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM staff_bootstrap').get().n,1);f.sql.close();
});
test('expired auth artifacts are cleaned while active sessions, staff, invitations and audit lock survive',async()=>{
 const f=setup();await f.staff('active',['admin']);await f.staff('idle',['content_manager']);const now=Date.now();f.sql.prepare("UPDATE staff_sessions SET last_seen_at=0 WHERE staff_id='idle'").run();
 f.sql.prepare('INSERT INTO staff_auth_rates VALUES(?,?,?)').run('expired',1,0);f.sql.prepare('INSERT INTO staff_auth_rates VALUES(?,?,?)').run('live',1,now+60000);
 f.sql.prepare('INSERT INTO staff_auth_flows(state_hash,nonce_hash,verifier_hash,return_path,expires_at) VALUES(?,?,?,?,?)').run('old','hash','hash','/admin',0);
 await cleanStaffAuth(f.env,now);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM staff_sessions').get().n,1);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM staff').get().n,2);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM staff_auth_rates').get().n,1);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM staff_auth_flows').get().n,0);assert.equal((await f.request('/api/staff/me','active')).status,200);assert.equal((await f.request('/api/staff/me','idle')).status,401);f.sql.close();
});
test('auth settings fail closed for HTTP/invalid origins/weak rate secret; no secret in public login page',async()=>{
 const f=setup();assert.equal(authConfigured(f.env),true);for(const extra of [{APP_ORIGIN:'http://app.test'},{APP_ORIGIN:'https://app.test/path'},{OIDC_ISSUER:'https://user:pass@idp.test'},{STAFF_AUTH_RATE_SECRET:'short'}])assert.equal(authConfigured({...f.env,...extra}),false);
 const html=await(await f.request('/admin/login')).text();assert.equal(html.includes(f.env.OIDC_CLIENT_SECRET),false);assert.equal(html.includes(f.env.STAFF_AUTH_RATE_SECRET),false);f.sql.close();
});
test('staff invite renewal requires responsible admin/current version, preserves roles and revokes earlier token',async()=>{
 const f=setup();await f.staff('root',['admin']);await f.staff('content',['content_manager']);const first=await(await f.request('/api/admin/staff','root','POST',{name:'새 직원',email:'new@example.test',roles:['content_manager']})).json();
 assert.equal((await f.request(`/api/admin/staff/${first.id}/reinvite`,'content','POST',{expectedVersion:1,reason:'만료'})).status,403);
 const response=await f.request(`/api/admin/staff/${first.id}/reinvite`,'root','POST',{expectedVersion:1,reason:'만료'});assert.equal(response.status,200);assert.notEqual((await response.json()).invitationUrl,first.invitationUrl);
 assert.equal((await f.request(`/api/admin/staff/${first.id}/reinvite`,'root','POST',{expectedVersion:1,reason:'중복'})).status,409);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM staff_invitations WHERE revoked_at IS NULL').get().n,1);assert.equal(f.sql.prepare('SELECT role FROM staff_roles WHERE staff_id=?').get(first.id).role,'content_manager');f.sql.close();
});
test('authenticated responsible admin has inquiry dashboard and management menu',async()=>{
 const f=setup();await f.staff('root',['admin']);const response=await f.request('/admin/dashboard','root');assert.equal(response.status,200);const html=await response.text();assert.ok(html.includes('href="/admin/staff"'));assert.ok(html.includes('href="/admin/products"'));assert.equal((await f.request('/api/admin/dashboard','root')).status,200);f.sql.close();
});
