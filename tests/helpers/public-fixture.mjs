import {setup} from './staff-fixture.mjs';
// Isolated memory data for public selection/browser checks, never real company content.
export function publicFixture(){
 const f=setup();
 function file(id,type,target,mime='image/png',status='ready'){
  f.sql.prepare("INSERT INTO files(id,object_key,original_name,mime,size_bytes,purpose,status,validated_at,target_type,target_id,alt,attached) VALUES(?,?,?, ?,20,?,?,CURRENT_TIMESTAMP,?,?,?,1)").run(id,'test-only/'+id,'test-only.png',mime,mime==='application/pdf'?'private':'public_image',status,type,target,'개발 시험용 이미지');return id;
 }
 function product(id,order=0,extra={}){
  const image=file('image-'+id,'products',id,'image/png',extra.fileStatus||'ready');
  f.sql.prepare("INSERT INTO products(id,category_id,name,intro,description,primary_file_id,publication_status,featured,featured_order) VALUES(?,'cooling-towers',?,?,?, ?,?,?,?)").run(id,'개발 시험 '+id,'가상 제품 소개','회사 실자료가 아닌 개발 시험 설명',image,extra.state||'published',extra.featured??1,order);
  f.sql.prepare("INSERT INTO file_links(file_id,product_id,purpose,alt) VALUES(?,?,'primary_image','개발 시험용 이미지')").run(image,id);
 }
 function project(id,at='2026-10-01',state='published'){
  const image=file('image-'+id,'projects',id);
  f.sql.prepare("INSERT INTO projects(id,title,work_type,description,approval_by,approval_at,primary_file_id,publication_status,first_published_at) VALUES(?,?,'가상 작업','개발 시험 설명','가상 승인','2026-10-01',?,?,?)").run(id,'개발 시험 '+id,image,state,at);
 }
 function resource(id,state='published'){
  const pdf=file('pdf-'+id,'resources',id,'application/pdf');
  f.sql.prepare("INSERT INTO resources(id,title,category,description,file_id,publication_status,first_published_at) VALUES(?,?,'시험 자료','개발 시험 설명',?,?,'2026-10-01')").run(id,'개발 시험 '+id,pdf,state);
 }
 function notice(id,at='2026-10-01',pinned=0,state='published'){
  f.sql.prepare('INSERT INTO notices(id,title,body,posted_at,pinned,publication_status) VALUES(?,?,?,?,?,?)').run(id,'개발 시험 '+id,'가상 공지',at,pinned,state);
 }
 return {...f,file,product,project,resource,notice};
}
