import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {staticPages} from '../src/site-content.ts';
import {publicFixture} from './helpers/public-fixture.mjs';
import worker from '../src/index.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=new URL('../../outputs/검증/20261011-mvp-public/',import.meta.url);await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const errors=[],checks=[];
const context=await browser.newContext(),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
const origin='http://127.0.0.1:8787';
try{
 const paths=['/',...staticPages.map(v=>v.path),'/products','/projects','/resources','/notices','/inquiries'];
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:900});
  for(const path of paths){
   const response=await page.goto(origin+path);assert.equal(response.status(),200,path);
   assert.equal(await page.locator('h1').count(),1,path);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,width+' '+path);
   if(path==='/'||width===320&&['/company/about','/business/cooling-tower-repair','/products','/inquiries'].includes(path))await page.screenshot({path:fileURLToPath(new URL((path==='/'?'home':path.slice(1).replaceAll('/','-'))+'-'+width+'.png',out)),fullPage:true});
  }
 }
 checks.push('실제 미리보기 공개 17개 경로·1440/390/320px: 200·제목 한 개·가로 넘침 없음');
 await page.setViewportSize({width:320,height:900});await page.goto(origin+'/');
 // Native details/summary remains usable with keyboard without JavaScript.
 await page.locator('.mobile-menu>summary').focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator('.mobile-menu').evaluate(el=>el.open),true);
 const mobile=page.getByRole('navigation',{name:'모바일 주 메뉴'});await mobile.locator('summary').filter({hasText:'사업분야'}).click();
 await mobile.getByRole('link',{name:'냉각탑 보수',exact:true}).click();assert.ok(page.url().endsWith('/business/cooling-tower-repair'));
 await page.getByRole('link',{name:'이 분야 문의 안내',exact:true}).click();assert.ok(page.url().includes('source=cooling-tower-repair'));
 await page.getByText('냉각탑 보수',{exact:true}).last().waitFor();assert.equal(await page.locator('input,textarea,input[type=file],form').count(),0);
 await page.screenshot({path:fileURLToPath(new URL('inquiry-business-context-320.png',out)),fullPage:true});checks.push('모바일 키보드 메뉴→사업 상세→분야 문의·접수 잠금');
 await page.goto(origin+'/support/as');await page.getByRole('link',{name:'A/S 문의 안내',exact:true}).click();assert.equal(new URL(page.url()).searchParams.get('kind'),'as');await page.getByRole('heading',{name:'A/S 문의 안내',exact:true}).waitFor();checks.push('A/S 구분 유지·입력 없는 안내');
 const response=await page.request.post(origin+'/api/inquiries',{data:{}});assert.equal(response.status(),503);
 checks.push('실제 POST 접수 503 유지');
 // Separate fixture-only context exercises currently empty product/model pages.
 const f=publicFixture();f.product('mock-product');f.project('mock-case');f.notice('mock-notice');f.resource('mock-resource');
 f.sql.exec("INSERT INTO product_models(id,product_id,name,publication_status) VALUES('mock-model','mock-product','개발 시험 모델','published'); INSERT INTO model_specifications(id,model_id,name,value_text,unit) VALUES('mock-spec','mock-model','아주 긴 시험 사양 이름','000000000000000000000000000000000000','가상 단위')");
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');f.env.FILES.get=async()=>({body:png});
 f.env.ASSETS.fetch=async req=>new Response(await readFile(new URL('../public'+new URL(req.url).pathname,import.meta.url)),{headers:{'Content-Type':'text/css'}});
 const mock=await browser.newContext();await mock.route('https://app.test/**',async route=>{
  const req=route.request(),r=await worker.fetch(new Request(req.url(),{method:req.method(),headers:await req.allHeaders(),body:req.postDataBuffer()||undefined}),f.env);
  await route.fulfill({status:r.status,headers:Object.fromEntries(r.headers),body:Buffer.from(await r.arrayBuffer())});
 });
 const modelPage=await mock.newPage();modelPage.on('pageerror',e=>errors.push(e.message));
 for(const width of [1440,390,320]){
  await modelPage.setViewportSize({width,height:900});await modelPage.goto('https://app.test/products/mock-product');
  assert.equal(await modelPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const table=modelPage.getByRole('region',{name:'개발 시험 모델 사양표'});await table.waitFor();
  if(width===320){assert.equal(await table.evaluate(el=>el.scrollWidth>el.clientWidth),true);await modelPage.screenshot({path:fileURLToPath(new URL('fixture-product-detail-320.png',out)),fullPage:true});}
 }
 await modelPage.getByRole('link',{name:'이 모델 문의 안내',exact:true}).click();await modelPage.getByText('모델: 개발 시험 모델',{exact:true}).waitFor();assert.equal(await modelPage.locator('input,form').count(),0);await modelPage.getByRole('link',{name:'A/S',exact:true}).click();assert.equal(new URL(modelPage.url()).searchParams.get('model'),'mock-model');await modelPage.getByText('모델: 개발 시험 모델',{exact:true}).waitFor();checks.push('격리 가상 제품/모델→문의 맥락·사양표 내부 스크롤·현재 데이터만 표시');
 await modelPage.goto('https://app.test/');assert.equal(await modelPage.locator('[data-home="products"]').count(),1);assert.equal(await modelPage.locator('[data-home="projects"]').count(),1);assert.equal(await modelPage.locator('[data-home="notices"]').count(),1);assert.equal(await modelPage.locator('[data-home="resources"]').count(),0);
 await modelPage.screenshot({path:fileURLToPath(new URL('fixture-home-with-content-320.png',out)),fullPage:true});checks.push('격리 선정 콘텐츠 메인 표시·선정되지 않은 자료 미표시');
 await mock.close();f.sql.close();assert.deepEqual(errors,[]);
 await writeFile(new URL('browser-results.json',out),JSON.stringify({actual:'실제 로컬 미리보기: 가짜 회사 자료 추가 없음',fixture:'제품/모델/홈 콘텐츠 흐름은 메모리 DB·1픽셀 가상 이미지. 실제 회사 콘텐츠/파일 검사 검수 아님',checks,errors},null,2));console.log(checks);
}finally{await browser.close();}
