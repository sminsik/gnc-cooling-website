import { StaffError, requirePermission, text, expectedVersion, requestId, claim, audit, executeMutation } from './staff-session.ts';
import type { StaffPrincipal } from './staff-session.ts';
export const contentTypes=['products','projects','resources','notices'] as const;
export type ContentType=typeof contentTypes[number];
export function isContentType(value:string):value is ContentType{return (contentTypes as readonly string[]).includes(value);}
export async function contentRows(db:D1Database,type:ContentType,params=new URLSearchParams()) {
 const q=(params.get('q')||'').trim(),status=params.get('status')||'',page=Number(params.get('page')||1),deleted=params.get('deleted')==='1';
 if(q.length>100||!Number.isSafeInteger(page)||page<1||page>100000||(status&&!['draft','published','hidden'].includes(status)))throw new StaffError(400,'검색 조건을 확인해주세요.');
 const filter=`deleted_at IS ${deleted?'NOT ':''}NULL AND ${type==='products'?'name':'title'} LIKE ? ESCAPE '\\'`+(status?' AND publication_status=?':'');
 const values:unknown[]=['%'+q.replace(/[\\%_]/g,'\\$&')+'%',...(status?[status]:[])];
 const total=await db.prepare(`SELECT COUNT(*) AS total FROM ${type} WHERE ${filter}`).bind(...values).first<{total:number}>();
 const items=(await db.prepare(`SELECT * FROM ${type} WHERE ${filter} ORDER BY updated_at DESC,id DESC LIMIT 20 OFFSET ?`).bind(...values,(page-1)*20).all<Record<string,unknown>>()).results;
 return {items,total:total?.total||0,page,q,status,deleted};
}
export async function contentRow(db:D1Database,type:ContentType,id:string){return db.prepare(`SELECT * FROM ${type} WHERE id=?`).bind(id).first<Record<string,unknown>>();}
function integer(input:Record<string,unknown>,key:string,fallback=0):number {
 const n=input[key]===undefined?fallback:Number(input[key]);if(!Number.isSafeInteger(n)||Math.abs(n)>100000)throw new StaffError(400,'표시 순서는 정수로 입력해주세요.');return n;
}
const yes=(value:unknown)=>value===true||value==='1'||value==='on';
const readyImage="status='ready' AND validated_at IS NOT NULL AND deleted_at IS NULL AND purpose='public_image' AND mime IN('image/jpeg','image/png','image/webp')";
const readyPdf="status='ready' AND validated_at IS NOT NULL AND deleted_at IS NULL AND mime='application/pdf'";
const categoryActive=`WITH RECURSIVE used(id) AS (SELECT id FROM product_categories WHERE active=1 AND parent_id IS NULL UNION SELECT c.id FROM product_categories c JOIN used a ON c.parent_id=a.id WHERE c.active=1) SELECT id FROM used`;
function valuesFor(type:ContentType,input:Record<string,unknown>):{fields:string[];values:unknown[];valid:string;validValues:unknown[]} {
 if(type==='products') {
  const name=text(input,'name',100,true),intro=text(input,'intro',300),description=text(input,'description',30000),category=text(input,'category_id',100,true);
  const file=text(input,'image_id',100),alt=text(input,'image_alt',300);
  return {fields:['name','intro','description','category_id','primary_file_id','featured','featured_order','sort_order'],values:[name,intro,description,category,file||null,yes(input.featured)?1:0,integer(input,'featured_order'),integer(input,'sort_order')],
   valid:`length(trim(?))>0 AND length(trim(?))>0 AND length(trim(?))>0 AND ? IN (${categoryActive}) AND EXISTS(SELECT 1 FROM files WHERE id=? AND purpose='public_image' AND status='ready' AND validated_at IS NOT NULL AND deleted_at IS NULL AND mime IN('image/jpeg','image/png','image/webp'))`,validValues:[intro,description,alt,category,file]};
 }
 const title=text(input,'title',150,true);
 if(type==='projects'&&input.approval_at&&!/^\d{4}-\d{2}-\d{2}$/.test(text(input,'approval_at',30)))throw new StaffError(400,'공개 확인일은 YYYY-MM-DD로 입력해주세요.');
 if(type==='notices')return {fields:['title','body','pinned'],values:[title,text(input,'body',30000),yes(input.pinned)?1:0],valid:'length(trim(?))>0',validValues:[text(input,'body',30000)]};
 if(type==='projects')return {fields:['title','work_type','description','approval_by','approval_at','primary_file_id'],values:[title,text(input,'work_type',100,true),text(input,'description',30000),text(input,'approval_by',100),text(input,'approval_at',30)||null,text(input,'image_id',100)||null],valid:`length(trim(?))>0 AND length(trim(?))>0 AND ?<>'' AND EXISTS(SELECT 1 FROM files WHERE id=? AND ${readyImage})`,validValues:[text(input,'description',30000),text(input,'approval_by',100),text(input,'approval_at',30),text(input,'image_id',100)]};
 return {fields:['title','category','description','file_id'],values:[title,text(input,'category',100,true),text(input,'description',30000),text(input,'file_id',100)||null],valid:`length(trim(?))>0 AND EXISTS(SELECT 1 FROM files WHERE id=? AND ${readyPdf})`,validValues:[text(input,'description',30000),text(input,'file_id',100)]};
}
export async function saveContent(db:D1Database,staff:StaffPrincipal,type:ContentType,id:string|null,input:Record<string,unknown>):Promise<string> {
 requirePermission(staff,'content');const data=valuesFor(type,input),operation=requestId(input),target=id||crypto.randomUUID();
 let condition='1',params:unknown[]=[];
 if(id){condition=`EXISTS(SELECT 1 FROM ${type} WHERE id=? AND version=? AND deleted_at IS NULL AND (publication_status<>'published' OR (${data.valid})))`;params=[id,expectedVersion(input),...data.validValues];}
 if(type==='products') {
  condition+=` AND EXISTS(SELECT 1 FROM product_categories WHERE id=?) AND (?='' OR EXISTS(SELECT 1 FROM files WHERE id=? AND purpose='public_image' AND status='ready' AND validated_at IS NOT NULL AND deleted_at IS NULL AND mime IN('image/jpeg','image/png','image/webp'))) AND (?='' OR length(trim(?))>0) AND (?='' OR EXISTS(SELECT 1 FROM files WHERE id=? AND (target_type IS NULL OR (target_type='products' AND target_id=?))))`;
  const file=text(input,'image_id',100);params.push(text(input,'category_id',100,true),file,file,file,text(input,'image_alt',300),file,file,target);
 }
 if(type==='projects'||type==='resources'){
  const field=type==='projects'?'image_id':'file_id',file=text(input,field,100),validFile=type==='projects'?readyImage:readyPdf;
  condition+=` AND (?='' OR EXISTS(SELECT 1 FROM files WHERE id=? AND target_type=? AND target_id=? AND ${validFile}))`;
  params.push(file,file,type,target);
 }
 const statements=[claim(db,staff,'content',operation,type,target,condition,params)];
 if(id)statements.push(db.prepare(`UPDATE ${type} SET ${data.fields.map(f=>f+'=?').join(',')},version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND EXISTS(SELECT 1 FROM operation_claims WHERE id=?)`).bind(...data.values,target,operation));
 else statements.push(db.prepare(`INSERT INTO ${type}(id,${data.fields.join(',')}) SELECT ?,${data.fields.map(()=>'?').join(',')} WHERE EXISTS(SELECT 1 FROM operation_claims WHERE id=?)`).bind(target,...data.values,operation));
 if(type==='products') {
  statements.push(db.prepare(`DELETE FROM file_links WHERE product_id=? AND purpose='primary_image' AND EXISTS(SELECT 1 FROM operation_claims WHERE id=?)`).bind(target,operation));
  const file=text(input,'image_id',100);
  if(file)statements.push(db.prepare(`INSERT INTO file_links(file_id,product_id,purpose,alt) SELECT ?,?,'primary_image',? WHERE EXISTS(SELECT 1 FROM operation_claims WHERE id=?) ON CONFLICT(file_id,product_id) DO UPDATE SET purpose='primary_image',alt=excluded.alt`).bind(file,target,text(input,'image_alt',300),operation));
 }
 if(type==='resources')statements.push(db.prepare("UPDATE files SET attached=CASE WHEN id=? THEN 1 ELSE 0 END WHERE target_type='resources' AND target_id=? AND status='ready' AND EXISTS(SELECT 1 FROM operation_claims WHERE id=?)").bind(text(input,'file_id',100),target,operation));
 else statements.push(db.prepare("UPDATE files SET attached=1 WHERE target_type=? AND target_id=? AND status='ready' AND deleted_at IS NULL AND EXISTS(SELECT 1 FROM operation_claims WHERE id=?)").bind(type,target,operation));
 if(type==='products')statements.push(db.prepare("INSERT INTO file_links(file_id,product_id,purpose,alt) SELECT id,target_id,'additional_image',alt FROM files WHERE target_type='products' AND target_id=? AND status='ready' AND attached=1 AND deleted_at IS NULL AND id<>COALESCE(?, '') AND EXISTS(SELECT 1 FROM operation_claims WHERE id=?) ON CONFLICT(file_id,product_id) DO NOTHING").bind(target,text(input,'image_id',100),operation));
 statements.push(audit(db,operation,id?'update':'create'));await executeMutation(db,statements);return target;
}
export async function changePublication(db:D1Database,staff:StaffPrincipal,type:ContentType,id:string,input:Record<string,unknown>):Promise<void> {
 requirePermission(staff,'content');const state=text(input,'publication_status',20,true);
 if(!['published','hidden'].includes(state))throw new StaffError(400,'공개 상태를 확인해주세요.');

 let valid='1';
 if(state==='published'&&type==='products')valid=`length(trim(name))>0 AND length(trim(intro))>0 AND length(trim(description))>0 AND category_id IN(${categoryActive}) AND EXISTS(SELECT 1 FROM files f JOIN file_links l ON l.file_id=f.id WHERE l.product_id=products.id AND l.purpose='primary_image' AND f.id=products.primary_file_id AND length(trim(l.alt))>0 AND f.purpose='public_image' AND f.status='ready' AND f.validated_at IS NOT NULL AND f.deleted_at IS NULL AND f.mime IN('image/jpeg','image/png','image/webp'))`;
 if(state==='published'&&type==='projects')valid=`length(trim(title))>0 AND length(trim(work_type))>0 AND length(trim(description))>0 AND length(trim(approval_by))>0 AND approval_at IS NOT NULL AND EXISTS(SELECT 1 FROM files f WHERE f.id=projects.primary_file_id AND f.target_type='projects' AND f.target_id=projects.id AND length(trim(f.alt))>0 AND ${readyImage})`;
 if(state==='published'&&type==='resources')valid=`length(trim(title))>0 AND length(trim(category))>0 AND length(trim(description))>0 AND EXISTS(SELECT 1 FROM files f WHERE f.id=resources.file_id AND f.target_type='resources' AND f.target_id=resources.id AND ${readyPdf})`;
 if(state==='published'&&type==='notices')valid='length(trim(title))>0 AND length(trim(body))>0';
 const operation=requestId(input),dateField=type==='notices'?'posted_at':'first_published_at';
 await executeMutation(db,[claim(db,staff,'content',operation,type,id,`EXISTS(SELECT 1 FROM ${type} WHERE id=? AND version=? AND deleted_at IS NULL AND (${valid}))`,[id,expectedVersion(input)]),
 db.prepare(`UPDATE ${type} SET publication_status=?,${dateField}=CASE WHEN ?='published' THEN COALESCE(${dateField},strftime('%Y-%m-%dT%H:%M:%fZ','now')) ELSE ${dateField} END,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND EXISTS(SELECT 1 FROM operation_claims WHERE id=?)`).bind(state,state,id,operation),audit(db,operation,state)]);
}
export async function deleteRestore(db:D1Database,staff:StaffPrincipal,type:ContentType,id:string,restore:boolean,input:Record<string,unknown>):Promise<void> {
 requirePermission(staff,'delete_restore');const operation=requestId(input),reason=text(input,'reason',1000,true);
 await executeMutation(db,[claim(db,staff,'delete_restore',operation,type,id,`EXISTS(SELECT 1 FROM ${type} WHERE id=? AND version=? AND deleted_at IS ${restore?'NOT ':''}NULL)`,[id,expectedVersion(input)]),
 db.prepare(`UPDATE ${type} SET deleted_at=${restore?'NULL':'CURRENT_TIMESTAMP'},publication_status='hidden',version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND EXISTS(SELECT 1 FROM operation_claims WHERE id=?)`).bind(id,operation),audit(db,operation,restore?'restore':'delete',reason)]);
}
export async function saveModel(db:D1Database,staff:StaffPrincipal,productId:string,id:string|null,input:Record<string,unknown>):Promise<string> {
 requirePermission(staff,'content');const operation=requestId(input),target=id||crypto.randomUUID();
 const name=text(input,'name',100,true),description=text(input,'description',30000),availability=text(input,'availability',20)||'available';
 if(!['available','discontinued'].includes(availability))throw new StaffError(400,'취급 상태를 확인해주세요.');
 if(!Array.isArray(input.specifications)||input.specifications.length>50)throw new StaffError(400,'사양 항목을 확인해주세요.');
 const specs=input.specifications.map(raw=>{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new StaffError(400,'사양 항목을 확인해주세요.');
  return {name:text(raw,'name',100,true),value:text(raw,'value',200),unit:text(raw,'unit',30)};
 });
 let condition=`EXISTS(SELECT 1 FROM products WHERE id=? AND deleted_at IS NULL)`,params:unknown[]=[productId];
 if(id){condition+=` AND EXISTS(SELECT 1 FROM product_models WHERE id=? AND product_id=? AND version=? AND deleted_at IS NULL AND (publication_status<>'published' OR ?=1))`;params.push(id,productId,expectedVersion(input),specs.some(s=>s.value.trim())?1:0);}
 const statements=[claim(db,staff,'content',operation,'models',target,condition,params)];
 if(id){statements.push(db.prepare(`UPDATE product_models SET name=?,description=?,availability=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND EXISTS(SELECT 1 FROM operation_claims WHERE id=?)`).bind(name,description,availability,target,operation));statements.push(db.prepare('DELETE FROM model_specifications WHERE model_id=? AND EXISTS(SELECT 1 FROM operation_claims WHERE id=?)').bind(target,operation));}
 else statements.push(db.prepare(`INSERT INTO product_models(id,product_id,name,description,availability) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM operation_claims WHERE id=?)`).bind(target,productId,name,description,availability,operation));
 for(const spec of specs)statements.push(db.prepare(`INSERT INTO model_specifications(id,model_id,name,value_text,unit,sort_order) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM operation_claims WHERE id=?)`).bind(crypto.randomUUID(),target,spec.name,spec.value,spec.unit,statements.length,operation));
 statements.push(db.prepare("UPDATE files SET attached=1 WHERE target_type='models' AND target_id=? AND status='ready' AND deleted_at IS NULL AND EXISTS(SELECT 1 FROM operation_claims WHERE id=?)").bind(target,operation));
 statements.push(audit(db,operation,id?'update':'create'));await executeMutation(db,statements);return target;
}
export async function modelAction(db:D1Database,staff:StaffPrincipal,product:string,id:string,action:string,input:Record<string,unknown>):Promise<void> {
 const permission=action==='delete'||action==='restore'?'delete_restore':'content';requirePermission(staff,permission);
 const operation=requestId(input),state=text(input,'publication_status',20);
 if(action==='publication'&&!['published','hidden'].includes(state))throw new StaffError(400,'공개 상태를 확인해주세요.');
 let condition=`EXISTS(SELECT 1 FROM product_models m WHERE m.id=? AND m.product_id=? AND m.version=? AND m.deleted_at IS ${action==='restore'?'NOT ':''}NULL)`;
 if(action==='publication'&&state==='published')condition=`EXISTS(SELECT 1 FROM product_models m WHERE m.id=? AND m.product_id=? AND m.version=? AND m.deleted_at IS NULL AND EXISTS(SELECT 1 FROM products WHERE id=m.product_id AND publication_status='published' AND deleted_at IS NULL) AND EXISTS(SELECT 1 FROM model_specifications WHERE model_id=m.id AND length(trim(name))>0 AND length(trim(value_text))>0))`;
 const reason=permission==='delete_restore'?text(input,'reason',1000,true):'';
 const updates=action==='publication'?"publication_status=?,first_published_at=CASE WHEN ?='published' THEN COALESCE(first_published_at,CURRENT_TIMESTAMP) ELSE first_published_at END":`deleted_at=${action==='restore'?'NULL':'CURRENT_TIMESTAMP'},publication_status='hidden'`;
 const values=action==='publication'?[state,state]:[];
 await executeMutation(db,[claim(db,staff,permission,operation,'models',id,condition,[id,product,expectedVersion(input)]),db.prepare(`UPDATE product_models SET ${updates},version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND EXISTS(SELECT 1 FROM operation_claims WHERE id=?)`).bind(...values,id,operation),audit(db,operation,action,reason)]);
}
