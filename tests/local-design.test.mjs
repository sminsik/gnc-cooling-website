import test from 'node:test';
import assert from 'node:assert/strict';
import {designResponse} from '../scripts/dev-design.mjs';
import {staticPages,menu} from '../src/site-content.ts';

test('design preview serves every menu and static page, with working local assets and links',async()=>{
 const pending=new Set(['/', '/style-guide',...staticPages.map(p=>p.path),...menu.flatMap(m=>[m.path,...m.links.map(l=>l.path)])]);
 const visited=new Set();
 for(const path of pending){
  if(visited.has(path))continue;visited.add(path);
  const [status,type,body]=await designResponse('GET',path);
  assert.equal(status,path==='/my-inquiries'?503:200,path);
  assert.match(type,/text\/html/,path);
  const html=String(body);assert.match(html,/ローカル|로컬 디자인 예시/);
  assert.ok(!html.includes('/api/product-images/design-'),path);
  for(const match of html.matchAll(/(?:href|src)="(\/[^"#]*)"/g)){
   const link=match[1].replaceAll('&amp;','&');
   if(link.startsWith('/api/')||link.startsWith('/admin'))continue;
   const pathname=new URL(link,'http://localhost').pathname;
   if(/\.[a-z0-9]+$/i.test(pathname)){
    assert.equal((await designResponse('GET',link))[0],200,`${path}: ${link}`);
   }else if(!visited.has(link))pending.add(link);
  }
 }
 assert.ok(visited.has('/business'));assert.ok(visited.has('/company/greeting'));assert.ok(visited.has('/products/design-0'));
});

test('design preview blocks mutations, backend routes, missing files and traversal',async()=>{
 for(const path of ['/api/inquiries','/api/staff-auth/login','/admin','/admin/products'])assert.equal((await designResponse('GET',path))[0],503,path);
 for(const method of ['POST','PUT','DELETE','PATCH'])assert.equal((await designResponse(method,'/'))[0],405);
 for(const path of ['/missing.css','/unknown-page','/../package.json','/.dev.vars'])assert.equal((await designResponse('GET',path))[0],404,path);
 const revision=await designResponse('GET','/__design_revision');assert.equal(revision[0],200);assert.ok(Number(revision[2])>0);
});
