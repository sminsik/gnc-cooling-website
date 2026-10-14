import {StaffError,randomToken,hash,cookieValue,cookie,staffJson} from './staff-session.ts';
export {StaffError,randomToken,hash,cookie,staffJson};
export interface InquiryEnv {
 DB:D1Database; FILES:R2Bucket; FILE_SCANNER?:Fetcher; INQUIRY_MAILER?:Fetcher; INQUIRY_MAIL_STATUS?:Fetcher;
 CUSTOMER_ORIGIN?:string; INQUIRY_INTAKE_ENABLED?:string; INQUIRY_POLICY?:string;
 INQUIRY_RATE_SECRET?:string; INQUIRY_MAIL_KEY?:string; TURNSTILE_SITE_KEY?:string; TURNSTILE_SECRET?:string;
}
export const anonymousCookie='gnc_inquiry_submit',customerCookie='gnc_customer';
export function policy(env:InquiryEnv):{version:string;text:string;retention:string;contact:string}|null {
 try {const p=JSON.parse(env.INQUIRY_POLICY||'');if(p.approved!==true||['version','text','retention','contact'].some(k=>typeof p[k]!=='string'||!p[k].trim()||p[k].length>10000))return null;return {version:p.version,text:p.text,retention:p.retention,contact:p.contact};}catch{return null;}
}
export function ready(env:InquiryEnv):boolean {
 try {const u=new URL(env.CUSTOMER_ORIGIN||'');return env.INQUIRY_INTAKE_ENABLED==='approved'&&u.protocol==='https:'&&u.origin===env.CUSTOMER_ORIGIN&&!!policy(env)&&!!env.INQUIRY_MAILER&&!!env.TURNSTILE_SITE_KEY&&!!env.TURNSTILE_SECRET&&(env.INQUIRY_RATE_SECRET?.length||0)>=32&&/^[a-f0-9]{64}$/.test(env.INQUIRY_MAIL_KEY||'');}catch{return false;}
}
export function origin(request:Request,env:InquiryEnv){if(new URL(request.url).origin!==env.CUSTOMER_ORIGIN||request.headers.get('Origin')!==env.CUSTOMER_ORIGIN)throw new StaffError(403,'화면을 다시 열고 시도해주세요.');}
export async function input(request:Request):Promise<Record<string,unknown>> {
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw new StaffError(400,'입력 형식을 확인해주세요.');
 const reader=request.body?.getReader();if(!reader)throw new StaffError(400,'입력 내용을 확인해주세요.');
 let size=0;const chunks:Uint8Array[]=[];
 try {while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>64000){await reader.cancel();throw new StaffError(413,'입력 내용이 너무 깁니다.');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 try{const p=JSON.parse(new TextDecoder().decode(bytes));if(!p||Array.isArray(p)||typeof p!=='object')throw Error();return p;}catch{throw new StaffError(400,'입력 내용을 확인해주세요.');}
}
export async function submitSession(request:Request,env:InquiryEnv,mutation=false){
 const value=cookieValue(request,anonymousCookie)||'';if(!/^[-\w]{43}\.[-\w]{43}$/.test(value))throw new StaffError(401,'문의 화면을 다시 열어주세요.');
 const [token,csrf]=value.split('.'),owner=await hash(token);
 const row=await env.DB.prepare('SELECT csrf_hash FROM inquiry_sessions WHERE token_hash=? AND expires_at>?').bind(owner,Date.now()).first<{csrf_hash:string}>();
 if(!row||row.csrf_hash!==await hash(csrf))throw new StaffError(401,'문의 화면을 다시 열어주세요.');
 if(mutation){origin(request,env);if(request.headers.get('X-CSRF-Token')!==csrf)throw new StaffError(403,'화면을 새로 열고 다시 시도해주세요.');}return {owner,csrf};
}
export async function newSubmitSession(env:InquiryEnv){const token=randomToken(),csrf=randomToken(),now=Date.now();await env.DB.prepare('INSERT INTO inquiry_sessions VALUES(?,?,?)').bind(await hash(token),await hash(csrf),now+1800000).run();return {csrf,cookie:cookie(anonymousCookie,token+'.'+csrf,1800)};}
export function normalizeEmail(value:unknown){if(typeof value!=='string')throw new StaffError(400,'이메일을 확인해주세요.');const email=value.trim(),at=email.lastIndexOf('@');if(email.length>254||at<1||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new StaffError(400,'이메일을 확인해주세요.');return email.slice(0,at)+'@'+email.slice(at+1).toLowerCase();}
export async function keyed(env:InquiryEnv,value:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.INQUIRY_RATE_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function rate(env:InquiryEnv,value:string,limit:number,window:number){const now=Date.now(),key=await keyed(env,value);const result=await env.DB.prepare('INSERT INTO inquiry_rates(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END,expires_at=CASE WHEN expires_at<=? THEN ? ELSE expires_at END WHERE expires_at<=? OR count<?').bind(key,now+window,now,now,now+window,now,limit).run();if(result.meta.changes!==1)throw new StaffError(429,'요청이 많습니다. 잠시 후 다시 시도해주세요.');}
export async function captcha(env:InquiryEnv,token:unknown,action:string){
 if(typeof token!=='string'||!token||token.length>2048)throw new StaffError(400,'자동등록 방지 확인을 다시 진행해주세요.');
 try {const r=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.TURNSTILE_SECRET,response:token}),signal:AbortSignal.timeout(10000)});const v=await r.json() as {success?:boolean;hostname?:string;action?:string};if(!r.ok||v.success!==true||v.hostname!==new URL(env.CUSTOMER_ORIGIN!).hostname||v.action!==action)throw Error();}catch{throw new StaffError(400,'자동등록 방지 확인을 다시 진행해주세요. 입력 내용은 유지됩니다.');}
}
async function mailKey(env:InquiryEnv){return crypto.subtle.importKey('raw',Uint8Array.from((env.INQUIRY_MAIL_KEY||'').match(/../g)||[],s=>parseInt(s,16)),'AES-GCM',false,['encrypt','decrypt']);}
export async function encrypt(env:InquiryEnv,value:unknown){const iv=crypto.getRandomValues(new Uint8Array(12));const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},await mailKey(env),new TextEncoder().encode(JSON.stringify(value)));return btoa(String.fromCharCode(...iv))+'.'+btoa(String.fromCharCode(...new Uint8Array(data)));}
export async function decrypt(env:InquiryEnv,value:string){const [iv,data]=value.split('.');return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:Uint8Array.from(atob(iv),c=>c.charCodeAt(0))},await mailKey(env),Uint8Array.from(atob(data),c=>c.charCodeAt(0)))));}
