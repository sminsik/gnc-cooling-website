import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogProducts} from '../src/product-data.ts';
import {selectCatalog,relatedProductProjects} from '../src/product-pages.ts';
import {publicFixture} from './helpers/public-fixture.mjs';

test('file catalog has ten unique products and aligned sourced model cells',()=>{
 assert.equal(catalogProducts.length,10);assert.equal(new Set(catalogProducts.map(p=>p.id)).size,10);
 assert.equal(catalogProducts.reduce((n,p)=>n+p.models.length,0),84);
 for(const p of catalogProducts){assert.ok(p.image.startsWith('/product-media/'));assert.ok(p.consultation.length>=5);for(const row of p.models)assert.equal(row.length,p.headers.length);}
 assert.equal(catalogProducts.find(p=>p.id==='closed-circuit').models.length,0);
});
test('catalog category and literal product/model search combine without mixing families',()=>{
 assert.equal(selectCatalog(new URLSearchParams('category=cooling-towers')).items.length,4);
 assert.equal(selectCatalog(new URLSearchParams('category=chillers')).items.length,5);
 assert.deepEqual(selectCatalog(new URLSearchParams('q=SGD-100AS')).items.map(p=>p.id),['double-screw-chiller']);
 assert.equal(selectCatalog(new URLSearchParams('category=cooling-towers&q=SGD-100AS')).items.length,0);
 assert.equal(selectCatalog(new URLSearchParams('category=unknown')).items.length,0);
 assert.throws(()=>selectCatalog(new URLSearchParams('q='+'a'.repeat(101))));
});
test('product pages use local assets, safe empty search, contextual consultation, and HEAD semantics',async()=>{
 const f=publicFixture();
 try{
 for(const p of catalogProducts){const r=await f.request('/products/'+p.id);assert.equal(r.status,200);const h=await r.text();assert.ok(h.includes('name="product-faq"'));assert.ok(h.includes('product='+p.id));assert.ok(h.includes('/projects'));assert.ok(!h.includes('확인 후 안내하겠습니다'));}
 const r=await f.request('/products?q='+encodeURIComponent('<script>alert(1)</script>'));const h=await r.text();assert.ok(h.includes('검색 결과가 없습니다.'));assert.ok(!h.includes('<script>alert'));
 assert.equal(await(await f.request('/products/counterflow-square',undefined,'HEAD')).text(),'');
 const inquiry=await(await f.request('/inquiries?product=closed-circuit')).text();assert.ok(inquiry.includes('대향류 사각 밀폐형 냉각탑'));assert.ok(!inquiry.includes('연결된 제품·모델·사례는 현재'));
 }finally{f.sql.close();}
});
test('related projects require explicit IDs and current public approval, never arbitrary work-type matches',async()=>{
 const f=publicFixture();
 try{f.project('approved');f.project('hidden','2026-10-01','hidden');f.project('unrelated');
 const p={...catalogProducts[0],projectIds:['approved','hidden']};
 const result=await relatedProductProjects(f.env.DB,p);assert.deepEqual(result.map(p=>p.id),['approved']);
 assert.deepEqual(await relatedProductProjects({prepare(){throw new Error('no query expected');}},catalogProducts[0]),[]);
 }finally{f.sql.close();}
});

test('product location includes category and only sibling products; category pages retain selected category',async()=>{
 const {publicLocation}=await import('../src/site-header.ts');
 const html=publicLocation('대향류 사각 냉각탑','/products/counterflow-square');
 assert.equal((html.match(/class="ui-location-select"/g)||[]).length,3);
 assert.ok(html.includes('<span>냉각탑</span>'));assert.ok(html.includes('aria-current="page">대향류 사각 냉각탑'));
 const last=html.slice(html.lastIndexOf('<details'));
 assert.ok(last.includes('/products/closed-circuit'));assert.ok(!last.includes('/products/scroll-chiller'));
 const f=publicFixture();try{const page=await(await f.request('/products?category=chillers')).text();assert.ok(page.includes('aria-current="page">칠러</span>'));}finally{f.sql.close();}
});

test('all five chiller detail pages preserve full original technical tables and merged cells',async()=>{
 const {productSpecificationTables}=await import('../src/product-specifications.ts');
 const f=publicFixture();try{
 assert.equal(Object.keys(productSpecificationTables).length,5);
 for(const [id,rows] of Object.entries(productSpecificationTables)){
  const html=await(await f.request('/products/'+id)).text();
  const table=html.slice(html.indexOf('<div class="catalog-table-scroll catalog-full-specs"'),html.indexOf('</table>')+8);
  assert.equal((table.match(/<tr>/g)||[]).length,rows.length);
  for(const text of ['냉매','전원', '제품중량']){if(rows.flat().some(c=>c.text.includes(text)))assert.ok(table.includes(text));}
  assert.ok(table.includes('rowspan='));assert.ok(table.includes('colspan='));
 }
 const double=await(await f.request('/products/double-screw-chiller')).text();
 for(const text of ['Semi-Hermetic SCREW','R-22','Oil Heater','토출가스온도조절기','증발기 접속 관경','5,160'])assert.ok(double.includes(text),text);
 }finally{f.sql.close();}
});

test('all cooling tower features and closed-circuit structure/applications are present in details',async()=>{
 const {towerFeatures}=await import('../src/product-features.ts');
 assert.deepEqual(Object.values(towerFeatures).map(a=>a.length),[6,6,8,5]);
 const f=publicFixture();try{for(const [id,items] of Object.entries(towerFeatures)){
 const html=await(await f.request('/products/'+id)).text();
 for(const item of items)assert.ok(html.includes(item.title),id+': '+item.title);
 if(id==='closed-circuit')for(const text of ['HOW IT WORKS','항온항습·히트펌프','제철·열처리 설비'])assert.ok(html.includes(text));
 }}finally{f.sql.close();}
});
