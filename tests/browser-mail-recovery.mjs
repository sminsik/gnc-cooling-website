import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import {setup} from './helpers/staff-fixture.mjs';
import {randomToken,hash} from '../src/staff-session.ts';
import {processFiles} from '../src/file-processing.ts';
import worker from '../src/index.ts';
const f=setup();await f.staff('staff',['inquiry_manager']);const id='browser-inquiry',now=Date.now();f.sql.prepare(`INSERT INTO inquiries(id,receipt,owner_hash,request_id,input_hash,kind,work,title,company,name,phone,email,region,body,equipment,dimensions,connection_json,consent_json,classification,signals_json,verified_at,created_at) VALUES(?,?,'mock-owner','mock-request','mock-hash','consultation','unknown','냉각탑 상담 시험','가상 회사','가상 고객','010-0000-0000','customer@example.test','시험 지역','설치 상담 개발 시험','','','{}','{}','normal','[]',?,?)`).run(id,'GNC-MOCK-ONLY',now,now);f.sql.prepare("INSERT INTO inquiry_messages(id,inquiry_id,kind,body,status,created_at,updated_at) VALUES(?,?,'customer','설치 상담 개발 시험','sent',?,?)").run('initial:'+id,id,now,now);
Object.assign(f.env,{CUSTOMER_ORIGIN:f.env.APP_ORIGIN,INQUIRY_INTAKE_ENABLED:'approved',INQUIRY_POLICY:JSON.stringify({approved:true,version:'mock',text:'개발 시험',retention:'시험 종료',contact:'가상 창구'}),INQUIRY_RATE_SECRET:'browser-test-only-rate-secret-32-characters',INQUIRY_MAIL_KEY:'a'.repeat(64),TURNSTILE_SITE_KEY:'mock',TURNSTILE_SECRET:'mock',INQUIRY_MAILER:{fetch:async()=>Response.json({accepted:true,receipt:'mock'})}});
const objects=new Map();f.env.FILES={async put(key,body){const bytes=new Uint8Array(await new Response(body).arrayBuffer());objects.set(key,bytes);return {size:bytes.length}},async get(key){const data=objects.get(key);return data?{body:new Response(data).body}:null},async delete(key){objects.delete(key)},async list(){return {objects:[]}}};f.env.FILE_SCANNER={async fetch(_url,init){const data=await new Response(init.body).arrayBuffer();return new Response(data,{headers:{'Content-Type':init.headers['Content-Type'],'Content-Length':String(data.byteLength),'X-Scan-Contract':'gnc-content-v1','X-Structure-Result':'pass','X-Malware-Result':'clean','X-Scan-Engine':'mock-test-only','X-Pdf-Safe':'true'}})}};
f.env.ASSETS.fetch=async request=>{const path=new URL(request.url).pathname;return new Response(await readFile(new URL('../public'+path,import.meta.url)),{headers:{'Content-Type':path.endsWith('.css')?'text/css':'text/javascript'}})};
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}),context=await browser.newContext();const cookie=f.sessions.staff.cookie.split('=');await context.addCookies([{name:cookie[0],value:cookie[1],url:f.env.APP_ORIGIN,secure:true,httpOnly:true,sameSite:'Lax'}]);
await context.route('https://app.test/**',async route=>{const request=route.request(),response=await worker.fetch(new Request(request.url(),{method:request.method(),headers:await request.allHeaders(),body:request.postDataBuffer()||undefined}),f.env);await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});});
const page=await context.newPage(),errors=[],checks=[],out=new URL('../../outputs/검증/20261011-mail-recovery/',import.meta.url);await mkdir(out,{recursive:true});page.on('pageerror',error=>errors.push(error.message));
async function submit(button){await Promise.all([page.waitForNavigation(),button.click()]);}
f.sql.prepare("INSERT INTO inquiry_notifications(id,inquiry_id,event_key,auth_version,audience,template,state,available_at,created_at) VALUES('unknown-mail',?,'mock-event',1,'customer','inquiry-updated','unknown',0,0)").run(id);
f.env.INQUIRY_MAIL_STATUS={fetch:async()=>Response.json({eventId:'unknown-mail',state:'accepted',receipt:'mock-proof'})};
try{
 await page.goto(f.env.APP_ORIGIN+'/admin/inquiries/'+id);
 await page.getByRole('button',{name:'제공자 발송 결과 확인'}).waitFor();
 assert.equal(await page.getByRole('button',{name:'실패 안내 재시도'}).count(),0);
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:900});await page.locator('#history').scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:fileURLToPath(new URL('mail-unknown-'+width+'.png',out))});
 }
 checks.push('결과 불명 자동 재발송 버튼 없음·제공자 조회 버튼·3개 화면 폭');
 const form=page.locator('form[data-api$="/notifications/unknown-mail/check"]');await form.locator('[name="reason"]').fill('제공자 결과 확인 개발 시험');
 await submit(form.getByRole('button',{name:'제공자 발송 결과 확인'}));
 assert.equal(f.sql.prepare('SELECT state FROM inquiry_notifications').get().state,'accepted');
 assert.equal(await page.getByRole('button',{name:'제공자 발송 결과 확인'}).count(),0);
 await page.locator('#history').scrollIntoViewIfNeeded();await page.screenshot({path:fileURLToPath(new URL('mail-accepted-320.png',out))});
 checks.push('실제 화면 양식 제출→모의 제공자 수락→결과·사유 이력 반영');assert.deepEqual(errors,[]);
 await writeFile(new URL('browser-results.json',out),JSON.stringify({fixture:'메모리 DB·가상 직원 세션·모의 발송 결과 조회. 실제 회사 계정/메일 검수 아님',checks,errors},null,2));console.log(checks);
}finally{await browser.close();f.sql.close()}
