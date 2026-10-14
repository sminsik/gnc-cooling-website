import {putChecked} from './content-files.ts';
import {text} from './staff-session.ts';
import {StaffError,hash,randomToken,rate,captcha} from './inquiry-security.ts';
import type {InquiryEnv} from './inquiry-security.ts';
import {ownInquiries} from './inquiry-service.ts';
export async function uploadGroup(env:InquiryEnv,owner:string,token:unknown,network:string){
 if(!env.FILE_SCANNER)throw new StaffError(503,'첨부 검사 서비스를 준비 중입니다. 첨부 없이 문의하거나 연결 후 다시 이용해주세요.');
 await rate(env,'upload-network:'+network,30,600000);await captcha(env,token,'inquiry-upload');
 const id=crypto.randomUUID(),now=Date.now();const stored=await env.DB.prepare('INSERT INTO customer_upload_groups(id,owner_hash,purpose,expires_at) SELECT ?,?,\'inquiry\',? WHERE EXISTS(SELECT 1 FROM inquiry_sessions WHERE token_hash=? AND expires_at>?)').bind(id,owner,now+1800000,owner,now).run();if(stored.meta.changes!==1)throw new StaffError(409,'문의 화면을 다시 열어주세요.');return {id};
}
export async function reserve(env:InquiryEnv,owner:string,group:string,input:Record<string,unknown>){
 const name=text(input,'name',200,true),mime=text(input,'mime',50,true),size=Number(input.size),mimes:Record<string,string>={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',pdf:'application/pdf'};
 if(/[\x00-\x1f\/\\]/.test(name)||mimes[name.split('.').pop()?.toLowerCase()||'']!==mime)throw new StaffError(400,'JPEG·PNG·WEBP·PDF만 선택해주세요.');
 if(!Number.isSafeInteger(size)||size<12||size>10*1024*1024)throw new StaffError(413,'파일당 10MB 이하로 선택해주세요.');
 const id=crypto.randomUUID(),token=randomToken(),now=Date.now(),key='customer-quarantine/'+crypto.randomUUID();
 const results=await env.DB.batch([
 env.DB.prepare(`INSERT INTO files(id,object_key,source_key,original_name,mime,size_bytes,purpose,target_type,target_id,expires_at) SELECT ?,?,?,?,?,?,'private','customer_upload',?,? WHERE EXISTS(SELECT 1 FROM customer_upload_groups g JOIN inquiry_sessions s ON s.token_hash=g.owner_hash WHERE g.id=? AND g.owner_hash=? AND g.expires_at>? AND s.expires_at>? AND g.inquiry_id IS NULL) AND (SELECT COUNT(*) FROM customer_upload_permits WHERE group_id=?)<5 AND (SELECT COALESCE(SUM(f.size_bytes),0) FROM files f JOIN customer_upload_permits p ON p.file_id=f.id WHERE p.group_id=?)+?<=?`).bind(id,key,key,name,mime,size,group,now+1800000,group,owner,now,now,group,group,size,30*1024*1024),
 env.DB.prepare('INSERT INTO customer_upload_permits SELECT ?,?,?,?,NULL WHERE EXISTS(SELECT 1 FROM files WHERE id=?)').bind(id,group,await hash(token),now+1800000,id)
 ]);if(results[0].meta.changes!==1)throw new StaffError(409,'첨부 묶음의 기한·개수·총 용량을 확인해주세요.');return {id,uploadToken:token};
}
export async function receive(request:Request,env:InquiryEnv,owner:string,id:string){
 const now=Date.now(),file=await env.DB.prepare(`SELECT f.* FROM files f JOIN customer_upload_permits p ON p.file_id=f.id JOIN customer_upload_groups g ON g.id=p.group_id WHERE f.id=? AND f.status='temporary' AND f.deleted_at IS NULL AND g.owner_hash=? AND g.inquiry_id IS NULL AND g.expires_at>? AND p.expires_at>? AND p.used_at IS NULL AND p.token_hash=?`).bind(id,owner,now,now,await hash(request.headers.get('X-Upload-Token')||'')).first<Record<string,unknown>>();
 if(!file||!request.body)throw new StaffError(409,'업로드 허가를 다시 준비해주세요.');
 const used=await env.DB.prepare(`UPDATE customer_upload_permits SET used_at=? WHERE file_id=? AND used_at IS NULL AND expires_at>? AND EXISTS(SELECT 1 FROM customer_upload_groups g JOIN inquiry_sessions s ON s.token_hash=g.owner_hash WHERE g.id=customer_upload_permits.group_id AND g.owner_hash=? AND g.inquiry_id IS NULL AND g.expires_at>? AND s.expires_at>?)`).bind(now,id,now,owner,now,now).run();if(used.meta.changes!==1)throw new StaffError(409,'이미 사용한 업로드입니다.');
 try{await putChecked(env.FILES,String(file.source_key),request.body,Number(file.size_bytes),String(file.mime));await env.DB.batch([env.DB.prepare("UPDATE files SET status='validating',scan_reason='검사 대기' WHERE id=? AND deleted_at IS NULL").bind(id),env.DB.prepare('INSERT INTO file_jobs(file_id,available_at) SELECT ?,? WHERE EXISTS(SELECT 1 FROM files WHERE id=? AND status=\'validating\')').bind(id,now,id)]);}catch{await env.FILES.delete(String(file.source_key));await env.DB.prepare("UPDATE files SET status='blocked',scan_reason='업로드 실패' WHERE id=?").bind(id).run();throw new StaffError(400,'파일 크기·내용을 확인하고 다시 선택해주세요.');}return {id,status:'validating'};
}
export async function groupStatus(env:InquiryEnv,owner:string,group:string){const row=await env.DB.prepare('SELECT id FROM customer_upload_groups WHERE id=? AND owner_hash=? AND expires_at>? AND inquiry_id IS NULL').bind(group,owner,Date.now()).first();if(!row)throw new StaffError(404,'첨부 묶음을 찾을 수 없습니다.');return (await env.DB.prepare('SELECT f.id,f.original_name name,f.status,f.scan_reason FROM files f JOIN customer_upload_permits p ON p.file_id=f.id WHERE p.group_id=? AND f.deleted_at IS NULL').bind(group).all()).results;}
export async function customerFile(request:Request,env:InquiryEnv,id:string){
 const {fileContext,privateFileResponse}=await import('./inquiry-staff-files.ts');const {file:f,inquiry}=await fileContext(env,id);if(f.status!=='ready'||!f.validated_at||!f.attached)throw new StaffError(404,'제공할 수 없는 첨부입니다.');await ownInquiries(request,env,inquiry);
 if(f.target_type==='inquiry_messages'&&!await env.DB.prepare("SELECT id FROM inquiry_messages WHERE id=? AND inquiry_id=? AND (kind='customer' OR (kind='reply' AND status='sent'))").bind(f.target_id,inquiry).first())throw new StaffError(404,'제공할 수 없는 첨부입니다.');
 if(f.target_type==='inquiry_quotes'&&!await env.DB.prepare("SELECT id FROM inquiry_quotes WHERE id=? AND inquiry_id=? AND status IN('sent','superseded') AND file_id=?").bind(f.target_id,inquiry,id).first())throw new StaffError(404,'제공할 수 없는 첨부입니다.');
 const object=await env.FILES.get(String(f.object_key));if(!object)throw new StaffError(404,'제공할 수 없는 첨부입니다.');if(f.target_type==='inquiry_quotes'&&request.method==='GET')await env.DB.prepare("INSERT INTO inquiry_events(id,inquiry_id,action,at) VALUES(?,?,'quote-file-provided',?)").bind(crypto.randomUUID(),inquiry,Date.now()).run();return privateFileResponse(object.body,String(f.mime),String(f.original_name));
}
