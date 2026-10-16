import test from 'node:test';
import assert from 'node:assert/strict';
import mailer from '../dev/mailer/adapter.ts';
const env={CF_EMAIL_API_TOKEN:'not-a-real-key',CF_EMAIL_ACCOUNT_ID:'0'.repeat(32),MAIL_FROM:'GNC <local@example.invalid>',MAIL_TEST_TO:'test@example.invalid',MAIL_LINK_ORIGIN:'https://localhost:8788'};
const request=(patch={})=>new Request('https://mailer.internal/v1/send',{method:'POST',headers:{'Idempotency-Key':'event-1'},body:JSON.stringify({to:env.MAIL_TEST_TO,template:'customer-verification',link:env.MAIL_LINK_ORIGIN+'/my-inquiries/verify#token',...patch})});
test('local mail adapter fails closed for missing config, recipients and foreign links',async()=>{
 assert.equal((await mailer.fetch(request(),{})).status,503);
 assert.equal((await mailer.fetch(request({to:'other@example.invalid'}),env)).status,403);
 assert.equal((await mailer.fetch(request({link:'https://evil.invalid/'}),env)).status,400);
});
test('local mail adapter sends actual provider payload and preserves idempotency without leaking tokens',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.cloudflare.com/client/v4/accounts/'+env.CF_EMAIL_ACCOUNT_ID+'/email/sending/send');assert.equal(options.headers['Idempotency-Key'],'event-1');const body=JSON.parse(options.body);assert.equal(body.to,env.MAIL_TEST_TO);assert.ok(body.text.includes('#token'));return Response.json({success:true,result:{delivered:[env.MAIL_TEST_TO],queued:[]}});};
  const result=await mailer.fetch(request(),env);assert.deepEqual(await result.json(),{accepted:true,receipt:'cloudflare:event-1'});
  globalThis.fetch=async()=>{throw Error('timeout');};
  assert.deepEqual(await (await mailer.fetch(request(),env)).json(),{accepted:false,definitive:false});
 }finally{globalThis.fetch=original;}
});
test('unconfirmed status stays unknown',async()=>{
 const r=await mailer.fetch(new Request('https://mailer.internal/v1/status?eventId=event-1'),env);
 assert.deepEqual(await r.json(),{eventId:'event-1',state:'unknown'});
});
