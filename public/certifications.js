

(() => {
 const track=document.querySelector('.cert-gallery-track');
 if(!track)return;
 const cards=[...track.querySelectorAll('.cert-card')],reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const prev=document.querySelector('[data-cert-prev]'),next=document.querySelector('[data-cert-next]');
 let frame=0,drag=null,suppress=false;
 const go=card=>{if(card)track.scrollTo({left:card.offsetLeft-track.offsetLeft,behavior:reduced.matches?'instant':'smooth'});};
 const nearest=()=>cards.reduce((best,c,i)=>Math.abs(c.offsetLeft-track.offsetLeft-track.scrollLeft)<Math.abs(cards[best].offsetLeft-track.offsetLeft-track.scrollLeft)?i:best,0);
 function update(){frame=0;const index=nearest(),max=track.scrollWidth-track.clientWidth;
  const viewport=track.closest('.cert-gallery-viewport'),paper=cards[index]?.querySelector('.cert-image');
  if(viewport&&paper){const r=paper.getBoundingClientRect(),v=viewport.getBoundingClientRect();viewport.style.setProperty('--cert-arrow-y',`${r.top-v.top+r.height/2}px`);}
  prev.disabled=track.scrollLeft<2;next.disabled=track.scrollLeft>=max-2;
  document.querySelector('[data-cert-progress]').style.transform=`scaleX(${max>0?track.scrollLeft/max:1})`;
  cards.forEach(c=>{const distance=c.getBoundingClientRect().left-track.getBoundingClientRect().left;const img=c.querySelector('img');img.style.transform='none';c.style.transform=reduced.matches?'none':`translateX(${Math.max(-10,Math.min(10,distance*.025))}px)`;});
  document.querySelectorAll('[data-cert-group]').forEach(a=>{if(a.dataset.certGroup===cards[index].dataset.certCategory)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');});
  const active=document.querySelector('[data-cert-group][aria-current]'),indicator=document.querySelector('.cert-nav-indicator');
  if(active&&indicator){indicator.style.width=active.offsetWidth+'px';indicator.style.transform=`translateX(${active.offsetLeft}px)`;}
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(update);}
 prev.addEventListener('click',()=>go(cards[Math.max(0,nearest()-1)]));next.addEventListener('click',()=>go(cards[Math.min(cards.length-1,nearest()+1)]));
 document.querySelectorAll('[data-cert-group]').forEach(a=>{const first=cards.find(c=>c.dataset.certCategory===a.dataset.certGroup);a.href='#'+first.id;a.addEventListener('click',e=>{e.preventDefault();go(first);});});
 track.addEventListener('keydown',e=>{if(e.target!==track)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();go(cards[Math.max(0,Math.min(cards.length-1,nearest()+(e.key==='ArrowRight'?1:-1)))]);}});
 track.addEventListener('wheel',e=>{if(e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;const max=track.scrollWidth-track.clientWidth;if((e.deltaY>0&&track.scrollLeft<max-2)||(e.deltaY<0&&track.scrollLeft>2)){e.preventDefault();track.scrollLeft+=e.deltaY*(e.deltaMode===1?20:e.deltaMode===2?track.clientWidth:1);}},{passive:false});
 track.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0||e.target.closest('.cert-download,.cert-info-toggle'))return;drag={x:e.clientX,left:track.scrollLeft,id:e.pointerId};suppress=false;});
 track.addEventListener('pointermove',e=>{if(!drag)return;const diff=e.clientX-drag.x;if(Math.abs(diff)>6){suppress=true;track.setPointerCapture(drag.id);track.classList.add('is-dragging');}if(suppress)track.scrollLeft=drag.left-diff;});
 const end=()=>{drag=null;track.classList.remove('is-dragging');};track.addEventListener('pointerup',end);track.addEventListener('pointercancel',end);track.addEventListener('lostpointercapture',end);
 track.addEventListener('click',e=>{if(suppress){e.preventDefault();e.stopImmediatePropagation();suppress=false;}},true);
 track.addEventListener('dragstart',e=>e.preventDefault());track.addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);track.querySelectorAll('img').forEach(img=>img.addEventListener('load',schedule));update();
})();

(() => {
 document.querySelectorAll('.cert-info-toggle').forEach(button=>{
  button.addEventListener('click',()=>{
   const card=button.closest('.cert-card');
   const open=!card.classList.contains('info-open');
   card.classList.toggle('info-open',open);button.setAttribute('aria-expanded',String(open));
  });
 });
})();
