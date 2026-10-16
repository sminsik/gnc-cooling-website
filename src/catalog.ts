import {catalogProducts} from './product-data.ts';
export interface CatalogEnv { DB: D1Database; FILES: R2Bucket }
export interface Category { id: string; name: string; parent_id: string | null }
export interface Product {
 id: string; name: string; intro: string; description: string; category_id: string;
 category_name: string; image_id: string; image_alt: string;
}
export interface Model { id: string; name: string; description: string; availability: string; specifications: Specification[]; images?:{id:string;alt:string}[] }
interface Specification { name: string; value_text: string; unit: string }
export interface ProductDetail extends Product { models: Model[]; images: {id: string; alt: string; caption: string}[] }
export interface ProductList { items: Product[]; categories: Category[]; total: number; page: number; pageSize: number; q: string; category: string }
export class CatalogInputError extends Error {}
// An inactive ancestor also removes the descendant category from the public catalog.
const categoryTree = `WITH RECURSIVE active_categories(id) AS (
 SELECT id FROM product_categories WHERE active=1 AND parent_id IS NULL
 UNION SELECT c.id FROM product_categories c JOIN active_categories a ON c.parent_id=a.id WHERE c.active=1
)`;
const publicProduct = `FROM products p JOIN product_categories c ON c.id=p.category_id
 JOIN files f ON f.id=p.primary_file_id
 JOIN file_links l ON l.file_id=f.id AND l.product_id=p.id AND l.purpose='primary_image'
 WHERE p.publication_status='published' AND p.deleted_at IS NULL
 AND p.category_id IN(SELECT id FROM active_categories)
 AND length(trim(p.name))>0 AND length(trim(p.intro))>0 AND length(trim(p.description))>0
 AND f.status='ready' AND f.purpose='public_image' AND f.validated_at IS NOT NULL AND f.deleted_at IS NULL
 AND f.mime IN('image/jpeg','image/png','image/webp') AND length(trim(l.alt))>0`;
const fields = `p.id,p.name,p.intro,p.description,p.category_id,c.name AS category_name,f.id AS image_id,l.alt AS image_alt`;
export async function listProducts(db: D1Database, params: URLSearchParams): Promise<ProductList> {
 const q = (params.get('q') || '').trim();
 const category = params.get('category') || '';
 const pageText = params.get('page') || '1';
 const sizeText = params.get('pageSize') || '12';
 if(q.length>100 || category.length>100 || !/^[1-9]\d{0,5}$/.test(pageText) || !/^[1-9]\d?$/.test(sizeText) || Number(sizeText)>50)
  throw new CatalogInputError('검색어는 100자 이내, 페이지는 양수, 표시 개수는 1~50개로 입력해주세요.');
 const page=Number(pageText), pageSize=Number(sizeText);
 const categories=(await db.prepare(`${categoryTree} SELECT id,name,parent_id FROM product_categories WHERE id IN(SELECT id FROM active_categories) ORDER BY sort_order,id`).all<Category>()).results;
 let filter='', values: (string | number)[]=[];
 if(category) {
  filter+=` AND p.category_id IN (WITH RECURSIVE selected(id) AS (SELECT id FROM product_categories WHERE id=? UNION SELECT c.id FROM product_categories c JOIN selected s ON c.parent_id=s.id) SELECT id FROM selected)`;
  values.push(category);
 }
 if(q) { filter+=` AND p.name LIKE ? ESCAPE '\\'`; values.push('%'+q.replace(/[\\%_]/g,'\\$&')+'%'); }
 const count=await db.prepare(`${categoryTree} SELECT COUNT(*) AS total ${publicProduct}${filter}`).bind(...values).first<{total:number}>();
 const items=(await db.prepare(`${categoryTree} SELECT ${fields} ${publicProduct}${filter} ORDER BY p.sort_order,p.id LIMIT ? OFFSET ?`).bind(...values,pageSize,(page-1)*pageSize).all<Product>()).results;
 return {items,categories,total:count?.total || 0,page,pageSize,q,category};
}
export async function productDetail(db: D1Database,id: string): Promise<ProductDetail | null> {
 const local=catalogProducts.find(p=>p.id===id);
 if(local)return {id:local.id,name:local.name,intro:local.intro,description:local.description,category_id:local.category,category_name:local.categoryName,image_id:'',image_alt:local.name,models:local.models.map((row,i)=>({id:local.id+'-'+i,name:row[0],description:'',availability:'reference',specifications:row.slice(1).map((v,j)=>({name:local.headers[j+1],value_text:v,unit:''}))})),images:[]};
 const product=await db.prepare(`${categoryTree} SELECT ${fields} ${publicProduct} AND p.id=?`).bind(id).first<Product>();
 if(!product) return null;
 const raw=(await db.prepare(`SELECT id,name,description,availability FROM product_models m WHERE product_id=? AND publication_status='published' AND deleted_at IS NULL AND length(trim(name))>0 AND EXISTS(SELECT 1 FROM model_specifications s WHERE s.model_id=m.id AND length(trim(s.name))>0 AND length(trim(s.value_text))>0) ORDER BY CASE availability WHEN 'available' THEN 0 ELSE 1 END,sort_order,id`).bind(id).all<Omit<Model,'specifications'>>()).results;
 const models: Model[]=[];
 for(const model of raw) {
  const specifications=(await db.prepare(`SELECT name,value_text,unit FROM model_specifications WHERE model_id=? ORDER BY sort_order,id`).bind(model.id).all<Specification>()).results;
  const images=(await db.prepare("SELECT id,alt FROM files WHERE target_type='models' AND target_id=? AND attached=1 AND status='ready' AND validated_at IS NOT NULL AND deleted_at IS NULL AND purpose='public_image' AND length(trim(alt))>0 ORDER BY created_at,id").bind(model.id).all<{id:string;alt:string}>()).results;
  models.push({...model,specifications,images});
 }
 const images=(await db.prepare(`SELECT f.id,l.alt,l.caption FROM file_links l JOIN files f ON f.id=l.file_id WHERE l.product_id=? AND l.purpose='additional_image' AND f.purpose='public_image' AND f.status='ready' AND f.validated_at IS NOT NULL AND f.deleted_at IS NULL AND f.mime IN('image/jpeg','image/png','image/webp') AND length(trim(l.alt))>0 ORDER BY l.sort_order,f.id`).bind(id).all<{id:string;alt:string;caption:string}>()).results;
 return {...product,models,images};
}
export async function productImage(env: CatalogEnv,id: string): Promise<Response> {
 const file=await env.DB.prepare(`${categoryTree} SELECT photo.object_key,photo.mime FROM files photo
 WHERE photo.id=? AND photo.purpose='public_image' AND photo.status='ready'
 AND photo.validated_at IS NOT NULL AND photo.deleted_at IS NULL
 AND photo.mime IN('image/jpeg','image/png','image/webp')
 AND EXISTS(SELECT 1 ${publicProduct}
 AND EXISTS(SELECT 1 FROM file_links image_link WHERE image_link.product_id=p.id
 AND image_link.file_id=photo.id AND length(trim(image_link.alt))>0))`).bind(id).first<{object_key:string;mime:string}>();
 if(!file) return Response.json({error:'제공할 수 없는 이미지입니다.'},{status:404,headers:{'Cache-Control':'no-store'}});
 const object=await env.FILES.get(file.object_key);
 if(!object) return Response.json({error:'제공할 수 없는 이미지입니다.'},{status:404,headers:{'Cache-Control':'no-store'}});
 return new Response(object.body,{headers:{'Content-Type':file.mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}

// Reuse the complete public predicate: home must not expose drafts or unsafe images.
export async function featuredProducts(db:D1Database):Promise<Product[]>{
 return (await db.prepare(`${categoryTree} SELECT ${fields} ${publicProduct} AND p.featured=1 ORDER BY p.featured_order,p.id LIMIT 3`).all<Product>()).results;
}
