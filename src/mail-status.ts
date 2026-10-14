import type {InquiryEnv} from './inquiry-security.ts';
export type MailStatus={state:'accepted';receipt:string}|{state:'rejected'}|{state:'unknown'};
// Read-only trusted binding. A missing, mismatched or ambiguous answer never authorizes resend.
export async function mailStatus(env:InquiryEnv,id:string):Promise<MailStatus>{
 if(!env.INQUIRY_MAIL_STATUS)return {state:'unknown'};
 try{
  const response=await env.INQUIRY_MAIL_STATUS.fetch('https://mailer.internal/v1/status?eventId='+encodeURIComponent(id),{method:'GET',signal:AbortSignal.timeout(10000)});
  if(!response.ok)return {state:'unknown'};
  const data=await response.json() as Record<string,unknown>;
  if(data.eventId!==id)return {state:'unknown'};
  if(data.state==='accepted'&&typeof data.receipt==='string'&&data.receipt.trim()&&data.receipt.length<=200)return {state:'accepted',receipt:data.receipt};
  // This means the event was never accepted and cannot subsequently be delivered.
  // A lookup "not found", eventual-consistency gap, or bounce is not a definitive rejection.
  if(data.state==='rejected'&&data.definitive===true)return {state:'rejected'};
 }catch{}
 return {state:'unknown'};
}
