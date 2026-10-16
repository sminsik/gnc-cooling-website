// Read-only design fixtures. No database, credentials or backend bindings.
import {homePage,staticContent,placeholderPage,productListPage,productDetailPage,htmlPage,heading,publicError,authenticationPlaceholder,escapeHtml} from '../src/public-pages.ts';
import {styleGuidePage} from '../src/style-guide.ts';
const data={products:['cooling-towers','chillers','heat-exchangers'].map((category_id,i)=>({id:'design-'+i,name:['냉각탑 구성 예시','칠러 구성 예시','열교환기 구성 예시'][i],intro:'디자인 확인용 예시 · 실제 제품 사양 아님',description:'',category_id,category_name:'디자인 예시',image_id:'',image_alt:'생성된 디자인 시안'})),projects:[0,1,2].map(i=>({id:'design-'+i,title:'시공 이미지 구성 예시 '+(i+1),work_type:'디자인 예시 · 실제 실적 아님',image_id:'design-'+i,image_alt:'생성된 디자인 시안'})),resources:[],notices:[]};
const url=new URL(process.argv[2]||'/', 'http://localhost'),path=url.pathname;
const categories=data.products.map(p=>({id:p.category_id,name:p.name.replace(' 구성 예시',''),parent_id:null}));
data.products.forEach((p,i)=>{p.image_id='design-'+i;p.description='화면 배치 확인용 가상 제품입니다. 실제 사양과 판매 정보는 회사 승인 후 반영합니다.';});
let response;
if(path==='/')response=homePage(data);
else if(path==='/style-guide')response=styleGuidePage();
else if(path==='/products'){
 const q=(url.searchParams.get('q')||'').slice(0,100),category=url.searchParams.get('category')||'';
 const page=Math.max(1,Math.min(100000,Number(url.searchParams.get('page'))||1));
 const items=data.products.filter(p=>(!category||p.category_id===category)&&p.name.includes(q));
 response=productListPage({items:items.slice((page-1)*12,page*12),categories,total:items.length,page,pageSize:12,q,category});
}else if(path.startsWith('/products/')){
 const p=data.products.find(p=>path==='/products/'+p.id);
 response=p?productDetailPage({...p,models:[],images:[]}):publicError('/products',404,'해당 디자인 예시가 없습니다.');
}else if(path==='/projects')response=htmlPage('시공·납품 사례',heading('시공·납품 사례','디자인 확인용 가상 예시이며 실제 실적이 아닙니다.')+'<div class="cards">'+data.projects.map(p=>`<a class="card" href="/projects/${p.id}"><img class="content-photo" src="/generated/piping.png" alt="${p.image_alt}"><h2>${p.title}</h2><p>${p.work_type}</p></a>`).join('')+'</div>',path);
else if(data.projects.some(p=>path==='/projects/'+p.id)){
 const p=data.projects.find(p=>path==='/projects/'+p.id);
 response=htmlPage(p.title,heading(p.title,'디자인 확인용 예시 · 실제 시공 실적 아님')+'<img class="content-photo" src="/generated/piping.png" alt="배관 이미지 구성 예시"><p>실제 현장 자료는 회사 승인 후 반영합니다.</p><a href="/projects">사례 목록</a>','/projects');
}else if(path==='/my-inquiries')response=authenticationPlaceholder(path,503);
else response=staticContent(path)||placeholderPage(path)||publicError('/',404,'주소를 확인하거나 메뉴에서 페이지를 선택해주세요.');
process.stderr.write(String(response.status));
let html=await response.text();
html=html.replaceAll(/\/api\/(?:content-files|product-images)\/design-(\d)/g,(_,i)=>['/generated/tower.png','/generated/chiller.png','/generated/exchanger.png'][Number(i)]);
html=html.replace('</body>',`<aside style="position:fixed;bottom:8px;left:8px;z-index:100;background:#111;color:#fff;padding:8px 12px;font:12px sans-serif">로컬 디자인 예시 · 실제 접수 없음　<a style="color:#fff" href="/">메인</a>　<a style="color:#fff" href="/style-guide">스타일 가이드</a></aside><script>let revision;setInterval(async()=>{try{const r=await(await fetch('/__design_revision')).text();if(revision&&revision!==r)location.reload();revision=r}catch{}},1000)</script></body>`);
process.stdout.write(html);
