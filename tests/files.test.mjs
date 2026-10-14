import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './helpers/staff-fixture.mjs';
import worker from '../src/index.ts';
import {processFiles,expireUploads,cleanTemporaryFiles} from '../src/file-processing.ts';
const png=Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0,1,2,3,4]);
const pdf=new TextEncoder().encode('%PDF-1.7\nfixture test only\n');
async function fixture(){const f=setup();await f.staff('c',['content_manager']);await f.staff('i',['inquiry_manager']);const objects=new Map();f.env.FILES={async put(key,body){const data=new Uint8Array(await new Response(body).arrayBuffer());objects.set(key,data);return {size:data.length}},async get(key){const data=objects.get(key);return data?{body:new Response(data).body}:null},async delete(key){objects.delete(key)},async list(){return {objects:[]}}};return {...f,objects};}
async function create(f,type='projects'){const payload=type==='projects'?{title:'시험 사례',work_type:'냉각탑',description:'설명',approval_by:'시험 확인',approval_at:'2026-10-11'}:type==='resources'?{title:'시험 자료',category:'카탈로그',description:'설명'}:type==='products'?{name:'시험 제품',intro:'소개',description:'설명',category_id:'cooling-towers'}:{title:'시험 공지',body:'본문'};const r=await f.request('/api/admin/'+type,'c','POST',payload);assert.equal(r.status,201);return (await r.json()).id;}
async function permit(f,id,type='projects',bytes=png){const r=await f.request(`/api/admin/${type}/${id}/uploads`,'c','POST',{expectedVersion:1,name:bytes===pdf?'test.pdf':'test.png',mime:bytes===pdf?'application/pdf':'image/png',size:bytes.length,alt:'시험 사진'});assert.equal(r.status,201,await r.clone().text());return r.json();}
async function upload(f,p,bytes=png,extra={}){return worker.fetch(new Request(f.env.APP_ORIGIN+p.uploadUrl,{method:'PUT',headers:{Cookie:f.sessions.c.cookie,Origin:f.env.APP_ORIGIN,'X-CSRF-Token':f.sessions.c.csrf,'X-Upload-Token':p.uploadToken,...extra},body:bytes}),f.env);}
function scanner(f,mode='clean'){f.env.FILE_SCANNER={async fetch(_url,init){const data=await new Response(init.body).arrayBuffer();if(mode==='blocked')return new Response(null,{status:422});const mime=init.headers['Content-Type'];return new Response(data,{headers:{'Content-Type':mime,'Content-Length':String(data.byteLength),'X-Scan-Contract':'gnc-content-v1','X-Structure-Result':'pass','X-Malware-Result':mode==='incomplete'?'':'clean','X-Scan-Engine':'mock-test-only','X-Image-Sanitized':'true','X-Image-Width':'2','X-Image-Height':'2','X-Pdf-Safe':'true'}})}};}
test('streamed upload hashes permit, checks CSRF/size/signature, denies replay and all unvalidated downloads',async()=>{
 const f=await fixture(),id=await create(f),p=await permit(f,id);assert.notEqual(f.sql.prepare('SELECT token_hash FROM upload_permits').get().token_hash,p.uploadToken);
 assert.equal((await upload(f,p,png,{'X-CSRF-Token':'wrong'})).status,403);assert.equal((await upload(f,p)).status,200);assert.equal((await upload(f,p)).status,409);
 assert.equal((await f.request('/api/admin/files/'+p.id,'c')).status,404);assert.equal((await f.request('/api/content-files/'+p.id)).status,404);await processFiles(f.env);assert.equal(f.sql.prepare('SELECT status FROM files WHERE id=?').get(p.id).status,'validating');
 const bad=await permit(f,id);assert.equal((await upload(f,bad,new Uint8Array(png.length))).status,400);assert.equal(f.sql.prepare('SELECT status FROM files WHERE id=?').get(bad.id).status,'blocked');
 const large=await permit(f,id);assert.equal((await upload(f,large,new Uint8Array(100))).status,413);f.sql.close();
});
test('target roles, reserved count/total, permit expiry and lost role are enforced before storage',async()=>{
 const f=await fixture(),id=await create(f,'notices');assert.equal((await f.request(`/api/admin/notices/${id}/uploads`,'i','POST',{})).status,403);
 for(let i=0;i<5;i++)await permit(f,id,'notices');const sixth=await f.request(`/api/admin/notices/${id}/uploads`,'c','POST',{expectedVersion:1,name:'x.png',mime:'image/png',size:16,alt:'x'});assert.equal(sixth.status,409);
 const other=await create(f),p=await permit(f,other);f.sql.prepare('UPDATE upload_permits SET expires_at=0 WHERE file_id=?').run(p.id);assert.equal((await upload(f,p)).status,409);
 const next=await permit(f,other);f.sql.prepare("DELETE FROM staff_roles WHERE staff_id='c'").run();assert.equal((await upload(f,next)).status,403);assert.equal(f.objects.size,0);f.sql.close();
});
test('trusted scanner creates new safe object, case publication requires approval+representative, hide blocks files',async()=>{
 const f=await fixture(),id=await create(f),p=await permit(f,id);await upload(f,p);scanner(f);await Promise.all([processFiles(f.env),processFiles(f.env)]);
 const file=f.sql.prepare('SELECT * FROM files WHERE id=?').get(p.id);assert.equal(file.status,'ready');assert.notEqual(file.object_key,file.source_key);assert.equal(f.sql.prepare('SELECT attempts FROM file_jobs').get().attempts,1);
 assert.equal((await f.request('/api/admin/files/'+p.id,'c')).status,200);assert.equal((await f.request('/api/admin/files/'+p.id,'i')).status,403);
 assert.equal((await f.request(`/api/admin/projects/${id}/publication`,'c','POST',{expectedVersion:1,publication_status:'published'})).status,409);
 const saved=await f.request('/api/admin/projects/'+id,'c','PATCH',{expectedVersion:1,title:'사례',work_type:'냉각',description:'설명',approval_by:'확인',approval_at:'2026-10-11',image_id:p.id});assert.equal(saved.status,200,await saved.clone().text());
 assert.equal((await f.request(`/api/admin/projects/${id}/publication`,'c','POST',{expectedVersion:2,publication_status:'published'})).status,200);
 assert.equal((await f.request('/projects/'+id)).status,200);assert.equal((await f.request('/api/content-files/'+p.id)).status,200);
 assert.equal((await f.request('/api/admin/files/'+p.id+'/remove','c','POST',{expectedVersion:2})).status,409);
 await f.request(`/api/admin/projects/${id}/publication`,'c','POST',{expectedVersion:3,publication_status:'hidden'});assert.equal((await f.request('/api/content-files/'+p.id)).status,404);assert.equal((await f.request('/projects/'+id)).status,404);f.sql.close();
});
test('PDF replacement stops old public download while retaining original, cross-target file selection rejected',async()=>{
 const f=await fixture(),id=await create(f,'resources'),p=await permit(f,id,'resources',pdf);await upload(f,p,pdf);scanner(f);await processFiles(f.env);
 const save=(file,version)=>f.request('/api/admin/resources/'+id,'c','PATCH',{expectedVersion:version,title:'자료',category:'카탈로그',description:'설명',file_id:file});assert.equal((await save(p.id,1)).status,200);await f.request(`/api/admin/resources/${id}/publication`,'c','POST',{expectedVersion:2,publication_status:'published'});
 const old=await f.request('/api/content-files/'+p.id);assert.equal(old.status,200);assert.match(old.headers.get('Content-Disposition'),/^attachment/);
 const response=await f.request(`/api/admin/resources/${id}/uploads`,'c','POST',{expectedVersion:3,name:'new.pdf',mime:'application/pdf',size:pdf.length});assert.equal(response.status,201);const next=await response.json();await upload(f,next,pdf);await processFiles(f.env);assert.equal((await save(next.id,3)).status,200);assert.equal((await f.request('/api/content-files/'+p.id)).status,404);assert.equal((await f.request('/api/content-files/'+next.id)).status,200);
 const other=await create(f,'resources');assert.equal((await f.request('/api/admin/resources/'+other,'c','PATCH',{expectedVersion:1,title:'다른 자료',category:'자료',description:'설명',file_id:next.id})).status,409);assert.ok(f.objects.has(f.sql.prepare('SELECT source_key FROM files WHERE id=?').get(p.id).source_key));f.sql.close();
});
test('scanner failure retries 1/5/30 minutes then requires operations review; blocked files never become ready',async()=>{
 const f=await fixture(),id=await create(f),p=await permit(f,id);await upload(f,p);scanner(f,'incomplete');let now=Date.now();for(const delay of [60000,300000,1800000,1800000]){await processFiles(f.env,now);const job=f.sql.prepare('SELECT * FROM file_jobs').get();assert.equal(job.available_at,now+delay);now=job.available_at;}
 await processFiles(f.env,now);assert.equal(f.sql.prepare('SELECT attempts FROM file_jobs').get().attempts,4);assert.equal(f.sql.prepare('SELECT status FROM files').get().status,'validating');assert.match(f.sql.prepare('SELECT scan_reason FROM files').get().scan_reason,/운영 확인/);
 const p2=await permit(f,id);await upload(f,p2);scanner(f,'blocked');await processFiles(f.env);assert.equal(f.sql.prepare('SELECT status FROM files WHERE id=?').get(p2.id).status,'blocked');assert.equal((await f.request('/api/admin/files/'+p2.id,'c')).status,404);f.sql.close();
});
test('temporary expiry removes quarantine only, scanner-ready linked records retained',async()=>{
 const f=await fixture(),id=await create(f),p=await permit(f,id);await upload(f,p);f.sql.prepare('UPDATE files SET expires_at=0 WHERE id=?').run(p.id);await expireUploads(f.env);await cleanTemporaryFiles(f.env);assert.equal(f.objects.size,0);assert.equal(f.sql.prepare('SELECT status FROM files').get().status,'pending_deletion');f.sql.close();
});
test('scanner-ready notice attachment requires explicit save; revoked ready file immediately disappears',async()=>{
 const f=await fixture(),id=await create(f,'notices');await f.request(`/api/admin/notices/${id}/publication`,'c','POST',{expectedVersion:1,publication_status:'published'});
 const r=await f.request(`/api/admin/notices/${id}/uploads`,'c','POST',{expectedVersion:2,name:'test.png',mime:'image/png',size:png.length,alt:'사진'});const p=await r.json();await upload(f,p);scanner(f);await processFiles(f.env);
 assert.equal((await f.request('/api/content-files/'+p.id)).status,404);assert.equal((await(await f.request('/api/notices/'+id)).json()).files.length,0);
 await f.request('/api/admin/notices/'+id,'c','PATCH',{expectedVersion:2,title:'공지',body:'본문'});assert.equal((await f.request('/api/content-files/'+p.id)).status,200);
 f.sql.prepare("UPDATE files SET status='blocked' WHERE id=?").run(p.id);assert.equal((await f.request('/api/content-files/'+p.id)).status,404);assert.equal((await(await f.request('/api/notices/'+id)).json()).files.length,0);f.sql.close();
});
test('published product/model images respect parent category and content visibility',async()=>{
 const f=await fixture(),id=await create(f,'products'),p=await permit(f,id,'products');await upload(f,p);scanner(f);await processFiles(f.env);
 const saved=await f.request('/api/admin/products/'+id,'c','PATCH',{expectedVersion:1,name:'제품',intro:'소개',description:'설명',category_id:'cooling-towers',image_id:p.id,image_alt:'대표'});assert.equal(saved.status,200);
 assert.equal((await f.request(`/api/admin/products/${id}/publication`,'c','POST',{expectedVersion:2,publication_status:'published'})).status,200);assert.equal((await f.request('/api/content-files/'+p.id)).status,200);
 const model=(await(await f.request(`/api/admin/products/${id}/models`,'c','POST',{name:'모델',specifications:[{name:'값',value:'0',unit:''}]})).json()).id;
 const image=await permit(f,model,'models');await upload(f,image);await processFiles(f.env);assert.equal((await f.request('/api/content-files/'+image.id)).status,404);
 await f.request(`/api/admin/products/${id}/models/${model}`,'c','PATCH',{expectedVersion:1,name:'모델',specifications:[{name:'값',value:'0',unit:''}]});await f.request(`/api/admin/products/${id}/models/${model}/publication`,'c','POST',{expectedVersion:2,publication_status:'published'});assert.equal((await f.request('/api/content-files/'+image.id)).status,200);
 f.sql.prepare("UPDATE product_categories SET active=0 WHERE id='cooling-towers'").run();assert.equal((await f.request('/api/content-files/'+image.id)).status,404);assert.equal((await f.request('/api/content-files/'+p.id)).status,404);f.sql.close();
});
