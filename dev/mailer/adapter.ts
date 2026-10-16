// Local-only binding adapter. Account credentials remain in ignored .dev.vars.c-local.
interface Env {CF_EMAIL_API_TOKEN?:string;CF_EMAIL_ACCOUNT_ID?:string;MAIL_FROM?:string;MAIL_TEST_TO?:string;MAIL_LINK_ORIGIN?:string}
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  const url=new URL(request.url);
  // Unknown lookup never authorizes an automatic resend.
  if(url.pathname==='/v1/status'&&request.method==='GET')return json({eventId:url.searchParams.get('eventId'),state:'unknown'});
  if(url.pathname!=='/v1/send'||request.method!=='POST')return json({error:'not_found'},404);
  if(!env.CF_EMAIL_API_TOKEN||!env.CF_EMAIL_ACCOUNT_ID||!/^[a-f0-9]{32}$/.test(env.CF_EMAIL_ACCOUNT_ID)||!env.MAIL_FROM||!env.MAIL_TEST_TO||!env.MAIL_LINK_ORIGIN)return json({accepted:false,definitive:true},503);
  const event=request.headers.get('Idempotency-Key')||'';
  if(!/^[\w.-]{1,200}$/.test(event))return json({accepted:false,definitive:true},400);
  let p:{to?:string;template?:string;link?:string};
  try{if(Number(request.headers.get('Content-Length')||0)>16000)throw Error();const raw=await request.text();if(raw.length>16000)throw Error();p=JSON.parse(raw);}catch{return json({accepted:false,definitive:true},400);}
  // Do not redirect another customer's verification message into the test mailbox.
  if(typeof p.to!=='string'||p.to.toLowerCase()!==env.MAIL_TEST_TO.toLowerCase())return json({accepted:false,definitive:true},403);
  try{const link=new URL(p.link||'');if(link.protocol!=='https:'||link.origin!==env.MAIL_LINK_ORIGIN)throw Error();}catch{return json({accepted:false,definitive:true},400);}
  const verification=p.template==='customer-verification';
  const text=`지엔씨쿨링 로컬 개발 시험 메일\n\n${verification?'이메일 본인 확인을 진행해주세요.':'문의 관련 알림입니다. 아래 페이지에서 확인해주세요.'}\n${p.link}\n\n실제 고객 접수 또는 회사의 공식 안내가 아닙니다.`;
  try{
   const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_EMAIL_ACCOUNT_ID}/email/sending/send`,{method:'POST',headers:{'Authorization':'Bearer '+env.CF_EMAIL_API_TOKEN,'Content-Type':'application/json','Idempotency-Key':event},body:JSON.stringify({from:env.MAIL_FROM,to:p.to,subject:verification?'[로컬 시험] 이메일 본인 확인':'[로컬 시험] 문의 알림',text}),signal:AbortSignal.timeout(20000),redirect:'error'});
   const result=await r.json() as {success?:boolean;result?:{delivered?:string[];queued?:string[]}};
   if(r.ok&&result.success===true&&[...(result.result?.delivered||[]),...(result.result?.queued||[])].includes(p.to))return json({accepted:true,receipt:'cloudflare:'+event});
   // Ambiguous provider results stop retries in the application's outbox.
   return json({accepted:false,definitive:false},502);
  }catch{return json({accepted:false,definitive:false},502);}
 }
};
