import {fileURLToPath} from 'node:url';
import {readFile, mkdir,writeFile} from 'node:fs/promises';
// 별도 브라우저 개발 시험: PLAYWRIGHT_MODULE / CHROME_PATH로 설치 위치를 지정합니다.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import {setup} from './helpers/staff-fixture.mjs';
import worker from '../src/index.ts';
const f=setup(); await f.staff('content',['content_manager']);await f.staff('inquiry',['inquiry_manager']);await f.staff('root',['admin']);
f.env.ASSETS.fetch=async request=>{const path=new URL(request.url).pathname;return new Response(await readFile(new URL('../public'+path,import.meta.url)),{headers:{'Content-Type':path.endsWith('.css')?'text/css':'text/javascript'}})};
const out=new URL('../../outputs/검증/20261011-staff-content/',import.meta.url);await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const context=await browser.newContext();
await context.route('https://app.test/**',async route=>{const req=route.request();const response=await worker.fetch(new Request(req.url(),{method:req.method(),headers:await req.allHeaders(),body:req.postData()||undefined}),f.env);await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())})});
async function as(id){await context.clearCookies();await context.addCookies([{name:'gnc_staff_session',value:f.sessions[id].cookie.split('=')[1],url:'https://app.test',secure:true,httpOnly:true,sameSite:'Lax'}])}
const page=await context.newPage();page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));const checks=[];
try{
await as('content');await page.goto('https://app.test/admin/notices/new');await page.getByLabel('제목 (필수)',{exact:true}).fill('개발 시험 공지');await page.getByLabel('공지 본문').fill('브라우저 시험 자료입니다. 실제 회사 공지가 아닙니다.');await Promise.all([page.waitForURL(url=>/admin\/notices\/[^/]+$/.test(url.pathname)&&!url.pathname.endsWith('/new')),page.getByRole('button',{name:'작성 내용 저장'}).click()]);const edit=page.url();
await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'내용 확인 후 공개'}).click()]);await page.goto('https://app.test/notices');if(!await page.getByRole('link',{name:'개발 시험 공지'}).count())throw Error('Published notice missing');checks.push('공지 작성·저장·공개·공개 목록');
await page.goto(edit);await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'숨김',exact:true}).click()]);await page.goto('https://app.test/notices');if(await page.getByRole('link',{name:'개발 시험 공지'}).count())throw Error('Hidden notice exposed');checks.push('숨김 공지 공개 목록 제외');
for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});await page.goto(edit);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw Error('Overflow '+width);await page.screenshot({path:fileURLToPath(new URL('notice-editor-'+width+'.png',out)),fullPage:true});checks.push('공지 편집 화면 '+width+'px 가로 넘침 없음')}
await as('inquiry');const denied=await page.goto('https://app.test/admin/notices');if(denied.status()!==403)throw Error('Role separation failed');checks.push('문의 관리자 콘텐츠 접근 403');
await as('root');await page.goto(edit);await page.getByLabel('삭제 사유').fill('개발 시험');await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'복구 가능한 삭제'}).click()]);await page.goto(edit);await page.getByLabel('복구 사유').fill('개발 시험 복구');await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'숨김 상태로 복구'}).click()]);checks.push('책임 관리자 삭제·숨김 복구');
if(errors.length)throw Error(errors.join('\n'));await writeFile(new URL('browser-results.json',out),JSON.stringify({fixture:'메모리 DB·모의 직원 세션, 실제 OIDC 미연결',checks,errors},null,2));console.log(JSON.stringify(checks));
}finally{await browser.close();f.sql.close()}
