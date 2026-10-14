import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../src/index.ts';
import { staticPages, menu } from '../src/site-content.ts';

function setup(legacy=false) {
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
 sql.exec(readFileSync(new URL('../migrations/0001_catalog.sql',import.meta.url),'utf8'));
 if(legacy)sql.exec("INSERT INTO products(id,category,model_name,description,specifications_json,published) VALUES('old','시험 분류','OLD','old description','{\"unknown\":42}',1)");
 sql.exec(readFileSync(new URL('../migrations/0002_product_structure.sql',import.meta.url),'utf8'));
 sql.exec(readFileSync(new URL('../migrations/0003_staff_content.sql',import.meta.url),'utf8'));
 sql.exec(readFileSync(new URL('../migrations/0004_content_files.sql',import.meta.url),'utf8'));
 sql.exec(readFileSync(new URL('../migrations/0005_file_attachment.sql',import.meta.url),'utf8'));
 sql.exec(readFileSync(new URL('../migrations/0006_staff_auth_operations.sql',import.meta.url),'utf8'));
 sql.exec(readFileSync(new URL('../migrations/0007_customer_inquiries.sql',import.meta.url),'utf8'));
 sql.exec(readFileSync(new URL('../migrations/0008_inquiry_workflow.sql',import.meta.url),'utf8'));
 const DB={prepare(query){let values=[];return {bind(...args){values=args;return this;},async first(){return sql.prepare(query).get(...values)||null;},async all(){return {results:sql.prepare(query).all(...values)};}};}};
 const env={DB,FILES:{async get(){return {body:new Uint8Array([1,2,3])};},async list(){return {objects:[]}}},ASSETS:{async fetch(){return new Response('css')}}};
 const request=(path,method='GET')=>worker.fetch(new Request('https://local.test'+path,{method}),env);
 return {sql,env,request};
}
function addProduct(sql,id='public',state='published',category='cooling-towers',fileStatus='ready') {
 const file='image-'+id;
 sql.prepare("INSERT INTO files(id,object_key,original_name,mime,size_bytes,purpose,status,validated_at) VALUES(?,?,?,'image/png',3,'public_image',?,'2026-10-10')").run(file,'secret-key-'+id,'image.png',fileStatus);
 sql.prepare("INSERT INTO products(id,category_id,name,intro,description,primary_file_id,publication_status) VALUES(?,?,?,?,?,?,?)").run(id,category,'시험 '+id,'시험 소개','시험 설명',file,state);
 sql.prepare("INSERT INTO file_links(file_id,product_id,purpose,alt) VALUES(?,?,'primary_image','시험 사진')").run(file,id);
}
function addModel(sql,id,availability='available',state='published',value='0') {
 sql.prepare('INSERT INTO product_models(id,product_id,name,availability,publication_status) VALUES(?,?,?,?,?)').run(id,'public',id,availability,state);
 sql.prepare('INSERT INTO model_specifications(id,model_id,name,value_text,unit) VALUES(?,?,?,?,?)').run('spec-'+id,id,'시험 사양',value,'시험 단위');
}
test('migration preserves legacy rows and raw specifications, never publishes trial data',async()=>{
 const {sql,request}=setup(true);
 assert.equal(sql.prepare('SELECT specifications_json FROM legacy_products').get().specifications_json,'{"unknown":42}');
 assert.equal(sql.prepare('SELECT publication_status FROM products').get().publication_status,'draft');
 assert.equal(sql.prepare('SELECT publication_status FROM product_models').get().publication_status,'draft');
 assert.equal((await(await request('/api/products')).json()).total,0);
 sql.close();
});
test('public filters exclude hidden/deleted/draft/blocked/unvalidated/inactive ancestor products',async()=>{
 const {sql,request}=setup();addProduct(sql);
 addProduct(sql,'hidden','hidden');addProduct(sql,'draft','draft');addProduct(sql,'deleted');
 sql.exec("UPDATE products SET deleted_at='now' WHERE id='deleted'");
 addProduct(sql,'blocked','published','cooling-towers','blocked');
 addProduct(sql,'unvalidated');sql.exec("UPDATE files SET validated_at=NULL WHERE id='image-unvalidated'");
 sql.exec("INSERT INTO product_categories(id,name,active) VALUES('inactive','inactive',0); INSERT INTO product_categories(id,name,parent_id) VALUES('child','child','inactive')");
 addProduct(sql,'in-inactive','published','child');
 const data=await(await request('/api/products')).json();
 assert.deepEqual(data.items.map(p=>p.id),['public']);
 assert.equal(data.categories.some(c=>c.id==='child'),false);
 for(const id of ['hidden','draft','deleted','blocked','unvalidated','in-inactive']) {
  assert.equal((await request('/api/products/'+id)).status,404);
  assert.equal((await request('/api/product-images/image-'+id)).status,404);
 }
 assert.equal(JSON.stringify(data).includes('secret-key'),false);sql.close();
});
test('missing representative link and empty required content are never publicly listed',async()=>{
 const {sql,request}=setup();addProduct(sql);
 sql.exec("DELETE FROM file_links");assert.equal((await(await request('/api/products')).json()).total,0);
 sql.exec("INSERT INTO file_links(file_id,product_id,purpose,alt) VALUES('image-public','public','primary_image','alt'); UPDATE products SET intro=' '");
 assert.equal((await request('/api/products/public')).status,404);sql.close();
});
test('bound literal search, category descendants, stable pagination and invalid input',async()=>{
 const {sql,request}=setup();sql.exec("INSERT INTO product_categories(id,name,parent_id) VALUES('square','사각','cooling-towers')");
 for(let i=0;i<14;i++)addProduct(sql,'p'+String(i).padStart(2,'0'),'published',i===0?'square':'cooling-towers');
 const a=await(await request('/api/products?category=cooling-towers')).json();
 const b=await(await request('/api/products?category=cooling-towers&page=2')).json();
 assert.equal(a.items.length,12);assert.equal(b.items.length,2);assert.equal(a.total,14);
 assert.equal(new Set([...a.items,...b.items].map(p=>p.id)).size,14);
 assert.equal((await(await request('/api/products?category=square')).json()).total,1);
 for(const q of ['%', '_', "' OR 1=1 --"])assert.equal((await(await request('/api/products?q='+encodeURIComponent(q))).json()).total,0);
 for(const query of ['page=0','page=-1','page=abc','pageSize=51','q='+'a'.repeat(101)])assert.equal((await request('/api/products?'+query)).status,400);
 sql.close();
});
test('public model selection, duplicate names, empty specifications versus zero and parent hiding',async()=>{
 const {sql,request}=setup();addProduct(sql);addModel(sql,'retired','discontinued');addModel(sql,'active');addModel(sql,'hidden','available','hidden');addModel(sql,'empty','available','published','');
 assert.throws(()=>sql.exec("INSERT INTO product_models(id,product_id,name) VALUES('duplicate','public','active')"));
 const data=await(await request('/api/products/public')).json();
 assert.deepEqual(data.models.map(m=>m.id),['active','retired']);assert.equal(data.models[0].specifications[0].value_text,'0');
 sql.exec("UPDATE products SET publication_status='hidden' WHERE id='public'");
 assert.equal((await request('/api/products/public')).status,404);sql.close();
});
test('product HTML escapes stored text and shows models within product detail only',async()=>{
 const {sql,request}=setup();addProduct(sql);addModel(sql,'active');
 sql.exec(`UPDATE products SET name='<script>alert(1)</script>',description='<img src=x onerror=alert(1)>'`);
 const response=await request('/products/public');const html=await response.text();
 assert.equal(response.status,200);assert.ok(html.includes('&lt;script&gt;'));assert.equal(html.includes('<script>'),false);
 assert.ok(html.includes('<table>'));assert.ok(html.includes('model=active'));assert.ok(html.includes('product=public'));
 assert.equal((await request('/products/public/models/active')).status,404);sql.close();
});
test('image serving checks current public parent every time, denies private file reuse',async()=>{
 const {sql,request}=setup();addProduct(sql);
 let response=await request('/api/product-images/image-public');assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'image/png');assert.equal(response.headers.get('Cache-Control'),'no-store');
 sql.exec("UPDATE files SET purpose='private' WHERE id='image-public'");assert.equal((await request('/api/product-images/image-public')).status,404);
 sql.exec("UPDATE files SET purpose='public_image' WHERE id='image-public';UPDATE products SET publication_status='hidden'");assert.equal((await request('/api/product-images/image-public')).status,404);sql.close();
});
test('all 12 static pages and six menus render, with accessible mobile menu and no data entry',async()=>{
 const {sql,request}=setup();assert.equal(staticPages.length,12);assert.equal(menu.length,6);
 for(const page of staticPages) {
  const response=await request(page.path);const html=await response.text();
  assert.equal(response.status,200);assert.ok(html.includes(page.title));assert.ok(html.includes('모바일 주 메뉴'));assert.ok(html.includes('본문 바로가기'));
  assert.equal(html.includes('type="email"'),false);
 }
 for(const path of ['/','/products','/projects','/resources','/notices','/inquiries'])assert.equal((await request(path)).status,200);
 assert.equal((await request('/missing')).status,404);assert.equal((await request('/products','POST')).status,405);
 assert.equal(await(await request('/products','HEAD')).text(),'');sql.close();
});
test('empty result and actual DB failure are distinguishable, never displayed as successful zero',async()=>{
 const {sql,env,request}=setup();const empty=await(await request('/products')).text();assert.ok(empty.includes('공개 제품을 준비 중입니다'));
 env.DB={prepare(){throw new Error('secret SQL details')}};
 const response=await request('/products');assert.equal(response.status,503);const html=await response.text();assert.ok(html.includes('다시 시도'));assert.equal(html.includes('secret SQL'),false);
 assert.equal((await request('/api/products')).status,503);sql.close();
});
