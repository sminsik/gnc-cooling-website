import {mailStatus} from './mail-status.ts';
import {decrypt,ready} from './inquiry-security.ts';
import type {InquiryEnv} from './inquiry-security.ts';
// Only acknowledged provider acceptance marks sent; timeouts pause automatic sending.
export async function processInquiryMail(env:InquiryEnv,now=Date.now()){
 if(!ready(env))return;
 await env.DB.prepare("UPDATE inquiry_mail_outbox SET unknown_at=?,lease_until=NULL WHERE sent_at IS NULL AND failed_at IS NULL AND unknown_at IS NULL AND lease_token IS NOT NULL AND lease_until<=?").bind(now,now).run();
 const rows=(await env.DB.prepare(`SELECT o.* FROM inquiry_mail_outbox o JOIN customer_verifications v ON v.token_hash=o.verification_hash WHERE o.sent_at IS NULL AND o.failed_at IS NULL AND o.unknown_at IS NULL AND o.available_at<=? AND o.lease_until IS NULL AND o.attempts<5 AND v.expires_at>? AND v.revoked_at IS NULL AND v.consumed_at IS NULL LIMIT 3`).bind(now,now).all<Record<string,unknown>>()).results;
 for(const row of rows){
  const lease=crypto.randomUUID(),claimed=await env.DB.prepare('UPDATE inquiry_mail_outbox SET lease_token=?,lease_until=?,attempts=attempts+1 WHERE id=? AND sent_at IS NULL AND failed_at IS NULL AND unknown_at IS NULL AND attempts=? AND lease_until IS NULL').bind(lease,now+120000,row.id,row.attempts).run();if(claimed.meta.changes!==1)continue;
  let payload:Awaited<ReturnType<typeof decrypt>>;
  try{payload=await decrypt(env,String(row.payload_cipher));if(payload.expiresAt<=Date.now())throw Error();}
  catch{await env.DB.prepare("UPDATE inquiry_mail_outbox SET failed_at=?,lease_until=NULL,lease_token=NULL,payload_cipher='' WHERE id=? AND lease_token=?").bind(now,row.id,lease).run();continue;}
  try{
   const response=await env.INQUIRY_MAILER!.fetch('https://mailer.internal/v1/send',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':String(row.id)},body:JSON.stringify(payload),signal:AbortSignal.timeout(30000)});
   const data=await response.json() as {accepted?:boolean;receipt?:string;definitive?:boolean};
   if(response.ok&&data.accepted===true&&typeof data.receipt==='string'&&data.receipt.trim()&&data.receipt.length<=200){
    await env.DB.prepare("UPDATE inquiry_mail_outbox SET sent_at=?,provider_receipt=?,lease_until=NULL,lease_token=NULL,payload_cipher='' WHERE id=? AND lease_token=? AND unknown_at IS NULL").bind(now,data.receipt,row.id,lease).run();
   }else if(!response.ok&&data.accepted===false&&data.definitive===true){
    const attempts=Number(row.attempts)+1,delay=[60000,300000,1800000,7200000][Math.min(attempts-1,3)];
    await env.DB.prepare('UPDATE inquiry_mail_outbox SET available_at=?,failed_at=?,lease_until=NULL,lease_token=NULL WHERE id=? AND lease_token=? AND unknown_at IS NULL').bind(now+delay,attempts>=5?now:null,row.id,lease).run();
   }else throw Error();
  }catch{await env.DB.prepare('UPDATE inquiry_mail_outbox SET unknown_at=?,lease_until=NULL WHERE id=? AND lease_token=?').bind(now,row.id,lease).run();}
 }
 await env.DB.prepare(`UPDATE inquiry_mail_outbox SET failed_at=?,payload_cipher='' WHERE sent_at IS NULL AND failed_at IS NULL AND unknown_at IS NULL AND verification_hash IN(SELECT token_hash FROM customer_verifications WHERE expires_at<=? OR revoked_at IS NOT NULL OR consumed_at IS NOT NULL) AND (lease_until IS NULL OR lease_until<=?)`).bind(now,now,now).run();
 await env.DB.prepare(`UPDATE inquiry_mail_outbox SET payload_cipher='' WHERE verification_hash IN(SELECT token_hash FROM customer_verifications WHERE expires_at<=? OR revoked_at IS NOT NULL OR consumed_at IS NOT NULL) AND (lease_until IS NULL OR lease_until<=?)`).bind(now,now).run();
}
export async function reconcileVerificationMail(env:InquiryEnv,now=Date.now()){
 if(!env.INQUIRY_MAIL_STATUS)return;
 const rows=(await env.DB.prepare('SELECT id,unknown_at,attempts FROM inquiry_mail_outbox WHERE unknown_at IS NOT NULL AND sent_at IS NULL AND available_at<=? LIMIT 3').bind(now).all<{id:string;unknown_at:number;attempts:number}>()).results;
 for(const row of rows){
  // Claim a read-only lookup window so cron does not hammer a provider.
  const claimed=await env.DB.prepare('UPDATE inquiry_mail_outbox SET available_at=? WHERE id=? AND unknown_at=? AND available_at<=?').bind(now+300000,row.id,row.unknown_at,now).run();if(claimed.meta.changes!==1)continue;
  const status=await mailStatus(env,row.id);
  if(status.state==='accepted')await env.DB.prepare("UPDATE inquiry_mail_outbox SET sent_at=?,provider_receipt=?,unknown_at=NULL,lease_token=NULL,lease_until=NULL,payload_cipher='' WHERE id=? AND unknown_at=?").bind(now,status.receipt,row.id,row.unknown_at).run();
  if(status.state==='rejected')await env.DB.prepare(`UPDATE inquiry_mail_outbox SET unknown_at=NULL,lease_token=NULL,lease_until=NULL,available_at=?,failed_at=CASE WHEN attempts>=5 OR NOT EXISTS(SELECT 1 FROM customer_verifications v WHERE v.token_hash=verification_hash AND v.expires_at>? AND v.revoked_at IS NULL AND v.consumed_at IS NULL) THEN ? ELSE failed_at END WHERE id=? AND unknown_at=?`).bind(now+60000,now,now,row.id,row.unknown_at).run();
 }
}
export async function cleanInquiryTransient(env:InquiryEnv,now=Date.now()){
 await env.DB.batch([env.DB.prepare('DELETE FROM inquiry_rates WHERE expires_at<?').bind(now),env.DB.prepare('DELETE FROM inquiry_sessions WHERE expires_at<?').bind(now),env.DB.prepare('DELETE FROM customer_sessions WHERE expires_at<?').bind(now),env.DB.prepare("UPDATE inquiry_mail_outbox SET failed_at=COALESCE(failed_at,?),payload_cipher='' WHERE sent_at IS NULL AND verification_hash IN(SELECT token_hash FROM customer_verifications WHERE expires_at<=? OR revoked_at IS NOT NULL OR consumed_at IS NOT NULL) AND (lease_until IS NULL OR lease_until<?)").bind(now,now,now),env.DB.prepare('DELETE FROM inquiry_mail_outbox WHERE verification_hash IN(SELECT token_hash FROM customer_verifications WHERE expires_at<?) AND (lease_until IS NULL OR lease_until<?)').bind(now-86400000,now),env.DB.prepare('DELETE FROM customer_verifications WHERE expires_at<? AND NOT EXISTS(SELECT 1 FROM inquiry_mail_outbox o WHERE o.verification_hash=customer_verifications.token_hash)').bind(now-86400000)]);
 // Ready but never submitted customer attachments are also expired (content files
 // retain their separate policy). Every deletion rechecks the unused group.
 await env.DB.prepare(`INSERT OR IGNORE INTO file_cleanup_jobs(file_id,available_at) SELECT f.id,? FROM files f JOIN customer_upload_permits p ON p.file_id=f.id JOIN customer_upload_groups g ON g.id=p.group_id WHERE g.expires_at<? AND g.inquiry_id IS NULL AND f.status='pending_deletion' AND f.deleted_at IS NOT NULL AND f.attached=0`).bind(now,now).run();
 const expired=(await env.DB.prepare(`SELECT f.id,f.source_key,f.object_key FROM files f JOIN customer_upload_permits p ON p.file_id=f.id JOIN customer_upload_groups g ON g.id=p.group_id WHERE g.expires_at<? AND g.inquiry_id IS NULL AND f.deleted_at IS NULL LIMIT 20`).bind(now).all<{id:string;source_key:string;object_key:string}>()).results;
 for(const f of expired){const r=await env.DB.prepare("UPDATE files SET deleted_at=CURRENT_TIMESTAMP,status='pending_deletion' WHERE id=? AND deleted_at IS NULL AND EXISTS(SELECT 1 FROM customer_upload_permits p JOIN customer_upload_groups g ON g.id=p.group_id WHERE p.file_id=files.id AND g.expires_at<? AND g.inquiry_id IS NULL)").bind(f.id,now).run();if(r.meta.changes===1)await env.DB.prepare('INSERT OR IGNORE INTO file_cleanup_jobs(file_id,available_at) VALUES(?,?)').bind(f.id,now).run();}
}
