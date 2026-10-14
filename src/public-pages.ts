import {homeEditorial} from './home-editorial.ts';
import {companyProfile as company} from './company-profile.ts';
import {siteFooter} from './site-footer.ts';
import {editorialContent,imageCredits,referenceFigure} from './editorial-content.ts';
import {animateTextArrows} from './animated-icons.ts';
import {pageEnglishLabel} from './page-labels.ts';
import {styleGuideHeader,publicLocation} from './site-header.ts';
import { businesses, companyPages, menu, staticPages } from './site-content.ts';
import type { Product, ProductDetail, ProductList } from './catalog.ts';
import {escapeHtml} from './html-utils.ts';
export {escapeHtml} from './html-utils.ts';
const e=escapeHtml;
const link=(path:string,title:string)=>`<a href="${e(path)}">${e(title)}</a>`;
export function htmlPage(title:string,content:string,path:string,status=200): Response {
 const headingMatch=content.match(/^<section class="page-heading">[\s\S]*?<\/section>/);
 const topHero=headingMatch?headingMatch[0].replace('class="page-heading"','class="ui-public-hero"').replace(/<p class="eyebrow">[^<]*<\/p>/,`<p class="eyebrow">${e(pageEnglishLabel(path))}</p>`):'';
 const homeMatch=!headingMatch&&path==='/'?content.match(/^<section class="hero home-hero[^"]*">[\s\S]*?<\/section>/):null;
 const visual=topHero||(homeMatch?homeMatch[0]:'');
 const pageContent=headingMatch?content.slice(headingMatch[0].length):homeMatch?content.slice(homeMatch[0].length):content;
 const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${e(title)} | 지엔씨쿨링</title><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/site-ui.css"><link rel="stylesheet" href="/site-theme.css"><link rel="stylesheet" href="/animated-icons.css"><script src="/site-header.js" defer></script>${path==='/'?'<link rel="stylesheet" href="/tween-ui.css"><script src="/home-products.js" defer></script>':''}</head><body class="ui-guide site-live ${path==='/'?'home-editorial-page':''}"><a class="skip" href="#content">본문 바로가기</a><div class="guide-visual-shell">${styleGuideHeader(path)}${visual}</div>${path==='/'?'':`<div class="guide-location-bar">${publicLocation(title,path)}</div>`}<main id="content" class="ui-main">${pageContent}</main>${siteFooter()}</body></html>`;
 return new Response(animateTextArrows(html),{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'self'; font-src 'self'; style-src 'self'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"}});
}
export const heading=(title:string,subtitle:string)=>`<section class="page-heading"><p class="eyebrow">GNC COOLING</p><h1>${e(title)}</h1><p>${e(subtitle)}</p></section>`;
const cards=(items:{path:string;title:string;message?:string}[])=>`<div class="cards">${items.map((item,i)=>`<a class="card" href="${e(item.path)}"><span>0${i+1}</span><h2>${e(item.title)}</h2>${item.message?`<p>${e(item.message)}</p>`:''}<strong>자세히 보기 ↗</strong></a>`).join('')}</div>`;
const pending=(title:string,body:string)=>`<section class="notice pending-content"><p class="status-label">회사 자료 확인 전</p><h2>${e(title)}</h2><p>${e(body)}</p></section>`;
const steps=(items:{title:string;body:string}[])=>`<ol class="guide-steps">${items.map(v=>`<li><h3>${e(v.title)}</h3><p>${e(v.body)}</p></li>`).join('')}</ol>`;
const businessPreparation:Record<string,string[]>={
 'cooling-tower-installation':['현장 지역과 설치 공간','기존 설비 유무와 모델명','필요한 작업과 희망 일정'],
 'cooling-tower-repair':['현장 지역과 기존 냉각탑 정보','발생한 증상과 확인 시점','요청하는 점검·보수 내용'],
 'factory-piping':['현장 지역과 배관 관련 설비','신규 설치인지 기존 배관 보수인지','요청하는 작업과 현장 조건'],
 'cooling-system':['적용하려는 설비와 현장 지역','기존 냉각 설비 정보','검토가 필요한 조건과 문의 내용'],
};
export function staticContent(path:string): Response | null {
 const page=staticPages.find(p=>p.path===path);if(!page)return null;
 let body='';
 if(path==='/image-credits')body=imageCredits();
 else if(path==='/company/greeting')body=`<section class="reading-section"><p class="eyebrow">CEO</p><h2>${e(company.ceoTitle)} ${e(company.ceo)}</h2><p>${e(company.tagline)} ${e(company.name)}</p></section>`+`<section class="reading-section"><h2>회사와 업무 안내</h2><p>회사 기본정보와 사업분야는 아래에서 확인할 수 있습니다.</p><div class="related">${link('/company/about','회사 개요·연혁')}${link('/business','사업분야')}</div></section>`;
 else if(path==='/company/about')body=`<section class="reading-section"><h2>회사 기본정보</h2><dl class="information-list"><div><dt>회사명</dt><dd>${e(company.name)}</dd></div><div><dt>영문 표기</dt><dd>${e(company.englishName)}</dd></div><div><dt>대표이사</dt><dd>${e(company.ceo)}</dd></div><div><dt>사업장 주소</dt><dd>${e(company.address)}</dd></div><div><dt>주요 업무</dt><dd>${company.businesses.map(e).join('<br>')}</dd></div><div><dt>설립 정보·주요 연혁</dt><dd>공개 가능한 기록 확인 중</dd></div></dl><p>${e(company.sourceNote)}</p></section>`+pending('추가 회사 소개 자료를 준비하고 있습니다','주요 연혁과 사진을 확인한 뒤 반영하겠습니다. 확인되지 않은 규모·실적·인증은 안내하지 않습니다.')+`<div class="related">${link('/business','사업분야 보기')}${link('/company/certifications','인증서 안내')}</div>`;
 else if(path==='/company/certifications')body=pending('공개 가능한 인증 자료 확인 중','인증 명칭·유효기간·증서 공개 여부를 회사에서 확인한 뒤 게시합니다. 현재 표시할 수 있는 인증 자료가 없습니다.')+`<div class="related">${link('/resources','기술자료·카탈로그')}${link('/company/about','회사 개요')}</div>`;
 else if(path==='/company/location')body=`<section class="reading-section"><h2>방문·연락 안내</h2><dl class="information-list"><div><dt>사업장 주소</dt><dd>${e(company.address)}<br><a class="text-link" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(company.address)}" target="_blank" rel="noopener noreferrer">지도에서 주소 검색 ↗</a></dd></div><div><dt>대표 전화</dt><dd><a href="${company.phoneHref}">${company.phone}</a></dd></div><div><dt>사무실 전화</dt><dd><a href="${company.officePhoneHref}">${company.officePhone}</a></dd></div><div><dt>팩스</dt><dd>${company.fax}</dd></div><div><dt>대표이사 연락처</dt><dd><a href="${company.mobileHref}">${company.mobile}</a></dd></div><div><dt>이메일</dt><dd><a href="mailto:${e(company.email)}">${e(company.email)}</a></dd></div><div><dt>홈페이지 주소</dt><dd>${e(company.website)}</dd></div><div><dt>방문·상담 시간</dt><dd>회사 운영시간 확인 후 안내</dd></div></dl><p>${e(company.sourceNote)}</p></section>`+pending('방문·온라인 접수 안내','방문 일정은 대표 전화로 먼저 문의해주세요. 온라인 문의 접수는 준비 중입니다.')+`<div class="related">${link('/inquiries','온라인 문의 운영 안내')}${link('/support/as','A/S 안내')}</div>`;
 else if(path==='/business')body=cards(businesses)+`<section class="reading-section"><h2>관심 분야부터 살펴보세요</h2><p>아래 상세 화면에서 상담에 필요한 정보를 확인할 수 있습니다. 분야별 실제 제공 범위와 현장 사진은 회사 확인 후 안내합니다.</p><div class="related">${link('/products','제품 보기')}${link('/projects','시공·납품 사례')}${link('/inquiries','견적·상담 안내')}</div></section>`;
 else if(path.startsWith('/business/')){
  const business=businesses.find(b=>b.path===path)!;const source=path.split('/').pop()!;
  body=`<section class="reading-section"><h2>상담을 위해 정리할 정보</h2><p>접수가 열리면 아래 정보를 바탕으로 문의할 수 있습니다. 모르는 모델이나 사양을 임의로 채울 필요는 없습니다.</p><ul class="check-list">${businessPreparation[source].map(item=>`<li>${e(item)}</li>`).join('')}</ul></section><section class="reading-section"><h2>제품과 사례 살펴보기</h2><p>공개된 제품·시공 사례·기술자료는 각 목록에서 확인할 수 있습니다.</p><div class="related">${link('/products','제품소개')}${link('/projects','시공·납품 사례')}${link('/resources','기술자료·카탈로그')}</div></section><section class="contact"><p class="eyebrow">CONSULTATION</p><h2>${e(business.title)} 문의</h2><p>온라인 접수는 준비 중입니다. 문의 안내에서 선택한 분야를 확인할 수 있습니다.</p><a class="button" href="/inquiries?source=${e(source)}&amp;work=${business.work}">이 분야 문의 안내</a>${link('/business','전체 사업분야')}</section>`;
 }else if(path==='/support/as')body=`<section class="notice"><h2>A/S 상담 안내</h2><p>대표 전화 <a href="${company.phoneHref}">${company.phone}</a> 또는 사무실 <a href="${company.officePhoneHref}">${company.officePhone}</a>로 문의해주세요. 현재 온라인 신청은 준비 중이며, 문의가 방문·출동 확정을 뜻하지 않습니다.</p></section>`+`<section class="reading-section"><h2>A/S 상담 시 확인할 정보</h2>`+steps([{title:'현장과 설비',body:'현장 지역, 설비명·모델과 연락받을 정보를 정리합니다.'},{title:'증상과 발생 시점',body:'알고 있는 증상과 발생 시점을 설명합니다. 모르는 사양은 비워둘 수 있습니다.'},{title:'회사와 처리 범위 확인',body:'접수 운영이 시작되면 회사 상담을 통해 필요한 확인과 처리 범위를 안내받습니다.'}])+`</section><div class="related"><a class="button" href="/inquiries?kind=as">A/S 문의 안내</a>${link('/company/location','회사 연락 안내')}</div>`;
 else body=pending('개인정보 안내 승인 전','수집 항목·목적·보관 기간과 문의 창구가 확정된 안내를 회사 확인 후 게시합니다. 현재 온라인 문의로 개인정보를 입력받지 않습니다.')+`<div class="related">${link('/inquiries','문의 운영 안내')}${link('/company/location','회사 연락 안내')}</div>`;
 return htmlPage(page.title,heading(page.title,page.message)+editorialContent(path)+body,path);
}
export interface HomeContent {
 products:Product[];
 projects:{id:string;title:string;work_type:string;image_id:string;image_alt:string}[];
 resources:{id:string;title:string;category:string;file_id:string}[];
 notices:{id:string;title:string;posted_at:string;pinned:number}[];
}
export const productCards=(items:Product[])=>`<div class="product-grid">${items.map(p=>`<article class="product-card"><a href="/products/${encodeURIComponent(p.id)}"><img src="/api/product-images/${encodeURIComponent(p.image_id)}" alt="${e(p.image_alt)}" loading="lazy"><div><small>${e(p.category_name)}</small><h2>${e(p.name)}</h2><p>${e(p.intro)}</p><strong>제품 상세 ↗</strong></div></a></article>`).join('')}</div>`;
export function homePage(data:HomeContent):Response {return htmlPage('홈',homeEditorial(data),'/');}
export function placeholderPage(path:string):Response|null {
 const titles:Record<string,string>={'/projects':'시공·납품 사례','/resources':'기술자료·카탈로그','/notices':'공지사항','/inquiries':'문의 신청'};
 const title=titles[path];if(!title)return null;
 const message=path==='/inquiries'?'온라인 문의 신청을 준비 중입니다. 현재 이 페이지에서는 개인정보 입력이나 신청 접수를 받지 않습니다.':'공개 가능한 자료를 확인하고 있습니다. 현재 목록 조회 기능은 준비 중입니다.';
 return htmlPage(title,heading(title,message)+`<section class="notice"><h2>준비 중입니다</h2><p>서비스 준비가 완료되면 이 화면에서 안내하겠습니다.</p>${link('/company/location','회사 연락 안내')}${link('/products','제품 살펴보기')}</section>`,path);
}
export function productListPage(data:ProductList):Response {
 const {items,categories,total,page,pageSize,q,category}=data;
 const options=categories.map(c=>`<option value="${e(c.id)}" ${category===c.id?'selected':''}>${e(c.parent_id?'↳ '+c.name:c.name)}</option>`).join('');
 const unknown=category&&!categories.some(c=>c.id===category)?`<option selected value="${e(category)}">선택한 분류</option>`:'';
 const results=items.length?productCards(items):`<div class="notice"><h2>${q||category||page>1?'검색 결과가 없습니다':'공개 제품을 준비 중입니다'}</h2><p>${q||category||page>1?'검색 조건을 바꾸거나 전체 제품을 확인해주세요.':'확인된 제품 설명과 사진·사양을 등록한 뒤 안내하겠습니다.'}</p>${link('/products','전체 제품 보기')}${link('/business','사업분야 보기')}</div>`;
 const pageUrl=(target:number)=>'/products?'+new URLSearchParams({q,category,page:String(target),pageSize:String(pageSize)});
 return htmlPage('제품소개',heading('제품소개','제품군과 이름으로 제품을 찾고, 상세 화면에서 모델별 사양을 확인하세요.')+editorialContent('/products')+`<form class="search" action="/products" method="get"><div class="search-field"><label for="product-category">제품군</label><select id="product-category" name="category"><option value="">전체 제품군</option>${unknown}${options}</select></div><div class="search-field"><label for="product-search">제품명</label><input id="product-search" type="search" name="q" maxlength="100" value="${e(q)}" placeholder="제품명 검색"></div><button type="submit">검색</button>${link('/products','초기화')}</form><p class="result-count">공개 제품 ${total}개 · ${page}페이지</p>${results}<nav class="pagination" aria-label="제품 페이지">${page>1?link(pageUrl(page-1),'← 이전'):''}<span>${page} / ${Math.max(1,Math.ceil(total/pageSize))}</span>${page*pageSize<total?link(pageUrl(page+1),'다음 →'):''}</nav>`, '/products');
}
export function productDetailPage(product:ProductDetail):Response {
 const p=product;
 const models=p.models.map((m,i)=>`<details class="model" ${i===0?'open':''}><summary>${e(m.name)} · ${m.availability==='available'?'상담 가능':'취급 종료'}</summary><p class="text">${e(m.description)}</p>${(m.images||[]).map(image=>`<img class="content-photo" src="/api/content-files/${e(image.id)}" alt="${e(image.alt)}">`).join('')}${m.availability==='discontinued'?'<p>취급이 종료된 모델입니다. 후속 상담은 문의 안내를 확인해주세요.</p>':''}<div class="table-scroll" tabindex="0" role="region" aria-label="${e(m.name)} 사양표"><table><caption>${e(m.name)} 사양</caption><thead><tr><th scope="col">항목</th><th scope="col">값</th><th scope="col">단위</th></tr></thead><tbody>${m.specifications.map(s=>`<tr><th scope="row">${e(s.name)}</th><td>${e(s.value_text||'미입력')}</td><td>${e(s.unit||'—')}</td></tr>`).join('')}</tbody></table></div><a class="button" href="/inquiries?product=${encodeURIComponent(p.id)}&amp;model=${encodeURIComponent(m.id)}">이 모델 문의 안내</a></details>`).join('');
 return htmlPage(p.name,heading(p.name,p.intro)+`<section class="product-overview"><img src="/api/product-images/${encodeURIComponent(p.image_id)}" alt="${e(p.image_alt)}"><div><p class="eyebrow">${e(p.category_name)}</p><h2>제품 안내</h2><p class="text">${e(p.description)}</p>${p.id.startsWith('demo-20261013-')?'<p class="image-attribution"><a href="/image-credits">참고 이미지 출처·사용 조건</a></p>':''}</div></section><section><h2>모델·사양</h2>${models||'<p>제품 공통 설명을 확인해주세요. 공개된 모델 사양은 아직 없습니다.</p>'}</section>${p.images.length?`<section><h2>제품 사진</h2><div class="product-grid">${p.images.map(image=>`<figure><img src="/api/product-images/${encodeURIComponent(image.id)}" alt="${e(image.alt)}" loading="lazy"><figcaption>${e(image.caption)}</figcaption></figure>`).join('')}</div></section>`:''}<section><h2>관련 정보</h2><p>연결 자료와 시공 사례는 확인 후 안내하겠습니다.</p><div class="related">${link('/resources','기술자료·카탈로그')}${link('/projects','시공·납품 사례')}</div></section><section class="contact"><h2>이 제품에 대해 상담이 필요하신가요?</h2><a class="button" href="/inquiries?product=${encodeURIComponent(p.id)}">이 제품 문의 안내</a>${link('/products','제품 목록으로')}</section>`, '/products');
}
export function publicError(path:string,status:number,message:string):Response {
 return htmlPage(status===404?'페이지를 찾을 수 없습니다':'조회 안내',heading(status===404?'제공할 수 없는 페이지입니다':'조회할 수 없습니다',message)+`<section class="notice">${link(path,'다시 확인')}${link('/products','제품 목록')}${link('/','홈으로')}</section>`,path,status);
}

export function authenticationPlaceholder(path:string,status:401|503):Response {
 const title=path.startsWith('/admin')?'직원 로그인':'내 문의 확인';
 const response=htmlPage(title,heading(title,'인증 기능을 준비 중입니다.')+'<section class="notice"><h2>아직 이용할 수 없습니다</h2><p>인증과 권한 확인 기능이 준비되면 안내하겠습니다. 현재 비공개 문의와 관리자 자료는 제공하지 않습니다.</p>'+link('/','홈으로')+link('/company/location','회사 연락 안내')+'</section>',path,status);
 response.headers.set('Cache-Control','private, no-store');
 return response;
}
