import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.ts';
import {homeContent} from '../src/public-home.ts';
import {publicFixture} from './helpers/public-fixture.mjs';
test('home selects only featured public products, first-publication projects and pinned notices',async()=>{
 const f=publicFixture();for(const [id,order] of [['p3',3],['p2',2],['p1',1],['p4',4]])f.product(id,order);
 f.product('hidden',0,{state:'hidden'});f.product('ordinary',0,{featured:0});f.product('unsafe',0,{fileStatus:'blocked'});
 f.project('old','2020-01-01');f.project('z','2026-10-01');f.project('a','2026-10-01');f.project('hidden-project','2026-11-01','hidden');
 f.notice('recent','2026-10-11');f.notice('pinned','2026-01-01',1);f.notice('hidden-notice','2026-11-01',1,'hidden');
 const data=await homeContent(f.env.DB);assert.deepEqual(data.products.map(p=>p.id),['p1','p2','p3']);assert.deepEqual(data.projects.map(p=>p.id),['z','a','old']);assert.deepEqual(data.notices.map(p=>p.id),['pinned','recent']);
 const html=await(await f.request('/')).text();for(const text of ['hidden-project','hidden-notice','개발 시험 ordinary','개발 시험 unsafe'])assert.equal(html.includes(text),false);
 f.sql.exec("UPDATE products SET publication_status='hidden' WHERE id='p1'; UPDATE files SET status='blocked' WHERE id='image-z'; UPDATE notices SET deleted_at='now' WHERE id='pinned'");
 const updated=await homeContent(f.env.DB);assert.deepEqual(updated.products.map(p=>p.id),['p2','p3','p4']);assert.deepEqual(updated.projects.map(p=>p.id),['a','old']);assert.deepEqual(updated.notices.map(p=>p.id),['recent']);f.sql.close();
});
test('home hides empty sections, does not replace unselected resources and reports DB failure honestly',async()=>{
 const f=publicFixture();f.resource('r1');f.resource('r2');f.resource('hidden','hidden');
 assert.deepEqual((await homeContent(f.env.DB)).resources,[]);
 assert.deepEqual((await homeContent(f.env.DB,['r2','hidden','r1'])).resources.map(r=>r.id),['r2','r1']);
 const html=await(await f.request('/')).text();assert.equal(html.includes('data-home='),false);assert.ok(html.includes('href="/resources"'));
 const result=await worker.fetch(new Request('https://app.test/'),{...f.env,DB:{prepare(){throw Error('private DB failure')}}});assert.equal(result.status,503);const error=await result.text();assert.equal(error.includes('private DB failure'),false);assert.equal(error.includes('현재 공개된 자료가 없습니다'),false);f.sql.close();
});
test('closed inquiry shows only current public product/model/project and allowlisted business context without storing anything',async()=>{
 const f=publicFixture();f.product('p');f.product('hidden',0,{state:'hidden'});f.project('case');
 f.sql.exec("INSERT INTO product_models(id,product_id,name,publication_status) VALUES('m','p','가상 모델','published'); INSERT INTO model_specifications(id,model_id,name,value_text,unit) VALUES('s','m','시험 사양','0','시험 단위')");
 const r=await f.request('/inquiries?product=p&model=m&project=case&source=cooling-tower-repair');assert.equal(r.status,200);const html=await r.text();for(const text of ['개발 시험 p','가상 모델','개발 시험 case','냉각탑 보수'])assert.ok(html.includes(text));assert.equal(html.includes('<input'),false);assert.equal(html.includes('<form'),false);
 const hidden=await(await f.request('/inquiries?product=hidden&model=m&source=%3Cscript%3E')).text();assert.equal(hidden.includes('개발 시험 hidden'),false);assert.equal(hidden.includes('가상 모델'),false);assert.equal(hidden.includes('<script>'),false);
 for(const table of ['inquiries','inquiry_sessions','inquiry_mail_outbox','customer_sessions'])assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM '+table).get().n,0);
 const post=await f.request('/api/inquiries',null,'POST',{});assert.equal(post.status,503);f.sql.close();
});
test('public list errors remain HTML for pages and JSON for APIs, hidden details retain recovery links',async()=>{
 const f=publicFixture();for(const path of ['/notices?page=0','/resources?page=0','/products?page=0']){const r=await f.request(path);assert.equal(r.status,400);assert.ok(r.headers.get('Content-Type').includes('text/html'));}
 assert.equal((await f.request('/api/notices?page=0')).status,400);
 f.notice('hidden','2026-10-01',0,'hidden');for(const path of ['/notices/hidden','/resources/missing','/products/missing']){const r=await f.request(path);assert.equal(r.status,404);assert.ok((await r.text()).includes('홈으로'));}
 f.sql.close();
});
