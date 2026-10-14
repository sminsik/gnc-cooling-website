// Real Chrome -> real localhost HTTPS -> persisted D1/R2 -> real local scanner.
// No intercepted responses, forged cookies, direct credential writes or customer intake.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,X509Certificate} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync} from 'node:fs';
const root=resolve(import.meta.dirname,'..'),work=resolve(root,'.local-https');
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||resolve(work,'tools/node_modules/playwright/index.mjs'));
const credentials=JSON.parse(await readFile(resolve(work,'demo-credentials.json'),'utf8'));
assert.equal(credentials.developmentOnly,true);assert.equal(credentials.origin,'https://localhost:8788');
const origin=credentials.origin;
const certificate=new X509Certificate(await readFile(resolve(work,'localhost.crt')));
const spki=createHash('sha256').update(certificate.publicKey.export({format:'der',type:'spki'})).digest('base64');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--ignore-certificate-errors-spki-list='+spki]});
const context=await browser.newContext();const page=await context.newPage();page.setDefaultTimeout(20000);
const checks=[],errors=[];page.on('pageerror',()=>errors.push('Browser JavaScript error'));
const results=resolve(work,'results');await mkdir(results,{recursive:true,mode:0o700});
const offline=process.argv.includes('--offline');
const recover=process.argv.includes('--recover');
const manifestFile=resolve(work,'demo-content.json');
let content;
try{content=JSON.parse(await readFile(manifestFile,'utf8'));}catch{content={products:[],projects:[],resources:[],notices:[]};}
function report(label){checks.push(label);console.log('PASS '+label);}
async function api(path,method='GET',body){
 return page.evaluate(async ({path,method,body})=>{
  const csrf=(await (await fetch('/api/staff/me')).json()).csrf;
  const response=await fetch(path,{method,headers:body?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{},body:body?JSON.stringify({...body,requestId:crypto.randomUUID()}):undefined});
  return {status:response.status,data:await response.json()};
 },{path,method,body});
}
async function login(account){
 await page.goto(origin+'/admin/login');
 await page.getByLabel('이메일',{exact:true}).fill(account.email);
 await page.getByLabel('비밀번호',{exact:true}).fill(account.password);
 await Promise.all([page.waitForURL(/\/admin\/(dashboard|products)$/),page.getByRole('button',{name:'로그인',exact:true}).click()]);
}
async function activate(account,url){
 await page.goto(url);assert.equal(new URL(page.url()).hash,'');
 await page.getByLabel('새 비밀번호',{exact:true}).fill(account.password);
 await page.getByLabel('새 비밀번호 확인',{exact:true}).fill(account.password);
 await Promise.all([page.waitForURL(/\/admin\/(dashboard|products)$/),page.getByRole('button',{name:'비밀번호 설정',exact:true}).click()]);
}
async function logout(){
 await page.goto(origin+'/admin/account');
 await Promise.all([page.waitForURL(origin+'/admin/login'),page.getByRole('button',{name:'로그아웃',exact:true}).click()]);
}
async function createContent(type,number){
 await page.goto(origin+'/admin/'+type+'/new');
 const form=page.locator('form[data-api="/api/admin/'+type+'"]');
 const warning='[개발 예시] 가상 콘텐츠입니다. 실제 회사 제품·사양·현장 실적·공식 자료가 아닙니다.';
 const title='[개발 예시] Ubuntu '+({products:'냉각 제품',projects:'가상 작업 사례',resources:'가상 안내 자료',notices:'시연 공지'}[type])+' '+number;
 if(type==='products'){
  await form.locator('[name=name]').fill(title);await form.locator('[name=intro]').fill(warning);
  await form.locator('[name=description]').fill(warning);await form.locator('[name=category_id]').selectOption('cooling-towers');
  await form.locator('[name=featured]').check();
 }else{
  await form.locator('[name=title]').fill(title);
  if(type==='notices'){await form.locator('[name=body]').fill(warning);await form.locator('[name=pinned]').check();}
  else{await form.locator('[name=description]').fill(warning);await form.locator(type==='projects'?'[name=work_type]':'[name=category]').fill('가상 시연');}
  if(type==='projects'){await form.locator('[name=approval_by]').fill('가상 예시 공개 확인');await form.locator('[name=approval_at]').fill('2026-10-14');}
 }
 await Promise.all([page.waitForURL(url=>url.pathname.startsWith('/admin/'+type+'/')&&!url.pathname.endsWith('/new')),form.getByRole('button',{name:'작성 내용 저장'}).click()]);
 const id=new URL(page.url()).pathname.split('/').at(-1);assert.notEqual(id,'new');
 content[type].push({id,title});await writeFile(manifestFile,JSON.stringify(content,null,2),{mode:0o600});
 return id;
}
async function upload(type,id,fileName,expected){
 await page.goto(origin+'/admin/'+type+'/'+id);
 const form=page.locator('form[data-upload]');
 await form.locator('[type=file]').setInputFiles(resolve(root,'.local-scanner/fixtures',fileName));
 if(await form.locator('[name=alt]').count())await form.locator('[name=alt]').fill('가상 시험 이미지 · 실제 제품·현장 아님');
 await Promise.all([page.waitForEvent('load'),form.getByRole('button',{name:'파일 등록',exact:true}).click()]);
 const listed=await api('/api/admin/'+type+'/'+id+'/uploads');assert.equal(listed.status,200);assert.equal(listed.data.scannerConfigured,true);
 const candidate=listed.data.items.filter(f=>f.original_name===fileName&&f.status==='validating').at(-1);assert.ok(candidate,'New file must be validating');
 const unauthorized=await page.evaluate(async file=>(await fetch('/api/content-files/'+file)).status,candidate.id);assert.equal(unauthorized,404);
 // Trigger the real local scheduled handler; it invokes the real scanner binding.
 const started=await page.evaluate(async ()=>{const r=await fetch('/cdn-cgi/local/scheduled');return r.status;});assert.equal(started,200);
 const deadline=Date.now()+90000;let row;
 while(Date.now()<deadline){
  const fresh=await api('/api/admin/'+type+'/'+id+'/uploads');row=fresh.data.items.find(f=>f.id===candidate.id);
  if(row?.status===expected&&(expected!=='validating'||row.scan_reason))break;
  await new Promise(accept=>setTimeout(accept,1000));
 }
 assert.equal(row?.status,expected,'File processing status mismatch');
 if(expected==='validating')assert.match(row.scan_reason,/실패|대기/);
 if(expected!=='ready'){
  assert.equal(await page.evaluate(async file=>(await fetch('/api/content-files/'+file)).status,candidate.id),404);
  await page.reload();assert.ok(await page.getByText(expected==='blocked'?'제공 불가':'검사 중',{exact:false}).count());
 }else{
  await page.reload();const edit=page.locator('form[data-api="/api/admin/'+type+'/'+id+'"]');
  const selector=type==='resources'?'[name=file_id]':'[name=image_id]';
  if(type!=='notices')await edit.locator(selector).selectOption(candidate.id);
  if(type==='products')await edit.locator('[name=image_alt]').fill('가상 시험 이미지 · 실제 제품 아님');
  await Promise.all([page.waitForEvent('load'),edit.getByRole('button',{name:'작성 내용 저장'}).click()]);
 }
 return candidate.id;
}
try{
 const dirs=resolve(work,'state/v3/d1/miniflare-D1DatabaseObject');
 const database=readdirSync(dirs).filter(n=>/^[a-f0-9]+\.sqlite$/.test(n));assert.equal(database.length,1);
 const db=new DatabaseSync(resolve(dirs,database[0]),{readOnly:true});
 let active;
 try{active=db.prepare("SELECT count(*) n FROM staff WHERE email=? AND status='active'").get(credentials.admin.email).n;}finally{db.close();}
 if(!active){const invitation=JSON.parse(await readFile(resolve(work,'initial-admin-invitation.json'),'utf8'));await activate(credentials.admin,invitation.invitationUrl);report('Real HTTPS invitation activation; default strong password policy');await logout();}
 await login(credentials.admin);report('Real HTTPS administrator login');
 const staff=await api('/api/admin/staff');assert.equal(staff.status,200);
 if(recover){
  const id=content.products[0].id;await page.goto(origin+'/admin/products/'+id);
  let waiting=(await api('/api/admin/products/'+id+'/uploads')).data.items.find(f=>f.original_name==='safe.jpg'&&f.status==='validating');
  assert.ok(waiting,'Outage fixture must still be pending');
  const deadline=Date.now()+100000;let row;
  while(Date.now()<deadline){
   await page.evaluate(async ()=>{const r=await fetch('/cdn-cgi/local/scheduled');if(!r.ok)throw Error('Scheduled trigger failed');});
   row=(await api('/api/admin/products/'+id+'/uploads')).data.items.find(f=>f.id===waiting.id);
   if(row.status==='ready')break;await new Promise(accept=>setTimeout(accept,2000));
  }
  assert.equal(row.status,'ready');await page.reload();
  report('Restored actual scanner retries pending upload and produces ready verdict');
 }else if(!offline){
  if(!staff.data.items.some(s=>s.email===credentials.content.email)){
   await page.goto(origin+'/admin/staff');const form=page.locator('form[data-api="/api/admin/staff"]');
   await form.locator('[name=name]').fill(credentials.content.name);await form.locator('[name=email]').fill(credentials.content.email);
   await form.getByLabel('콘텐츠 관리자',{exact:true}).check();await form.getByRole('button').click();
   await page.waitForFunction(()=>document.querySelector('form[data-api="/api/admin/staff"] .form-result').textContent.includes('#invitation='));
   const url=(await form.locator('.form-result').textContent()).match(/https:\/\/localhost:8788\/admin\/password#invitation=[\w-]+/)[0];
   await logout();await activate(credentials.content,url);report('Real content-only employee invitation and activation');
   assert.equal((await page.goto(origin+'/admin/inquiries')).status(),403);assert.equal((await page.goto(origin+'/admin/staff')).status(),403);
   assert.equal((await api('/api/admin/staff')).status,403);report('Content employee inquiry/staff permission denied');
   await logout();await login(credentials.admin);
  }
  for(const type of ['products','projects','resources','notices']){
   // Three product cards, one case/resource/notice. Existing records are never updated by the seeder.
  const count=type==='products'?3:1;
   for(let i=content[type].length+1;i<=count;i++){
    const id=await createContent(type,i);report('Browser creates synthetic '+type);
    if(type!=='notices'){await upload(type,id,type==='resources'?'safe.pdf':'safe.png','ready');report('Real scanner ready + browser attachment for '+type);}
    await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'내용 확인 후 공개',exact:true}).click()]);
   }
  }
  await upload('notices',content.notices[0].id,'javascript.pdf','blocked');report('Valid PDF upload blocked by actual scanner; no public download');
  await page.goto(origin+'/products');assert.ok(await page.getByText('[개발 예시] Ubuntu 냉각 제품 1',{exact:false}).count());report('HTTPS public synthetic content renders');
  for(const width of [1440,390]){await page.setViewportSize({width,height:900});await page.goto(origin+'/admin/products');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:resolve(results,'admin-'+width+'.png'),fullPage:true});}
 }else{await upload('products',content.products[0].id,'safe.jpg','validating');report('Actual scanner outage leaves uploaded file validating; no public download');}
 await logout();assert.equal((await api('/api/admin/products')).status,401);report('Logout revokes access');
 assert.deepEqual(errors,[]);
 await writeFile(resolve(results,recover?'browser-recovery.json':offline?'browser-offline.json':'browser-integration.json'),JSON.stringify({ok:true,realBrowser:true,interceptedResponses:false,scope:'Synthetic localhost HTTPS, persisted D1/R2, real scanner',checks},null,2),{mode:0o600});
 console.log(JSON.stringify({ok:true,passed:checks.length}));
}catch{
 // Never print Playwright exception/call log: it could contain passwords or invitation URLs.
 await writeFile(resolve(results,'browser-failure.json'),JSON.stringify({ok:false,completed:checks,page:new URL(page.url()).pathname},null,2),{mode:0o600});
 console.error('Local HTTPS browser validation failed; see private results. Secret values were not printed.');process.exitCode=1;
}finally{await browser.close();}
