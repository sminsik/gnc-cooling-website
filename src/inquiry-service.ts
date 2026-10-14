import {staffNotification} from './inquiry-notifications.ts';
import {productDetail} from './catalog.ts';
import {publicProject} from './content-public.ts';
import {businesses} from './site-content.ts';
import {text} from './staff-session.ts';
import {StaffError,randomToken,hash,policy,normalizeEmail,rate,captcha,encrypt,cookie,customerCookie} from './inquiry-security.ts';
import type {InquiryEnv} from './inquiry-security.ts';
export const works:Record<string,string>={installation:'신규 설치',replacement:'교체',repair:'보수',parts:'부품',other:'기타',unknown:'모름'};
export type ScopeItem={id:string;version:number};
async function verificationPlan(env:InquiryEnv,email:string,scope:string,snapshot:ScopeItem[],now:number){
 const token=randomToken(),tokenHash=await hash(token),id=crypto.randomUUID(),expiry=now+900000;
 const cipher=await encrypt(env,{to:email,template:'customer-verification',link:env.CUSTOMER_ORIGIN+'/my-inquiries/verify#'+token,expiresAt:expiry});
 return {tokenHash,scope,snapshot:JSON.stringify(snapshot),expiry,cipher,id};
}
export function verificationStatements(env:InquiryEnv,email:string,p:Awaited<ReturnType<typeof verificationPlan>>,now:number,gate:string,values:unknown[]){return [
 env.DB.prepare(`UPDATE customer_verifications SET revoked_at=? WHERE email=? AND scope=? AND consumed_at IS NULL AND revoked_at IS NULL AND (${gate})`).bind(now,email,p.scope,...values),
 env.DB.prepare(`INSERT INTO customer_verifications(token_hash,email,scope,snapshot_json,expires_at,created_at) SELECT ?,?,?,?,?,? WHERE ${gate}`).bind(p.tokenHash,email,p.scope,p.snapshot,p.expiry,now,...values),
 env.DB.prepare(`INSERT INTO inquiry_mail_outbox(id,verification_hash,payload_cipher,available_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM customer_verifications WHERE token_hash=?)`).bind(p.id,p.tokenHash,p.cipher,now,p.tokenHash)
 ];}
async function mailLimits(env:InquiryEnv,email:string,scope:string){await rate(env,'mail-minute:'+email+':'+scope,1,60000);await rate(env,'mail-hour:'+email,5,3600000);await rate(env,'mail-day:'+email,10,86400000);}
export async function submitInquiry(env:InquiryEnv,owner:string,input:Record<string,unknown>,network:string){
 const requestId=text(input,'requestId',80,true);if(!/^[\w-]{16,80}$/.test(requestId))throw new StaffError(400,'접수 요청을 다시 준비해주세요.');
 const kind=text(input,'kind',20,true),work=text(input,'work',20,true);if(!['consultation','as'].includes(kind)||!works[work])throw new StaffError(400,'문의 종류와 요청 업무를 선택해주세요.');
 const email=normalizeEmail(input.email),name=text(input,'name',100,true).trim(),company=text(input,'company',100).trim(),phone=text(input,'phone',30,true).trim(),region=text(input,'region',100,true).trim(),body=text(input,'body',10000,true).trim(),equipment=text(input,'equipment',100).trim(),dimensions=text(input,'dimensions',200).trim();
 if(!/^[0-9+()\-\s]{5,30}$/.test(phone))throw new StaffError(400,'연락처를 확인해주세요.');
 if(input.consent!==true||input.policyVersion!==policy(env)!.version)throw new StaffError(400,'최신 개인정보 수집 안내를 확인하고 동의해주세요.');
 const productId=text(input,'product',100),modelId=text(input,'model',100),projectId=text(input,'project',100),source=text(input,'source',100),groupId=text(input,'uploadGroup',80);
 const normalized={kind,work,email,name,company,phone,region,body,equipment,dimensions,productId,modelId,projectId,source,groupId,policyVersion:input.policyVersion};
 const digest=await hash(JSON.stringify(normalized));
 const previous=await env.DB.prepare('SELECT input_hash,receipt,classification FROM inquiries WHERE owner_hash=? AND request_id=?').bind(owner,requestId).first<{input_hash:string;receipt:string;classification:string}>();
 if(previous){if(previous.input_hash!==digest)throw new StaffError(409,'이미 사용한 접수 요청입니다. 새 요청으로 제출해주세요.');return receiptResponse(previous);}
 const connection:Record<string,unknown>={};
 if(productId){const p=await productDetail(env.DB,productId);if(!p)throw new StaffError(400,'연결 제품을 다시 확인해주세요.');connection.product={id:p.id,name:p.name};if(modelId){const m=p.models.find(m=>m.id===modelId);if(!m)throw new StaffError(400,'연결 모델을 다시 확인해주세요.');connection.model={id:m.id,name:m.name};}}else if(modelId)throw new StaffError(400,'제품과 모델 연결을 확인해주세요.');
 if(projectId){const p=await env.DB.prepare(`SELECT id,title FROM projects WHERE id=? AND ${publicProject}`).bind(projectId).first();if(!p)throw new StaffError(400,'연결 사례를 다시 확인해주세요.');connection.project=p;}
 if(source){const b=businesses.find(b=>b.path.split('/').pop()===source);if(!b)throw new StaffError(400,'사업분야를 다시 확인해주세요.');connection.source={code:source,name:b.title};}
 const now=Date.now();
 if(groupId){const group=await env.DB.prepare('SELECT id FROM customer_upload_groups WHERE id=? AND owner_hash=? AND purpose=\'inquiry\' AND expires_at>? AND inquiry_id IS NULL').bind(groupId,owner,now).first();if(!group)throw new StaffError(409,'첨부 묶음이 만료되었거나 다른 요청에 사용되었습니다.');const pending=await env.DB.prepare("SELECT COUNT(*) n FROM customer_upload_permits p JOIN files f ON f.id=p.file_id WHERE p.group_id=? AND f.deleted_at IS NULL AND (f.status<>'ready' OR f.validated_at IS NULL)").bind(groupId).first<{n:number}>();if(pending?.n)throw new StaffError(409,'첨부 검사 완료 후 제출해주세요.');}
 await rate(env,'submit-email:'+email,3,600000);await rate(env,'submit-network:'+network,20,600000);await captcha(env,input.turnstileToken,'inquiry-submit');
 const signals:string[]=[];const links=body.match(/https?:\/\/\S+/gi)||[];if(links.length>=5)signals.push('과도한 링크');if(/(.{12,})\1{3,}/s.test(body))signals.push('반복 문구');
 const recent=await env.DB.prepare('SELECT COUNT(*) n FROM inquiries WHERE input_hash=? AND created_at>?').bind(digest,now-600000).first<{n:number}>();if((recent?.n||0)>=2)signals.push('최근 동일 내용 반복');
 const classification=signals.length?'suspected':'normal',id=crypto.randomUUID(),receipt='GNC-'+crypto.randomUUID().replace(/-/g,'').slice(0,16).toUpperCase();
 const sessionGate='EXISTS(SELECT 1 FROM inquiry_sessions WHERE token_hash=? AND expires_at>?)';
 const groupGate=groupId?" AND EXISTS(SELECT 1 FROM customer_upload_groups g WHERE g.id=? AND g.owner_hash=? AND g.expires_at>? AND g.inquiry_id IS NULL) AND NOT EXISTS(SELECT 1 FROM customer_upload_permits p JOIN files f ON f.id=p.file_id WHERE p.group_id=? AND f.deleted_at IS NULL AND (f.status<>'ready' OR f.validated_at IS NULL))":'';
 const first=env.DB.prepare(`INSERT INTO inquiries(id,receipt,owner_hash,request_id,input_hash,kind,work,title,company,name,phone,email,region,body,equipment,dimensions,connection_json,consent_json,classification,signals_json,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE ${sessionGate}${groupGate}`)
 .bind(id,receipt,owner,requestId,digest,kind,work,(kind==='as'?'A/S':'견적·상담')+' · '+works[work],company,name,phone,email,region,body,equipment,dimensions,JSON.stringify(connection),JSON.stringify(policy(env)),classification,JSON.stringify(signals),now,owner,now,...(groupId?[groupId,owner,now,groupId]:[]));
 const gate='EXISTS(SELECT 1 FROM inquiries WHERE id=?)';const statements=[first,env.DB.prepare(`INSERT INTO inquiry_messages(id,inquiry_id,kind,body,status,created_at,updated_at) SELECT ?,?,'customer',?,'sent',?,? WHERE ${gate}`).bind('initial:'+id,id,body,now,now,id),env.DB.prepare(`INSERT INTO inquiry_events(id,inquiry_id,action,at) SELECT ?,?,'submitted',? WHERE ${gate}`).bind(crypto.randomUUID(),id,now,id)];
 if(groupId){statements.push(env.DB.prepare(`UPDATE customer_upload_groups SET inquiry_id=? WHERE id=? AND ${gate}`).bind(id,groupId,id),env.DB.prepare(`UPDATE files SET target_type='inquiries',target_id=?,attached=1,expires_at=NULL WHERE id IN(SELECT file_id FROM customer_upload_permits WHERE group_id=?) AND ${gate}`).bind(id,groupId,id));}
 if(classification==='normal'){await mailLimits(env,email,'inquiry:'+id);const p=await verificationPlan(env,email,'inquiry:'+id,[{id,version:1}],now);statements.push(...verificationStatements(env,email,p,now,gate,[id]));}
 try{const results=await env.DB.batch(statements);if(results[0].meta.changes!==1)throw new StaffError(409,'문의 화면 또는 첨부 묶음을 다시 확인해주세요.');}catch(error){const replay=await env.DB.prepare('SELECT input_hash,receipt,classification FROM inquiries WHERE owner_hash=? AND request_id=?').bind(owner,requestId).first<{input_hash:string;receipt:string;classification:string}>();if(replay?.input_hash===digest)return receiptResponse(replay);if(error instanceof StaffError)throw error;throw new StaffError(409,'저장하지 못했습니다. 입력 내용을 유지하고 다시 시도해주세요.');}
 return receiptResponse({receipt,classification});
}
function receiptResponse(row:{receipt:string;classification:string}){return {receipt:row.receipt,message:row.classification==='normal'?'문의가 저장되었습니다. 확인 메일 발송을 준비합니다. 메일을 받은 뒤 본인 확인을 진행해주세요.':'문의가 저장되었습니다. 담당자 확인 후 안내합니다.'};}
export async function requestVerification(env:InquiryEnv,input:Record<string,unknown>,network:string){
 const email=normalizeEmail(input.email),receipt=text(input,'receipt',40),scope=receipt?'receipt:'+receipt:'list',now=Date.now();
 await rate(env,'verification-network:'+network,20,600000);await captcha(env,input.turnstileToken,'inquiry-verify-request');
 // Rate refusal is deliberately indistinguishable from an absent inquiry.
 try{await mailLimits(env,email,scope);}catch(error){if(error instanceof StaffError&&error.status===429)return;throw error;}
 const rows=(await env.DB.prepare(`SELECT id,auth_version version FROM inquiries WHERE email=? AND classification='normal' AND deleted_at IS NULL ${receipt?'AND receipt=?':''} ORDER BY created_at,id`).bind(email,...(receipt?[receipt]:[])).all<ScopeItem>()).results;
 if(!rows.length)return;
 const p=await verificationPlan(env,email,scope,rows,now);await env.DB.batch(verificationStatements(env,email,p,now,'1',[]));
}
export async function confirmVerification(env:InquiryEnv,token:unknown){
 if(typeof token!=='string'||!/^[-\w]{43}$/.test(token))throw new StaffError(400,'확인 링크가 만료되었거나 사용할 수 없습니다.');
 const tokenHash=await hash(token),now=Date.now(),row=await env.DB.prepare('SELECT email,snapshot_json FROM customer_verifications WHERE token_hash=? AND expires_at>? AND consumed_at IS NULL AND revoked_at IS NULL').bind(tokenHash,now).first<{email:string;snapshot_json:string}>();
 if(!row)throw new StaffError(400,'확인 링크가 만료되었거나 사용할 수 없습니다.');
 const session=randomToken(),csrf=randomToken(),sessionHash=await hash(session),marker=crypto.randomUUID();
 const gate='EXISTS(SELECT 1 FROM customer_verifications WHERE token_hash=? AND consume_marker=?)';
 const statements=[env.DB.prepare('UPDATE customer_verifications SET consumed_at=?,consume_marker=? WHERE token_hash=? AND expires_at>? AND consumed_at IS NULL AND revoked_at IS NULL').bind(now,marker,tokenHash,now)];
 statements.push(env.DB.prepare(`INSERT INTO inquiry_events(id,inquiry_id,action,at) SELECT ?||'.'||id,id,'email-verified',? FROM inquiries WHERE email=? AND verified_at IS NULL AND classification='normal' AND deleted_at IS NULL AND EXISTS(SELECT 1 FROM json_each(?) j WHERE json_extract(j.value,'$.id')=inquiries.id AND json_extract(j.value,'$.version')=inquiries.auth_version) AND ${gate}`).bind(crypto.randomUUID(),now,row.email,row.snapshot_json,tokenHash,marker));
 // Snapshot authorization is checked against the current email, version and classification.
 statements.push(env.DB.prepare(`UPDATE inquiries SET verified_at=COALESCE(verified_at,?),first_normal_received_at=COALESCE(first_normal_received_at,?),first_normal_marker=COALESCE(first_normal_marker,?) WHERE email=? AND classification='normal' AND deleted_at IS NULL AND EXISTS(SELECT 1 FROM json_each(?) j WHERE json_extract(j.value,'$.id')=inquiries.id AND json_extract(j.value,'$.version')=inquiries.auth_version) AND ${gate}`).bind(now,now,marker,row.email,row.snapshot_json,tokenHash,marker),
 env.DB.prepare(`INSERT INTO customer_sessions SELECT ?,?,?,?,?,? WHERE ${gate}`).bind(sessionHash,await hash(csrf),row.email,row.snapshot_json,now,now+7200000,tokenHash,marker));
 for(const item of JSON.parse(row.snapshot_json) as ScopeItem[])statements.push(staffNotification(env,item.id,'new-inquiry:'+item.id,'staff-new-inquiry',`EXISTS(SELECT 1 FROM customer_verifications WHERE token_hash=? AND consume_marker=?) AND i.email=? AND i.auth_version=? AND i.classification='normal' AND i.verified_at IS NOT NULL AND i.first_normal_marker=?`,[tokenHash,marker,row.email,item.version,marker]));
 const result=await env.DB.batch(statements);if(result[0].meta.changes!==1)throw new StaffError(400,'확인 링크가 만료되었거나 사용할 수 없습니다.');
 return cookie(customerCookie,session+'.'+csrf,7200);
}
export async function customerScope(request:Request,env:InquiryEnv){
 const {cookieValue}=await import('./staff-session.ts');const value=cookieValue(request,customerCookie)||'';if(!/^[-\w]{43}\.[-\w]{43}$/.test(value))throw new StaffError(401,'이메일 본인 확인이 필요합니다.');
 const [token,csrf]=value.split('.');const row=await env.DB.prepare('SELECT email,snapshot_json,csrf_hash FROM customer_sessions WHERE token_hash=? AND expires_at>?').bind(await hash(token),Date.now()).first<{email:string;snapshot_json:string;csrf_hash:string}>();if(!row||row.csrf_hash!==await hash(csrf))throw new StaffError(401,'이메일 본인 확인이 필요합니다.');return {...row,csrf,tokenHash:await hash(token)};
}
export async function ownInquiries(request:Request,env:InquiryEnv,id?:string){
 const session=await customerScope(request,env),scopeHash=await hash(session.email);
 const rows=(await env.DB.prepare(`SELECT id,receipt,title,status,classification,created_at,delivery_seq,COALESCE((SELECT last_delivery FROM customer_read_positions p WHERE p.inquiry_id=inquiries.id AND p.auth_version=inquiries.auth_version AND p.scope_hash=?),0) AS last_seen${id?',company,name,phone,email,region,body,equipment,dimensions,connection_json':''} FROM inquiries WHERE email=? AND verified_at IS NOT NULL AND classification IN('normal','suspected') AND deleted_at IS NULL AND EXISTS(SELECT 1 FROM json_each(?) j WHERE json_extract(j.value,'$.id')=inquiries.id AND json_extract(j.value,'$.version')=inquiries.auth_version) ${id?'AND id=?':''} ORDER BY created_at DESC,id DESC`).bind(scopeHash,session.email,session.snapshot_json,...(id?[id]:[])).all<Record<string,unknown>>()).results;
 if(id&&!rows.length)throw new StaffError(404,'제공할 수 없는 문의입니다.');if(id){rows[0].messages=(await env.DB.prepare("SELECT id,kind,body,status,correction_of_id,created_at,delivered_at,delivery_seq FROM inquiry_messages WHERE inquiry_id=? AND (kind='customer' OR (kind='reply' AND status='sent')) ORDER BY created_at,id").bind(id).all()).results;rows[0].quotes=(await env.DB.prepare("SELECT id,title,body,number,status,delivered_at,delivery_seq,file_id FROM inquiry_quotes WHERE inquiry_id=? AND status IN('sent','superseded') ORDER BY number DESC").bind(id).all()).results;}if(id)for(const m of rows[0].messages as Record<string,unknown>[]){m.attachments=(await env.DB.prepare("SELECT id,original_name name FROM files WHERE target_type='inquiry_messages' AND target_id=? AND purpose='private' AND attached=1 AND status='ready' AND validated_at IS NOT NULL AND deleted_at IS NULL").bind(m.id).all()).results;}if(id)rows[0].attachments=(await env.DB.prepare("SELECT id,original_name name,size_bytes size FROM files WHERE target_type='inquiries' AND target_id=? AND purpose='private' AND attached=1 AND status='ready' AND validated_at IS NOT NULL AND deleted_at IS NULL ORDER BY created_at,id").bind(id).all()).results;return rows;
}

export async function prepareStaffVerification(env:InquiryEnv,email:string,id:string,version:number){await mailLimits(env,email,'inquiry:'+id);return verificationPlan(env,email,'inquiry:'+id,[{id,version}],Date.now());}
