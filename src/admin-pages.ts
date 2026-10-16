import {fileRows} from './content-files.ts';
import { staffMenu, canAccess } from './access-policy.ts';
import { escapeHtml as e } from './public-pages.ts';
import { cookie, randomToken } from './staff-session.ts';
import type { StaffPrincipal } from './staff-session.ts';
import type { ContentType } from './content-admin.ts';
export const titles:Record<ContentType,string>={products:'제품',projects:'시공 사례',resources:'자료',notices:'공지사항'};
const catalogNotice='<aside class="catalog-management-note"><h2>제품 카탈로그와 DB 보관 자료</h2><p>공개 제품은 src/product-data.ts와 관련 파일에서 관리합니다. 이 화면의 저장·공개 작업은 현재 공개 제품 목록에 반영되지 않습니다. 기존 DB 제품·모델·사진은 계속 관리할 수 있습니다.</p><a href="/products">공개 제품 목록 확인 ↗</a></aside>';
const statuses:Record<string,string>={draft:'작성 중',published:'공개',hidden:'숨김'};
export function adminPage(title:string,body:string,staff:StaffPrincipal|null,status=200):Response {
 const nav=staff?staffMenu(staff).map(item=>`<a href="${e(item.path)}">${e(item.label)}</a>`).join(''):'';
 const logout=staff?`<form data-api="/api/staff-auth/logout"><input type="hidden" name="csrf" value="${e(staff.csrf)}"><button>로그아웃</button><p class="form-result" role="status"></p></form>`:'';
 return new Response(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${e(title)} | 지엔씨쿨링 관리</title><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/admin-theme.css"><script src="/admin.js" defer></script></head><body class="admin-themed"><a class="skip" href="#content">본문 바로가기</a><header><a class="brand" href="/" aria-label="지엔씨쿨링 홈"><img class="admin-brand-logo" src="/brand/gnc-color.png" alt="지엔씨쿨링" width="1466" height="267"><span>관리</span></a>${staff?`<p>${e(staff.name)}</p>`:''}${logout}</header><main id="content"><nav class="admin-nav" aria-label="관리 메뉴">${nav}</nav><h1>${e(title)}</h1>${body}</main></body></html>`,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"}});
}
export function loginPage(configured:boolean):Response {
 const seed=randomToken();
 const page=adminPage('직원 로그인',configured?`<p>초대받은 개인 계정으로 로그인해주세요.</p><form class="admin-form" data-auth-start action="/api/staff-auth/start" method="post"><input type="hidden" name="startToken" value="${seed}"><input type="hidden" name="invitation" id="invitation-token" value=""><button>개인 계정으로 로그인</button><p class="form-result" role="status"></p></form><noscript><p>직원 로그인에는 JavaScript가 필요합니다. 브라우저 설정에서 사용을 허용해주세요.</p></noscript>`:'<section class="notice"><h2>직원 로그인 시험 안내</h2><p>홈페이지 전용 이메일·비밀번호 로그인은 별도의 HTTPS 개발 환경에서 시험합니다.</p><p>이 컴퓨터에서 <a href="https://localhost:8788/admin/login">직원 로그인 시험 화면</a>을 열어주세요. 시험 서버가 실행 중이어야 합니다.</p><a href="/">홈으로</a></section>',null,configured?200:503);
 page.headers.append('Set-Cookie',cookie('gnc_staff_start',seed,600));return page;
}
function formStart(api:string,staff:StaffPrincipal,version?:unknown):string {
 return `<form class="admin-form" data-api="${e(api)}"><input type="hidden" name="csrf" value="${e(staff.csrf)}"><input type="hidden" name="requestId" value="${crypto.randomUUID()}">${version?`<input type="hidden" name="expectedVersion" value="${e(version)}">`:''}`;
}
const formEnd=(label='저장')=>`<button>${e(label)}</button><p class="form-result" role="status" aria-live="polite"></p></form>`;
function field(name:string,title:string,value:unknown='',multi=false,max=100,required=false):string {
 const id=name+'-'+crypto.randomUUID();return `<div class="admin-field"><label for="${id}">${e(title)}${required?' (필수)':''}</label>${multi?`<textarea id="${id}" name="${e(name)}" maxlength="${max}" ${required?'required':''}>${e(value)}</textarea>`:`<input id="${id}" name="${e(name)}" value="${e(value)}" maxlength="${max}" ${required?'required':''}>`}</div>`;
}
function publicationForms(type:string,id:string,version:unknown,staff:StaffPrincipal):string {
 const base='/api/admin/'+type+'/'+encodeURIComponent(id);
 return ['published','hidden'].map(state=>formStart(base+'/publication',staff,version)+`<input type="hidden" name="publication_status" value="${state}">`+formEnd(state==='published'?'내용 확인 후 공개':'숨김')).join('')+(canAccess(staff,'delete_restore')?formStart(base+'/delete',staff,version)+field('reason','삭제 사유','',false,1000,true)+formEnd('복구 가능한 삭제'):'');
}
export function contentListPage(type:ContentType,rows:Record<string,unknown>[],staff:StaffPrincipal,result:{total:number;page:number;q:string;status:string;deleted:boolean}):Response {
 const params=(page:number)=>new URLSearchParams({q:result.q,status:result.status,deleted:result.deleted?'1':'0',page:String(page)});
 const filters=`<form class="search" action="/admin/${type}"><label for="content-q">이름 검색</label><input id="content-q" name="q" maxlength="100" value="${e(result.q)}"><label for="content-status">공개 상태</label><select id="content-status" name="status"><option value="">전체</option>${Object.entries(statuses).map(([value,label])=>`<option value="${value}" ${result.status===value?'selected':''}>${label}</option>`).join('')}</select>${canAccess(staff,'delete_restore')?`<label><input type="checkbox" name="deleted" value="1" ${result.deleted?'checked':''}>삭제된 항목</label>`:''}<button>검색</button></form>`;
 const pagination=`<nav class="pagination">${result.page>1?`<a href="?${e(params(result.page-1))}">이전</a>`:''}<span>${result.page}페이지 · ${result.total}개</span>${result.page*20<result.total?`<a href="?${e(params(result.page+1))}">다음</a>`:''}</nav>`;
 return adminPage(titles[type]+' 관리',`${type==='products'?catalogNotice:'<aside class="admin-workflow">① 작성 내용 저장 → ② 사진·PDF 첨부 및 검사 → ③ 미리보기 확인 → ④ 공개<br>공개 전 회사 자료와 게시 범위를 확인해주세요. 개발 예시 항목은 공개 사이트에서 제외됩니다.</aside>'}<div class="related"><a href="/admin/${type}/new">${titles[type]} 등록</a>${type==='products'?'<a href="/admin/categories">제품군 관리</a>':''}</div><p>작성 중 저장 후 내용을 확인하고 공개합니다.</p>${filters}${rows.length?`<div class="table-scroll"><table><thead><tr><th>이름</th><th>상태</th><th>수정일</th></tr></thead><tbody>${rows.map(row=>`<tr><td><a href="/admin/${type}/${encodeURIComponent(String(row.id))}">${e(row.name||row.title)}</a></td><td>${e(statuses[String(row.publication_status)])}</td><td>${e(row.updated_at)}</td></tr>`).join('')}</tbody></table></div>`:'<p>등록된 항목이 없습니다.</p>'}${pagination}`,staff);
}
export async function contentEditor(db:D1Database,type:ContentType,row:Record<string,unknown>|null,staff:StaffPrincipal):Promise<Response> {
 const id=row?.id as string|undefined;
 const data=row||{};let fields='';
 if(row?.deleted_at)return adminPage(titles[type]+' 복구',`<h2>${e(row.name||row.title)}</h2><p>삭제된 항목입니다. 복구하면 숨김 상태로 시작합니다.</p>`+formStart('/api/admin/'+type+'/'+encodeURIComponent(String(row.id))+'/restore',staff,row.version)+field('reason','복구 사유','',false,1000,true)+formEnd('숨김 상태로 복구'),staff);
 if(type==='products') {
  const categories=(await db.prepare('SELECT id,name FROM product_categories ORDER BY sort_order,id').all<{id:string;name:string}>()).results;
  const images=(await db.prepare("SELECT id,original_name FROM files WHERE (target_type IS NULL OR (target_type='products' AND target_id=?)) AND purpose='public_image' AND status='ready' AND validated_at IS NOT NULL AND deleted_at IS NULL AND mime IN('image/jpeg','image/png','image/webp')").bind(id||'').all<{id:string;original_name:string}>()).results;
  const alt=id?await db.prepare("SELECT alt FROM file_links WHERE product_id=? AND purpose='primary_image'").bind(id).first<{alt:string}>():null;
  fields=`<label>제품군 (필수)<select name="category_id" required>${categories.map(c=>`<option value="${e(c.id)}" ${data.category_id===c.id?'selected':''}>${e(c.name)}</option>`).join('')}</select></label>`+field('name','제품 이름',data.name,false,100,true)+field('intro','간단 소개',data.intro,true,300)+field('description','상세 설명',data.description,true,30000)+`<label>검사가 완료된 대표 사진<select name="image_id"><option value="">사진 미지정</option>${images.map(image=>`<option value="${e(image.id)}" ${data.primary_file_id===image.id?'selected':''}>${e(image.original_name)}</option>`).join('')}</select></label><p>아래에서 사진을 등록하고 검사가 완료되면 대표 사진으로 선택해주세요.</p>`+field('image_alt','사진 대체 설명',alt?.alt,false,300)+field('sort_order','목록 순서',data.sort_order||0)+`<label><input type="checkbox" name="featured" ${data.featured?'checked':''}>대표 제품 선정</label>`+field('featured_order','대표 제품 순서',data.featured_order||0);
 }else {
  fields=field('title','제목',data.title,false,150,true);
  if(type==='notices')fields+=field('body','공지 본문',data.body,true,30000)+`<label><input type="checkbox" name="pinned" ${data.pinned?'checked':''}>상단 고정</label>`;
  else fields+=field(type==='projects'?'work_type':'category',type==='projects'?'작업 종류':'자료 분류',data.work_type||data.category,false,100,true)+field('description','설명',data.description,true,30000)+(type==='projects'?field('approval_by','공개 확인자',data.approval_by)+field('approval_at','공개 확인일',data.approval_at,false,30):'');
 }
 if(type==='projects'||type==='resources'){
  const files=id?await fileRows(db,type,id):[],ready=files.filter(f=>f.status==='ready'),isPhoto=type==='projects',name=isPhoto?'image_id':'file_id',selected=isPhoto?data.primary_file_id:data.file_id;
  fields+=`<label>${isPhoto?'대표 사진':'공개 PDF 파일'}<select name="${name}"><option value="">미지정</option>${ready.map(f=>`<option value="${e(f.id)}" ${selected===f.id?'selected':''}>${e(f.original_name)}</option>`).join('')}</select></label>`;
 }
 let body=(type==='products'?catalogNotice:'<aside class="admin-workflow">내용 저장 후 첨부파일을 등록하세요. 검사가 끝난 사진·PDF를 선택하여 다시 저장한 뒤 미리보기와 공개를 진행합니다. 시공 사례는 공개 확인자·확인일과 대표 사진, 자료는 PDF가 필요합니다.</aside>')+`<p>상태: ${e(statuses[String(data.publication_status||'draft')])}</p>`+formStart('/api/admin/'+type+(id?'/'+encodeURIComponent(id):''),staff,data.version)+`<input type="hidden" name="saveMethod" value="${id?'PATCH':'POST'}">`+fields+formEnd('작성 내용 저장');
 if(id) {
  body+=await fileEditor(db,type,id,staff,Number(data.version));
  body+=`<section class="admin-actions"><a href="/admin/${type}/${encodeURIComponent(id)}/preview">미리보기</a>${publicationForms(type,id,data.version,staff)}</section>`;
  if(type==='products')body+=await modelsEditor(db,id,staff);
 }
 return adminPage(titles[type]+(id?' 수정':' 등록'),body,staff);
}
async function modelsEditor(db:D1Database,product:string,staff:StaffPrincipal):Promise<string> {
 const models=(await db.prepare('SELECT * FROM product_models WHERE product_id=? AND deleted_at IS NULL ORDER BY sort_order,id').bind(product).all<Record<string,unknown>>()).results;
 let body='<section><h2>모델·사양</h2>';
 for(const model of [...models,null]) {
  const id=model?.id as string|undefined,specs=id?(await db.prepare('SELECT name,value_text AS value,unit FROM model_specifications WHERE model_id=? ORDER BY sort_order,id').bind(id).all<Record<string,unknown>>()).results:[];
  if(id)body+=await fileEditor(db,'models',id,staff,Number(model?.version));
  body+=`<details class="model"><summary>${e(model?.name||'새 모델 등록')}</summary>`+formStart(`/api/admin/products/${encodeURIComponent(product)}/models${id?'/'+encodeURIComponent(id):''}`,staff,model?.version)+`<input type="hidden" name="saveMethod" value="${id?'PATCH':'POST'}">`+field('name','모델명',model?.name,false,100,true)+field('description','모델 설명',model?.description,true,30000)+`<label>취급 상태<select name="availability"><option value="available">상담 가능</option><option value="discontinued" ${model?.availability==='discontinued'?'selected':''}>취급 종료</option></select></label><div class="specifications">${[...specs,{},{}].map(spec=>`<div class="spec-row">${field('spec_name','사양명',spec.name)}${field('spec_value','값',spec.value,false,200)}${field('spec_unit','단위',spec.unit,false,30)}</div>`).join('')}</div><button type="button" data-add-spec>사양 항목 추가</button>`+formEnd('모델 저장');
  if(id)body+=publicationForms('products/'+encodeURIComponent(product)+'/models',id,model?.version,staff);
  body+='</details>';
 }return body+'</section>';
}
export async function categoriesPage(db:D1Database,staff:StaffPrincipal):Promise<Response> {
 const rows=(await db.prepare('SELECT * FROM product_categories ORDER BY sort_order,id').all<Record<string,unknown>>()).results;
 return adminPage('제품군 관리',[...rows,null].map(row=>formStart('/api/admin/categories'+(row?'/'+encodeURIComponent(String(row.id)):''),staff,row?.version)+`<input type="hidden" name="saveMethod" value="${row?'PATCH':'POST'}">`+field('name','제품군 이름',row?.name,false,100,true)+`<label>상위 제품군<select name="parent_id"><option value="">최상위</option>${rows.filter(r=>r.id!==row?.id).map(r=>`<option value="${e(r.id)}" ${r.id===row?.parent_id?'selected':''}>${e(r.name)}</option>`).join('')}</select></label>`+field('sort_order','표시 순서',row?.sort_order||0)+`<label><input type="checkbox" name="active" ${row===null||row.active?'checked':''}>사용</label>`+formEnd(row?'제품군 수정':'제품군 추가')).join(''),staff);
}
export function accountPage(staff:StaffPrincipal):Response {
 const labels:Record<string,string>={content_manager:'콘텐츠 관리자',inquiry_manager:'문의·견적 관리자',admin:'관리 책임자'};
 return adminPage('내 계정',`<p>${e(staff.name)} · ${e(staff.email)}</p><p>부여 역할: ${staff.roles.map(r=>e(labels[r])).join(', ')||'업무 역할 없음'}</p>${staff.roles.length?'':'<p>관리 책임자에게 업무 권한을 요청해주세요.</p>'}`,staff);
}
export function staffPage(rows:{id:string;name:string;email:string;status:string;version:number;roles:string[]}[],actor:StaffPrincipal,passwordMode=false,pending?:{name:string;email:string}):Response {
 const roleFields=(roles:string[])=>['content_manager','inquiry_manager','admin'].map((r,i)=>`<label><input type="checkbox" name="roles" value="${r}" ${roles.includes(r)?'checked':''}>${['콘텐츠 관리자','문의·견적 관리자','관리 책임자'][i]}</label>`).join('');
 let body='<h2>직원 초대</h2>'+(pending?'<p>확인한 콘텐츠 직원 정보를 준비했습니다. 내용을 확인하고 초대 링크를 만들어주세요.</p>':'')+formStart('/api/admin/staff',actor)+field('name','직원 이름',pending?.name||'',false,100,true)+field('email','개인 이메일',pending?.email||'',false,254,true)+roleFields(pending?['content_manager']:[])+formEnd('초대 링크 만들기');
 for(const row of rows)body+=`<details class="model"><summary>${e(row.name)} · ${e({active:'사용',invited:'초대 중',suspended:'중지'}[row.status])}</summary><p>${e(row.email)}</p>`+formStart('/api/admin/staff/'+encodeURIComponent(row.id)+'/roles',actor,row.version)+roleFields(row.roles)+field('reason','변경 사유','',false,1000,true)+formEnd('권한 변경')+formStart('/api/admin/staff/'+encodeURIComponent(row.id)+(row.status==='suspended'?'/activate':'/suspend'),actor,row.version)+field('reason','처리 사유','',false,1000,true)+formEnd(row.status==='suspended'?'사용 재개':'계정 중지')+(row.status==='invited'?formStart('/api/admin/staff/'+encodeURIComponent(row.id)+'/reinvite',actor,row.version)+field('reason','초대 재발급 사유','',false,1000,true)+formEnd('초대 링크 다시 발급'):'')+'</details>';
 if(passwordMode)for(const row of rows.filter(r=>r.status==='active'))body+=`<details><summary>${e(row.name)} 비밀번호 재설정</summary><p>본인 확인 후 링크를 발급하고 직접 전달해주세요. 링크는 1시간 유효하며 한 번만 사용할 수 있습니다.</p>`+formStart('/api/admin/staff/'+encodeURIComponent(row.id)+'/reset',actor,row.version)+`<label><input type="checkbox" name="confirmed" required>직원의 본인 확인을 마쳤습니다</label>`+field('reason','재설정 사유','',false,1000,true)+formEnd('재설정 링크 발급')+'</details>';
 return adminPage('직원 계정 관리',body,actor);
}
export async function contentPreview(db:D1Database,type:ContentType,row:Record<string,unknown>,staff:StaffPrincipal):Promise<Response> {
 const files=await fileRows(db,type,String(row.id));
 let content=`<p>직원에게만제공되는 작성 내용입니다. 미검사 파일은 표시하지 않습니다.</p><h2>${e(row.name||row.title)}</h2><p class="text">${e(row.intro)}</p><p class="text">${e(row.body||row.description)}</p>`;
 for(const file of files.filter(f=>f.status==='ready'&&(type!=='resources'||f.id===row.file_id)))content+=file.mime==='application/pdf'?`<p><a href="/api/admin/files/${e(file.id)}">${e(file.original_name)} 다운로드</a></p>`:`<figure><img class="content-photo" src="/api/admin/files/${e(file.id)}" alt="${e(file.alt)}"></figure>`;
 if(type==='products'){
  const models=(await db.prepare("SELECT id,name,description,availability,publication_status FROM product_models WHERE product_id=? AND deleted_at IS NULL ORDER BY sort_order,id").bind(row.id).all<Record<string,unknown>>()).results;
  for(const model of models){const specs=(await db.prepare('SELECT name,value_text,unit FROM model_specifications WHERE model_id=? ORDER BY sort_order,id').bind(model.id).all<Record<string,unknown>>()).results;
   content+=`<section><h2>${e(model.name)}</h2><p>${e(statuses[String(model.publication_status)])} · ${model.availability==='discontinued'?'취급 종료':'상담 가능'}</p><p>${e(model.description)}</p><dl>${specs.map(s=>`<dt>${e(s.name)}</dt><dd>${e(s.value_text)} ${e(s.unit)}</dd>`).join('')}</dl></section>`;
   for(const file of (await fileRows(db,'models',String(model.id))).filter(f=>f.status==='ready'))content+=`<img class="content-photo" src="/api/admin/files/${e(file.id)}" alt="${e(file.alt)}">`;
  }
 }
 return adminPage('공개 전 미리보기',content+`<a href="/admin/${type}/${e(row.id)}">수정으로 돌아가기</a>`,staff);
}

export async function fileEditor(db:D1Database,type:string,id:string,staff:StaffPrincipal,version:number){
 const rows=await fileRows(db,type,id),image=type!=='resources',accept=type==='resources'?'.pdf':type==='notices'?'.jpg,.jpeg,.png,.webp,.pdf':'.jpg,.jpeg,.png,.webp';
 const names:Record<string,string>={temporary:'업로드 대기',validating:'검사 중',ready:'검사 완료',blocked:'제공 불가'};
 return `<section class="file-editor"><h2>${image?'사진·첨부':'자료 파일'} 등록</h2><p>파일은 한 개씩 등록합니다. ${type==='resources'?'PDF 20MiB·공개 파일 1개':type==='notices'?'사진/PDF 10MiB·5개 합계 30MiB':'JPEG·PNG·WEBP 10MiB·20개 합계 100MiB'}. 내용을 먼저 저장한 뒤 파일을 등록해주세요. 검사 완료 후 ‘작성 내용 저장’을 눌러 연결합니다.</p><p>검사 서비스는 아직 미선정입니다. 현재 업로드는 검사 대기로 남고 미검사 파일은 제공되지 않습니다.</p><form class="admin-form" data-upload="/api/admin/${type}/${encodeURIComponent(id)}/uploads"><input type="hidden" name="csrf" value="${e(staff.csrf)}"><input type="hidden" name="expectedVersion" value="${version}"><label for="upload-${e(id)}">파일 선택</label><input id="upload-${e(id)}" type="file" name="file" accept="${accept}" required>${image?field('alt','사진 대체 설명','',false,300):''}<button>파일 등록</button><p class="form-result" role="status"></p></form><button type="button" data-refresh-files>검사 상태 새로고침</button>${rows.length?'<ul class="file-list">'+rows.map(f=>`<li><strong>${e(f.original_name)}</strong> · ${e(names[String(f.status)]||f.status)}${f.status==='ready'?(f.attached?' · 연결됨':' · 연결 대기'):''}${f.scan_reason?`<p>${e(f.scan_reason)}</p>`:''}${f.status==='ready'?`<a href="/api/admin/files/${e(f.id)}">${f.mime==='application/pdf'?'파일 다운로드':'사진 보기'}</a>`:''}${formStart('/api/admin/files/'+encodeURIComponent(String(f.id))+'/remove',staff,f.version)+formEnd('연결에서 제거')}</li>`).join('')+'</ul>':'<p>등록된 파일이 없습니다.</p>'}</section>`;
}
