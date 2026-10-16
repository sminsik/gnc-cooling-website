import test from 'node:test';
import assert from 'node:assert/strict';
import {publicFixture} from './helpers/public-fixture.mjs';
import {homeContent} from '../src/public-home.ts';
test('seed examples remain in storage but are absent from public lists, detail, home and attachments',async()=>{
 const f=publicFixture();
 try{
  f.project('demo-20261013-projects-1');f.project('real-case');
  f.resource('demo-20261013-resources-1');f.resource('real-resource');
  f.notice('demo-20261013-notice-1','2026-10-01');f.notice('real-notice','2026-10-01');
  for(const [type,seed,real] of [['projects','demo-20261013-projects-1','real-case'],['resources','demo-20261013-resources-1','real-resource'],['notices','demo-20261013-notice-1','real-notice']]){
   const list=await(await f.request('/api/'+type)).json();assert.deepEqual(list.items.map(v=>v.id),[real]);
   assert.equal((await f.request('/'+type+'/'+seed)).status,404);
   assert.equal((await f.request('/api/'+type+'/'+seed)).status,404);
   assert.equal((await f.request('/'+type+'/'+real)).status,200);
   assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM '+type).get().n,2);
  }
  const home=await homeContent(f.env.DB);assert.deepEqual(home.projects.map(v=>v.id),['real-case']);assert.deepEqual(home.notices.map(v=>v.id),['real-notice']);
  for(const file of ['image-demo-20261013-projects-1','pdf-demo-20261013-resources-1'])assert.equal((await f.request('/api/content-files/'+file)).status,404);
 }finally{f.sql.close();}
});
