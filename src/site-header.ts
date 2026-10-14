import {animatedIcon} from './animated-icons.ts';
import {menu} from "./site-content.ts";
import {escapeHtml as e} from "./html-utils.ts";
const link=(path:string,title:string)=>`<a href="${e(path)}">${e(title)}</a>`;
export function styleGuideHeader(path="/style-guide"){
 const navigation=menu.map((group,i)=>`<div class="nav-group" data-menu-index="${i}"><a href="${e(group.path)}" aria-controls="guide-header-panel" aria-expanded="false"><span class="depth1-label">${e(group.title)}</span></a></div>`).join('');
 const panel=`<div id="guide-header-panel" class="guide-header-panel" aria-hidden="true" inert><div class="guide-header-panel-list">${menu.map((group,i)=>`<div class="guide-header-panel-col" data-menu-index="${i}">${group.links.map(item=>link(item.path,item.title)).join('')}</div>`).join('')}</div></div>`;
 return `<header class="site-header"><a class="brand" href="/" aria-label="지엔씨쿨링 홈"><img class="guide-logo guide-logo-color" src="/brand/gnc-color.png" alt="" width="1466" height="267"><img class="guide-logo guide-logo-white" src="/brand/gnc-white.png" alt="" width="1466" height="267"></a><nav class="desktop-nav" aria-label="주 메뉴">${navigation}</nav><a class="header-phone" href="tel:15223201" aria-label="지엔씨쿨링 대표 전화 1522-3201">${animatedIcon('phone-call','header-phone-icon')}<span class="header-phone-number">1522-3201</span></a>${panel}<details class="mobile-menu"><summary aria-label="전체 메뉴"><span class="menu-word">menu</span><span class="ai-menu-symbol">${animatedIcon('ellipsis-vertical','ai-menu-open')}${animatedIcon('x','ai-menu-close')}</span></summary><nav aria-label="모바일 주 메뉴">${menu.map(g=>`<details><summary>${e(g.title)}</summary>${link(g.path,g.title+' 전체 보기')}${g.links.map(l=>link(l.path,l.title)).join('')}</details>`).join('')}</nav></details></header>`;
}

export function publicLocation(title:string,path:string){
 const group=menu.find(g=>g.path===path||g.links.some(l=>l.path.split('?')[0]===path));
 const current=group?.links.find(l=>l.path===path);
 const locationTitle=current?.title||title;
 return `<nav class="ui-location" aria-label="현재 위치"><a class="ui-location-home" href="/" aria-label="홈">${animatedIcon('house')}</a><details class="ui-location-select"><summary>${e(group?.title||'홈페이지')}${animatedIcon('chevron-right','ai-location-chevron')}</summary><div>${menu.map(g=>link(g.path,g.title)).join('')}</div></details><details class="ui-location-select"><summary><span aria-current="page">${e(locationTitle)}</span>${animatedIcon('chevron-right','ai-location-chevron')}</summary><div>${group?group.links.map(l=>link(l.path,l.title)).join(''):link('/', '홈으로')}</div></details></nav>`;
}
