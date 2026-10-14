import {publicProject,publicResource} from './content-public.ts';
import {productDetail} from './catalog.ts';
import {StaffError,requirePermission,text,expectedVersion,requestId,claim,audit,executeMutation,randomToken,hash,checkOrigin,staffJson} from './staff-session.ts';
import type {StaffPrincipal,StaffEnv} from './staff-session.ts';
export interface FileEnv extends StaffEnv {FILES:R2Bucket;FILE_SCANNER?:Fetcher}
export const targetTables:Record<string,string>={products:'products',models:'product_models',projects:'projects',resources:'resources',notices:'notices'};
const imageMimes=['image/jpeg','image/png','image/webp'];
const MiB=1024*1024;
function limits(type:string){return type==='resources'?{count:1,total:20*MiB,perFile:20*MiB}:type==='notices'?{count:5,total:30*MiB,perFile:10*MiB}:{count:20,total:100*MiB,perFile:10*MiB};}
export async function fileRows(db:D1Database,type:string,id:string){return (await db.prepare(`SELECT id,original_name,mime,size_bytes,status,alt,version,scan_reason,attached FROM files WHERE target_type=? AND target_id=? AND deleted_at IS NULL ORDER BY created_at,id`).bind(type,id).all<Record<string,unknown>>()).results;}
export async function createPermit(env:FileEnv,staff:StaffPrincipal,type:string,target:string,input:Record<string,unknown>){
 requirePermission(staff,'content');const table=targetTables[type];if(!table)throw new StaffError(404,'등록 대상을 찾을 수 없습니다.');
 const name=text(input,'name',200,true),mime=text(input,'mime',50,true),alt=text(input,'alt',300),size=Number(input.size),limit=limits(type);
 const ext=name.split('.').pop()?.toLowerCase(),expected:Record<string,string>={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',pdf:'application/pdf'};
 if(expected[ext||'']!==mime||!(type==='resources'?mime==='application/pdf':type==='notices'?[...imageMimes,'application/pdf'].includes(mime):imageMimes.includes(mime)))throw new StaffError(400,'허용된 사진 또는 PDF 형식으로 선택해주세요.');
 if(!Number.isSafeInteger(size)||size<12||size>limit.perFile)throw new StaffError(413,'파일 용량 제한을 확인해주세요.');
 if(imageMimes.includes(mime)&&!alt.trim())throw new StaffError(400,'사진 대체 설명을 입력해주세요.');
 if(/[\x00-\x1f\/\\]/.test(name))throw new StaffError(400,'파일 이름을 확인해주세요.');
 const operation=requestId(input),id=crypto.randomUUID(),permit=crypto.randomUUID(),token=randomToken(),key='quarantine/'+crypto.randomUUID(),now=Date.now();
 const counted=type==='resources'?"status IN('temporary','validating')":"status<>'blocked'";
 const condition=`EXISTS(SELECT 1 FROM ${table} WHERE id=? AND version=? AND deleted_at IS NULL) AND (SELECT COUNT(*) FROM files WHERE owner_id=? AND created_at>datetime('now','-10 minutes'))<30 AND (SELECT COUNT(*) FROM files WHERE target_type=? AND target_id=? AND deleted_at IS NULL AND ${counted})<? AND (SELECT COALESCE(SUM(size_bytes),0) FROM files WHERE target_type=? AND target_id=? AND deleted_at IS NULL AND ${counted})+?<=?`;
 await executeMutation(env.DB,[claim(env.DB,staff,'content',operation,type,target,condition,[target,expectedVersion(input),staff.id,type,target,limit.count,type,target,size,limit.total]),
 env.DB.prepare(`INSERT INTO files(id,object_key,source_key,original_name,mime,size_bytes,purpose,owner_id,target_type,target_id,alt,expires_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM operation_claims WHERE id=?)`).bind(id,key,key,name,mime,size,imageMimes.includes(mime)?'public_image':'private',staff.id,type,target,alt,now+86400000,operation),
 env.DB.prepare(`INSERT INTO upload_permits(id,file_id,token_hash,owner_id,expires_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM operation_claims WHERE id=?)`).bind(permit,id,await hash(token),staff.id,now+1800000,operation),audit(env.DB,operation,'file-reserve')]);
 return {id,uploadUrl:'/api/admin/files/'+id+'/bytes',uploadToken:token,status:'temporary'};
}
// Stream to R2 while counting actual bytes; keep only a small signature prefix.
export function checkedStream(body:ReadableStream<Uint8Array>,size:number,mime:string){
 let bytes=0,prefix:number[]=[];
 return body.pipeThrough(new TransformStream<Uint8Array,Uint8Array>({transform(chunk,controller){bytes+=chunk.byteLength;if(bytes>size)throw new StaffError(413,'실제 파일 크기가 허용 범위를 초과했습니다.');if(prefix.length<12)prefix.push(...chunk.slice(0,12-prefix.length));controller.enqueue(chunk)},flush(){
 const p=Uint8Array.from(prefix),ascii=new TextDecoder().decode(p);
 const valid=mime==='image/jpeg'?p[0]===255&&p[1]===216&&p[2]===255:mime==='image/png'?p.slice(0,8).join(',')==='137,80,78,71,13,10,26,10':mime==='image/webp'?ascii.startsWith('RIFF')&&ascii.slice(8,12)==='WEBP':mime==='application/pdf'?ascii.startsWith('%PDF-'):false;
 if(bytes!==size||!valid)throw new StaffError(400,'파일 서명 또는 실제 크기가 선언과 다릅니다.');
 }}));
}
export async function receiveFile(request:Request,env:FileEnv,staff:StaffPrincipal,id:string){
 requirePermission(staff,'content');checkOrigin(request,env);if(request.headers.get('X-CSRF-Token')!==staff.csrf)throw new StaffError(403,'화면을 새로 열고 다시 시도해주세요.');
 const now=Date.now(),token=request.headers.get('X-Upload-Token')||'';
 const file=await env.DB.prepare(`SELECT f.* FROM files f JOIN upload_permits p ON p.file_id=f.id WHERE f.id=? AND f.owner_id=? AND f.status='temporary' AND f.deleted_at IS NULL AND p.used_at IS NULL AND p.expires_at>? AND p.token_hash=?`).bind(id,staff.id,now,await hash(token)).first<Record<string,unknown>>();
 if(!file||!request.body)throw new StaffError(409,'업로드 허가가 만료되었거나 이미 사용되었습니다.');
 const table=targetTables[String(file.target_type)];if(!table)throw new StaffError(404,'등록 대상을 찾을 수 없습니다.');
 const claimed=await env.DB.prepare(`UPDATE upload_permits SET used_at=? WHERE file_id=? AND used_at IS NULL AND expires_at>? AND EXISTS(SELECT 1 FROM staff s JOIN staff_sessions x ON x.staff_id=s.id WHERE s.id=? AND s.status='active' AND s.auth_version=x.auth_version AND x.token_hash=? AND x.revoked_at IS NULL AND x.expires_at>? AND x.last_seen_at>? AND EXISTS(SELECT 1 FROM staff_roles r WHERE r.staff_id=s.id AND r.role IN('content_manager','admin'))) AND EXISTS(SELECT 1 FROM ${table} WHERE id=? AND deleted_at IS NULL)`).bind(now,id,now,staff.id,staff.session_hash,now,now-1800000,file.target_id).run();
 if(claimed.meta.changes!==1)throw new StaffError(409,'현재 권한 또는 업로드 대상을 확인해주세요.');
 try {
  await putChecked(env.FILES,String(file.source_key),request.body,Number(file.size_bytes),String(file.mime));
  await env.DB.batch([env.DB.prepare(`UPDATE files SET status='validating',version=version+1,scan_reason='검사 서비스 연결 대기' WHERE id=? AND deleted_at IS NULL`).bind(id),env.DB.prepare('INSERT INTO file_jobs(file_id,available_at) VALUES(?,?)').bind(id,now)]);
 }catch(error){await env.DB.prepare("UPDATE files SET status='blocked',version=version+1,scan_reason='업로드 실패 또는 파일 형식 불일치' WHERE id=?").bind(id).run();await env.FILES.delete(String(file.source_key));if(error instanceof StaffError)throw error;throw new StaffError(400,'업로드하지 못했습니다. 파일을 다시 선택해주세요.');}
 return {id,status:'validating'};
}
export async function removeFile(env:FileEnv,staff:StaffPrincipal,id:string,input:Record<string,unknown>){
 requirePermission(staff,'content');const operation=requestId(input);
 // Selected primary/download files must first be replaced or their content hidden.
 const condition=`EXISTS(SELECT 1 FROM files WHERE id=? AND version=? AND deleted_at IS NULL AND target_type IN('products','projects','models','resources','notices')) AND NOT EXISTS(SELECT 1 FROM products WHERE primary_file_id=? AND publication_status='published' AND deleted_at IS NULL) AND NOT EXISTS(SELECT 1 FROM projects WHERE primary_file_id=? AND publication_status='published' AND deleted_at IS NULL) AND NOT EXISTS(SELECT 1 FROM resources WHERE file_id=? AND publication_status='published' AND deleted_at IS NULL)`;
 await executeMutation(env.DB,[claim(env.DB,staff,'content',operation,'files',id,condition,[id,expectedVersion(input),id,id,id]),env.DB.prepare("UPDATE files SET deleted_at=CURRENT_TIMESTAMP,status='pending_deletion',version=version+1 WHERE id=? AND EXISTS(SELECT 1 FROM operation_claims WHERE id=?)").bind(id,operation),audit(env.DB,operation,'file-remove')]);
}
export async function fileResponse(env:FileEnv,id:string,staff:StaffPrincipal|null):Promise<Response>{
 const file=await env.DB.prepare(`SELECT * FROM files WHERE id=? AND status='ready' AND (?=1 OR attached=1) AND validated_at IS NOT NULL AND deleted_at IS NULL AND target_type IS NOT NULL`).bind(id,staff?1:0).first<Record<string,unknown>>();
 if(!file)throw new StaffError(404,'제공할 수 없는 파일입니다.');
 const type=String(file.target_type),table=targetTables[type];if(!table)throw new StaffError(404,'제공할 수 없는 파일입니다.');
 let condition=staff?'1':"publication_status='published'";
 if(!staff&&type==='resources')condition+=' AND file_id=?';
 if(!staff&&type==='projects')condition=`(${publicProject})`;
 if(!staff&&type==='resources')condition=`(${publicResource}) AND file_id=?`;
 if(!staff&&type==='products'){const product=await productDetail(env.DB,String(file.target_id));if(!product)throw new StaffError(404,'제공할 수 없는 파일입니다.');}
 if(!staff&&type==='models'){const model=await env.DB.prepare('SELECT product_id FROM product_models WHERE id=?').bind(file.target_id).first<{product_id:string}>();const product=model?await productDetail(env.DB,model.product_id):null;if(!product?.models.some(m=>m.id===file.target_id))throw new StaffError(404,'제공할 수 없는 파일입니다.');}
 const target=await env.DB.prepare(`SELECT id FROM ${table} WHERE id=? AND deleted_at IS NULL AND (${condition})`).bind(file.target_id,...(!staff&&type==='resources'?[id]:[])).first();
 if(!target)throw new StaffError(404,'제공할 수 없는 파일입니다.');if(staff)requirePermission(staff,'content');
 const object=await env.FILES.get(String(file.object_key));if(!object)throw new StaffError(404,'제공할 수 없는 파일입니다.');
 const pdf=file.mime==='application/pdf';
 return new Response(object.body,{headers:{'Content-Type':String(file.mime),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; sandbox",'Content-Disposition':pdf?`attachment; filename="document.pdf"; filename*=UTF-8''${encodeURIComponent(String(file.original_name)).replace(/'/g,'%27')}`:'inline'}});
}

export async function putChecked(bucket:R2Bucket,key:string,body:ReadableStream<Uint8Array>,size:number,mime:string){
 const stream=checkedStream(body,size,mime);
 if(typeof FixedLengthStream==='undefined'){await bucket.put(key,stream,{httpMetadata:{contentType:mime}});return;}
 const fixed=new FixedLengthStream(size);
 await Promise.all([stream.pipeTo(fixed.writable),bucket.put(key,fixed.readable,{httpMetadata:{contentType:mime}})]);
}
