import {scannerVerdict} from './scanner-verdict.ts';
import type {FileEnv} from './content-files.ts';
import {putChecked} from './content-files.ts';
const delays=[60000,300000,1800000];
// Only a trusted internal scanner binding can attest decoding, sanitization and malware results.
// No public callback or staff API can set ready.
export async function processFiles(env:FileEnv,now=Date.now()){
 if(!env.FILE_SCANNER)return;
 const jobs=(await env.DB.prepare(`SELECT j.file_id,j.attempts,f.source_key,f.mime,f.size_bytes,f.target_type,f.target_id,f.alt FROM file_jobs j JOIN files f ON f.id=j.file_id WHERE j.completed_at IS NULL AND j.available_at<=? AND (j.lease_until IS NULL OR j.lease_until<?) AND j.attempts<4 AND f.status='validating' AND f.deleted_at IS NULL ORDER BY j.available_at LIMIT 3`).bind(now,now).all<Record<string,unknown>>()).results;
 for(const job of jobs){
  const token=crypto.randomUUID(),key='validated/'+crypto.randomUUID();
  const lease=await env.DB.prepare(`UPDATE file_jobs SET lease_token=?,lease_until=?,attempts=attempts+1 WHERE file_id=? AND completed_at IS NULL AND attempts=? AND (lease_until IS NULL OR lease_until<?)`).bind(token,now+120000,job.file_id,job.attempts,now).run();if(lease.meta.changes!==1)continue;
  try{
   const source=await env.FILES.get(String(job.source_key));if(!source)throw Error('source-unavailable');
   const result=await env.FILE_SCANNER.fetch('https://scanner.internal/v1/content',{method:'POST',headers:{'Content-Type':String(job.mime),'X-Scan-Contract':'gnc-content-v1'},body:source.body,signal:AbortSignal.timeout(60000)});
   if(result.status===422){await env.DB.batch([env.DB.prepare("UPDATE files SET status='blocked',scan_reason='파일 검사에서 제공 불가',version=version+1 WHERE id=? AND status='validating' AND EXISTS(SELECT 1 FROM file_jobs WHERE file_id=? AND lease_token=?)").bind(job.file_id,job.file_id,token),env.DB.prepare('UPDATE file_jobs SET completed_at=?,lease_until=NULL WHERE file_id=? AND lease_token=?').bind(now,job.file_id,token)]);continue;}
   const mime=String(job.mime),{size,engine}=scannerVerdict(result,mime,Number(job.size_bytes));
   await putChecked(env.FILES,key,result.body!,size,String(mime));
   const gate="EXISTS(SELECT 1 FROM file_jobs WHERE file_id=files.id AND lease_token=? AND lease_until>?)";
   const statements=[env.DB.prepare(`UPDATE files SET object_key=?,size_bytes=?,status='ready',validated_at=CURRENT_TIMESTAMP,scan_engine=?,scan_reason=NULL,expires_at=NULL,version=version+1 WHERE id=? AND status='validating' AND deleted_at IS NULL AND ${gate}`).bind(key,size,engine,job.file_id,token,Date.now())];
   statements.push(env.DB.prepare('UPDATE file_jobs SET completed_at=?,lease_until=NULL WHERE file_id=? AND lease_token=?').bind(now,job.file_id,token));
   const updated=await env.DB.batch(statements);if(updated[0].meta.changes!==1)await env.FILES.delete(key);
  }catch{
   await env.FILES.delete(key);
   const attempts=Number(job.attempts)+1;
   await env.DB.batch([env.DB.prepare(`UPDATE files SET scan_reason=?,version=version+1 WHERE id=? AND status='validating' AND EXISTS(SELECT 1 FROM file_jobs WHERE file_id=? AND lease_token=?)`).bind(attempts>=4?'검사 재시도 실패·운영 확인 필요':'검사 실패·자동 재시도 대기',job.file_id,job.file_id,token),env.DB.prepare('UPDATE file_jobs SET available_at=?,lease_until=NULL WHERE file_id=? AND lease_token=?').bind(now+(delays[attempts-1]||1800000),job.file_id,token)]);
  }
 }
}
// Expired, unused reservations only. Retain linked originals/deleted content for company retention review.
export async function expireUploads(env:FileEnv,now=Date.now()){
 await env.DB.prepare("INSERT OR IGNORE INTO file_cleanup_jobs(file_id,available_at) SELECT id,? FROM files WHERE expires_at<? AND status='pending_deletion' AND deleted_at IS NOT NULL AND attached=0").bind(now,now).run();
 const files=(await env.DB.prepare("SELECT id,source_key FROM files WHERE expires_at<? AND status IN('temporary','validating','blocked') AND deleted_at IS NULL AND attached=0 LIMIT 20").bind(now).all<{id:string;source_key:string}>()).results;
 for(const file of files){
  const marked=await env.DB.prepare("UPDATE files SET status='pending_deletion',deleted_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=? AND expires_at<? AND status IN('temporary','validating','blocked')").bind(file.id,now).run();
  if(marked.meta.changes===1)await env.DB.prepare('INSERT OR IGNORE INTO file_cleanup_jobs(file_id,available_at) VALUES(?,?)').bind(file.id,now).run();
 }
}

// R2 deletes are idempotent; retain the job until every immutable object key is removed.
export async function cleanTemporaryFiles(env:FileEnv,now=Date.now()){
 const jobs=(await env.DB.prepare(`SELECT j.file_id,j.attempts,f.source_key,f.object_key FROM file_cleanup_jobs j JOIN files f ON f.id=j.file_id WHERE j.completed_at IS NULL AND j.available_at<=? AND f.status='pending_deletion' AND f.deleted_at IS NOT NULL AND f.attached=0 AND NOT EXISTS(SELECT 1 FROM file_links l WHERE l.file_id=f.id) AND NOT EXISTS(SELECT 1 FROM products p WHERE p.primary_file_id=f.id) AND NOT EXISTS(SELECT 1 FROM inquiry_quotes q WHERE q.file_id=f.id) LIMIT 20`).bind(now).all<{file_id:string;attempts:number;source_key:string|null;object_key:string}>()).results;
 for(const job of jobs){
  try{
   for(const key of new Set([job.source_key,job.object_key].filter((key):key is string=>!!key)))await env.FILES.delete(key);
   await env.DB.prepare("UPDATE file_cleanup_jobs SET attempts=attempts+1,completed_at=?,last_result='removed' WHERE file_id=? AND completed_at IS NULL").bind(now,job.file_id).run();
  }catch{
   const delay=[60000,300000,1800000,7200000][Math.min(job.attempts,3)];
   await env.DB.prepare("UPDATE file_cleanup_jobs SET attempts=attempts+1,available_at=?,last_result='retry' WHERE file_id=? AND completed_at IS NULL").bind(now+delay,job.file_id).run();
  }
 }
}
