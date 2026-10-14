import {featuredProducts} from './catalog.ts';
import {publicProject,publicResource} from './content-public.ts';
import type {HomeContent} from './public-pages.ts';
// Initial editorial selection: populate only with company-approved public resource IDs.
// Never fill empty selections with arbitrary documents or private inquiry files.
export const homeResourceIds:readonly string[]=[];
export async function homeContent(db:D1Database,resourceIds:readonly string[]=homeResourceIds):Promise<HomeContent>{
 const selected=[...new Set(resourceIds)].slice(0,3);
 const [products,projects,resources,notices]=await Promise.all([
  featuredProducts(db),
  Promise.resolve().then(()=>db.prepare(`SELECT id,title,work_type,primary_file_id image_id,(SELECT alt FROM files WHERE id=projects.primary_file_id) image_alt FROM projects WHERE (${publicProject}) ORDER BY first_published_at DESC,id DESC LIMIT 10`).all<HomeContent['projects'][number]>()),
  Promise.resolve().then(()=>selected.length?db.prepare(`SELECT id,title,category,file_id FROM resources WHERE (${publicResource}) AND id IN(${selected.map(()=>'?').join(',')}) ORDER BY CASE id ${selected.map((_,i)=>'WHEN ? THEN '+i).join(' ')} END LIMIT 3`).bind(...selected,...selected).all<HomeContent['resources'][number]>():Promise.resolve({results:[] as HomeContent['resources']})),
  Promise.resolve().then(()=>db.prepare("SELECT id,title,posted_at,pinned FROM notices WHERE publication_status='published' AND deleted_at IS NULL ORDER BY pinned DESC,posted_at DESC,id DESC LIMIT 3").all<HomeContent['notices'][number]>()),
 ]);
 return {products,projects:projects.results,resources:resources.results,notices:notices.results};
}
