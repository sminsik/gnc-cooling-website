import {catalogProducts,productCategories} from './product-data.ts';
import {companyProfile as company} from './company-profile.ts';
import {animatedIcon} from './animated-icons.ts';
import {menu} from "./site-content.ts";
import {escapeHtml as e} from "./html-utils.ts";
const link=(path:string,title:string)=>`<a href="${e(path)}"><span class="nav-link-label">${e(title)}</span></a>`;
export function styleGuideHeader(path="/style-guide"){
 const navigation=menu.map((group,i)=>`<div class="nav-group" data-menu-index="${i}"><a href="${e(group.path)}" aria-controls="guide-header-panel" aria-expanded="false"><span class="depth1-label">${e(group.title)}</span></a></div>`).join('');
 const panel=`<div id="guide-header-panel" class="guide-header-panel" aria-hidden="true" inert><div class="guide-header-panel-list">${menu.map((group,i)=>`<div class="guide-header-panel-col" data-menu-index="${i}">${group.links.map(item=>link(item.path,item.title)).join('')}</div>`).join('')}</div></div>`;
 return `<header class="site-header"><a class="brand" href="/" aria-label="지엔씨쿨링 홈"><img class="guide-logo guide-logo-color" src="/brand/gnc-color.png" alt="" width="1466" height="267"><img class="guide-logo guide-logo-white" src="/brand/gnc-white.png" alt="" width="1466" height="267"></a><nav class="desktop-nav" aria-label="주 메뉴">${navigation}</nav><a class="header-phone" href="tel:15223201" aria-label="지엔씨쿨링 대표 전화 1522-3201">${animatedIcon('phone-call','header-phone-icon')}<span class="header-phone-number">1522-3201</span></a>${panel}<details class="mobile-menu"><summary aria-label="전체 메뉴"><span class="menu-word">menu</span><span class="compact-menu-glyph" aria-hidden="true"></span></summary><nav aria-label="모바일 주 메뉴"><p class="mobile-menu-caption">EXPLORE G&amp;C COOLING</p><div class="mobile-menu-groups">${menu.map((g,i)=>`<details><summary><span class="mobile-menu-number">${String(i+1).padStart(2,'0')}</span><span>${e(g.title)}</span><span class="mobile-menu-plus" aria-hidden="true"></span></summary><div class="mobile-submenu">${link(g.path,g.title+' 전체 보기')}${g.links.map(l=>link(l.path,l.title)).join('')}</div></details>`).join('')}</div><div class="mobile-menu-footer"><span class="mobile-contact-label">설비 상담 · 제품 문의</span><a class="mobile-contact-phone" href="${company.phoneHref}">${e(company.phone)}<span aria-hidden="true">↗</span></a><p>© G&amp;C COOLING. All rights reserved.</p></div></nav></details></header><button class="site-back-to-top" type="button" aria-label="페이지 맨 위로 이동" title="위로 가기" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>`;
}

export function publicLocation(title:string,path:string){
 const [pathname,query='']=path.split('?');
 const group=menu.find(g=>g.path===pathname||pathname.startsWith(g.path+'/')||g.links.some(l=>l.path.split('?')[0]===pathname));
 const product=catalogProducts.find(p=>pathname==='/products/'+p.id);
 const category=product?.category||new URLSearchParams(query).get('category');
 const productCategory=productCategories.find(c=>c.id===category);
 const current=group?.links.find(l=>l.path===path);
 const selection=(label:string,links:{path:string;title:string}[],current=false)=>`<details class="ui-location-select"><summary><span${current?' aria-current="page"':''}>${e(label)}</span>${animatedIcon('chevron-right','ai-location-chevron')}</summary><div>${links.map(l=>link(l.path,l.title)).join('')}</div></details>`;
 const categoryLinks=[{path:'/products',title:'전체 제품'},...productCategories.map(c=>({path:'/products?category='+c.id,title:c.name}))];
 let levels=selection(group?.title||'홈페이지',menu);
 if(product&&productCategory){
  levels+=selection(productCategory.name,categoryLinks);
  levels+=selection(product.name,catalogProducts.filter(p=>p.category===product.category).map(p=>({path:'/products/'+p.id,title:p.name})),true);
 }else levels+=selection(productCategory?.name||current?.title||title,pathname==='/products'?categoryLinks:group?.links||[{path:'/',title:'홈으로'}],true);
 return `<nav class="ui-location${product?' ui-location-product':''}" aria-label="현재 위치"><a class="ui-location-home" href="/" aria-label="홈">${animatedIcon('house')}</a>${levels}</nav>`;
}
