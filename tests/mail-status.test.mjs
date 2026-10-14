import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './helpers/staff-fixture.mjs';
import {encrypt} from '../src/inquiry-security.ts';
import {processInquiryMail,reconcileVerificationMail} from '../src/inquiry-mail.ts';
import {mailStatus} from '../src/mail-status.ts';
async function fixture(){
 const f=setup(),now=Date.now();Object.assign(f.env,{CUSTOMER_ORIGIN:'https://app.test',INQUIRY_INTAKE_ENABLED:'approved',INQUIRY_POLICY:JSON.stringify({approved:true,version:'test',text:'mock',retention:'mock',contact:'mock'}),INQUIRY_RATE_SECRET:'x'.repeat(32),INQUIRY_MAIL_KEY:'a'.repeat(64),TURNSTILE_SITE_KEY:'test',TURNSTILE_SECRET:'test',INQUIRY_MAILER:{fetch:async()=>{throw Error('timeout')}}});
 f.sql.prepare("INSERT INTO customer_verifications(token_hash,email,scope,snapshot_json,expires_at,created_at) VALUES('v','test@example.test','test','[]',?,?)").run(now+900000,now);
 f.sql.prepare("INSERT INTO inquiry_mail_outbox(id,verification_hash,payload_cipher,available_at) VALUES('mail','v',?,?)").run(await encrypt(f.env,{to:'test@example.test',link:'https://app.test/#mock-secret',expiresAt:now+900000}),now);
 return {...f,now};
}
test('timeout and interrupted verification sends never blindly retry',async()=>{
 const f=await fixture();let calls=0;f.env.INQUIRY_MAILER.fetch=async()=>{calls++;throw Error('timeout')};
 await processInquiryMail(f.env,f.now);await processInquiryMail(f.env,f.now+200000);assert.equal(calls,1);assert.equal(f.sql.prepare('SELECT unknown_at FROM inquiry_mail_outbox').get().unknown_at,f.now);
 const g=await fixture();g.sql.prepare("UPDATE inquiry_mail_outbox SET lease_token='interrupted',lease_until=?,attempts=1").run(g.now-1);let sent=false;g.env.INQUIRY_MAILER.fetch=async()=>{sent=true;return Response.json({accepted:true,receipt:'mock'})};await processInquiryMail(g.env,g.now);assert.equal(sent,false);assert.equal(g.sql.prepare('SELECT unknown_at FROM inquiry_mail_outbox').get().unknown_at,g.now);
});
test('unknown verification outcome accepts provider receipt without sending again',async()=>{
 const f=await fixture();await processInquiryMail(f.env,f.now);
 f.env.INQUIRY_MAIL_STATUS={fetch:async(url,init)=>{assert.equal(init.method,'GET');assert.equal(new URL(url).searchParams.get('eventId'),'mail');assert.equal(init.body,undefined);return Response.json({eventId:'mail',state:'accepted',receipt:'provider-proof'})}};
 await reconcileVerificationMail(f.env,f.now);const row=f.sql.prepare('SELECT * FROM inquiry_mail_outbox').get();assert.equal(row.sent_at,f.now);assert.equal(row.provider_receipt,'provider-proof');assert.equal(row.payload_cipher,'');assert.equal(row.unknown_at,null);
});
test('definitive rejection retries same event only while verification is valid',async()=>{
 const f=await fixture();await processInquiryMail(f.env,f.now);f.env.INQUIRY_MAIL_STATUS={fetch:async()=>Response.json({eventId:'mail',state:'rejected',definitive:true})};await reconcileVerificationMail(f.env,f.now);
 let event;f.env.INQUIRY_MAILER.fetch=async(_url,init)=>{event=init.headers['Idempotency-Key'];return Response.json({accepted:true,receipt:'proof'})};await processInquiryMail(f.env,f.now+60000);assert.equal(event,'mail');assert.equal(f.sql.prepare('SELECT attempts FROM inquiry_mail_outbox').get().attempts,2);
 const g=await fixture();await processInquiryMail(g.env,g.now);g.sql.exec('UPDATE customer_verifications SET revoked_at=1');g.env.INQUIRY_MAIL_STATUS=f.env.INQUIRY_MAIL_STATUS;await reconcileVerificationMail(g.env,g.now);assert.ok(g.sql.prepare('SELECT failed_at FROM inquiry_mail_outbox').get().failed_at);await processInquiryMail(g.env,g.now+60000);assert.equal(g.sql.prepare('SELECT attempts FROM inquiry_mail_outbox').get().attempts,1);assert.equal(g.sql.prepare('SELECT payload_cipher FROM inquiry_mail_outbox').get().payload_cipher,'');
});
test('missing, mismatched, nondefinitive and bounced lookup responses keep unknown',async()=>{
 assert.equal((await mailStatus({},'mail')).state,'unknown');
 for(const data of [{eventId:'other',state:'accepted',receipt:'proof'},{eventId:'mail',state:'rejected'},{eventId:'mail',state:'not-found'},{eventId:'mail',state:'bounced'},{eventId:'mail',state:'accepted',receipt:''}])assert.equal((await mailStatus({INQUIRY_MAIL_STATUS:{fetch:async()=>Response.json(data)}},'mail')).state,'unknown');
 const f=await fixture();await processInquiryMail(f.env,f.now);let checks=0;f.env.INQUIRY_MAIL_STATUS={fetch:async()=>{checks++;return Response.json({eventId:'mail',state:'unknown'})}};await reconcileVerificationMail(f.env,f.now);await reconcileVerificationMail(f.env,f.now+1);assert.equal(checks,1);assert.ok(f.sql.prepare('SELECT unknown_at FROM inquiry_mail_outbox').get().unknown_at);
});
test('known refusal follows bounded retries, malformed local payload fails before sending',async()=>{
 const f=await fixture();f.env.INQUIRY_MAILER.fetch=async()=>Response.json({accepted:false,definitive:true},{status:503});await processInquiryMail(f.env,f.now);assert.equal(f.sql.prepare('SELECT unknown_at FROM inquiry_mail_outbox').get().unknown_at,null);assert.equal(f.sql.prepare('SELECT available_at FROM inquiry_mail_outbox').get().available_at,f.now+60000);
 f.sql.exec("UPDATE inquiry_mail_outbox SET payload_cipher='invalid'");await processInquiryMail(f.env,f.now+60000);assert.ok(f.sql.prepare('SELECT failed_at FROM inquiry_mail_outbox').get().failed_at);
});
