// Public navigation motion. No data submission or authentication behavior.
(() => {
 const locationLabel=document.querySelector('#guide-location-label');
 if(locationLabel||document.querySelector('.ui-location')){
  const names={foundation:'색상과 글자',layout:'구조와 여백',controls:'버튼과 탐색',product:'제품 구성',states:'입력과 상태',admin:'관리자 기준',reference:'벤치마킹 디테일',tween:'Tween UI','guide-footer':'푸터 시안'};
  const syncLocation=()=>{if(locationLabel)locationLabel.textContent=names[location.hash.slice(1)]||'디자인 기준';};
  window.addEventListener('hashchange',syncLocation);syncLocation();
  const selections=[...document.querySelectorAll('.ui-location-select')];
  selections.forEach(item=>{
   item.addEventListener('toggle',()=>{if(item.open)selections.forEach(other=>{if(other!==item)other.open=false;});});
   item.addEventListener('click',event=>{if(event.target.closest('a'))item.open=false;});
   item.addEventListener('keydown',event=>{if(event.key==='Escape'){item.open=false;item.querySelector('summary').focus();}});
  });
  document.addEventListener('click',event=>{if(!event.target.closest('.ui-location'))selections.forEach(item=>item.open=false);});
 }
 const header=document.querySelector('.site-header');if(!header)return;
 const menu=header.querySelector('.mobile-menu'),trigger=menu?.querySelector('summary'),nav=menu?.querySelector('nav');if(!menu||!trigger||!nav)return;
 const regions=[document.querySelector('main'),document.querySelector('footer'),document.querySelector('.guide-location-bar'),document.querySelector('.preview'),header.querySelector('.brand'),header.querySelector('.inquiry-link'),header.querySelector('.desktop-nav'),header.querySelector('.header-phone')].filter(Boolean);
 const desktop=header.querySelector('.desktop-nav');
 header.classList.add('header-enhanced');
 const desktopQuery=window.matchMedia('(min-width:1025px)');
 const panel=header.querySelector('.guide-header-panel');
 const primary=[...desktop.querySelectorAll('.nav-group')];
 const columns=[...header.querySelectorAll('.guide-header-panel-col')];
 const closeDesktop=()=>{header.classList.remove('dropdown-is-open');primary.forEach(g=>{g.classList.remove('is-active');g.querySelector('a').setAttribute('aria-expanded','false');});if(panel){panel.inert=true;panel.setAttribute('aria-hidden','true');}};
 const openDesktop=index=>{if(menu.open||!desktopQuery.matches||!panel)return;header.classList.add('dropdown-is-open');panel.inert=false;panel.setAttribute('aria-hidden','false');primary.forEach(g=>{const active=g.dataset.menuIndex===String(index);g.classList.toggle('is-active',active);g.querySelector('a').setAttribute('aria-expanded',String(active));});};
 [...primary,...columns].forEach(g=>{g.addEventListener('mouseenter',()=>openDesktop(g.dataset.menuIndex));g.addEventListener('focusin',()=>openDesktop(g.dataset.menuIndex));});
 header.addEventListener('mouseleave',closeDesktop);
 header.addEventListener('focusout',event=>{if(!header.contains(event.relatedTarget))closeDesktop();});
 desktopQuery.addEventListener('change',()=>{closeDesktop();if(desktopQuery.matches&&menu.open)menu.open=false;});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&header.classList.contains('dropdown-is-open')){closeDesktop();document.activeElement?.blur();}});
 const update=()=>header.classList.toggle('is-scrolled',window.scrollY>40);
 window.addEventListener('scroll',update,{passive:true});update();
 trigger.setAttribute('aria-expanded','false');nav.id='public-full-menu';trigger.setAttribute('aria-controls',nav.id);
 menu.addEventListener('toggle',()=>{
  const open=menu.open;if(open)closeDesktop();header.classList.toggle('menu-is-open',open);document.body.classList.toggle('public-menu-open',open);
  trigger.setAttribute('aria-expanded',String(open));trigger.setAttribute('aria-label',open?'메뉴 닫기':'전체 메뉴');
  regions.forEach(node=>node.inert=open);
 });
 document.addEventListener('keydown',event=>{
  if(!menu.open)return;
  if(event.key==='Escape'){event.preventDefault();menu.open=false;trigger.focus();return;}
  if(event.key!=='Tab')return;
  const targets=[...menu.querySelectorAll('summary,a[href]')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
  const first=targets[0],last=targets.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 });
 nav.addEventListener('click',event=>{if(event.target.closest('a'))menu.open=false;});
})();

document.querySelectorAll('.project-gallery').forEach(gallery=>{
 const track=gallery.querySelector('.project-gallery-track');
 const buttons=gallery.querySelectorAll('.project-gallery-arrow');
 const update=()=>{buttons[0].disabled=track.scrollLeft<=1;buttons[1].disabled=track.scrollLeft+track.clientWidth>=track.scrollWidth-1;};
 buttons.forEach((button,i)=>button.addEventListener('click',()=>track.scrollBy({left:(i?1:-1)*((track.querySelector('.project-gallery-card')?.getBoundingClientRect().width||300)+16),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})));
 track.addEventListener('scroll',update);window.addEventListener('resize',update);update();
});
