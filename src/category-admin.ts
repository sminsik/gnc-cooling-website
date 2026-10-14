import { StaffError, requirePermission, text, expectedVersion, requestId, claim, audit, executeMutation } from './staff-session.ts';
import type { StaffPrincipal } from './staff-session.ts';
export async function saveCategory(db:D1Database,staff:StaffPrincipal,id:string|null,input:Record<string,unknown>):Promise<string> {
 requirePermission(staff,'content');const operation=requestId(input),target=id||crypto.randomUUID(),name=text(input,'name',100,true),parent=text(input,'parent_id',100)||null;
 const order=Number(input.sort_order||0),active=input.active===true||input.active==='1'||input.active==='on';
 if(!Number.isSafeInteger(order)||Math.abs(order)>100000)throw new StaffError(400,'표시 순서를 확인해주세요.');
 let condition=`(? IS NULL OR EXISTS(SELECT 1 FROM product_categories WHERE id=?)) AND (? IS NULL OR ? NOT IN (WITH RECURSIVE descendants(id) AS (SELECT id FROM product_categories WHERE id=? UNION SELECT c.id FROM product_categories c JOIN descendants d ON c.parent_id=d.id) SELECT id FROM descendants))`;
 const values:unknown[]=[parent,parent,parent,parent,target];
 if(id){condition+=' AND EXISTS(SELECT 1 FROM product_categories WHERE id=? AND version=?)';values.push(id,expectedVersion(input));}
 if(!active||parent) {
  condition+=` AND NOT EXISTS(SELECT 1 FROM products WHERE publication_status='published' AND deleted_at IS NULL AND category_id IN (WITH RECURSIVE descendants(id) AS (SELECT id FROM product_categories WHERE id=? UNION SELECT c.id FROM product_categories c JOIN descendants d ON c.parent_id=d.id) SELECT id FROM descendants))`;values.push(target);
 }
 const statements=[claim(db,staff,'content',operation,'categories',target,condition,values)];
 if(id)statements.push(db.prepare('UPDATE product_categories SET name=?,parent_id=?,sort_order=?,active=?,version=version+1 WHERE id=? AND EXISTS(SELECT 1 FROM operation_claims WHERE id=?)').bind(name,parent,order,active?1:0,target,operation));
 else statements.push(db.prepare('INSERT INTO product_categories(id,name,parent_id,sort_order,active) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM operation_claims WHERE id=?)').bind(target,name,parent,order,active?1:0,operation));
 statements.push(audit(db,operation,id?'update':'create'));await executeMutation(db,statements);return target;
}
