import {towerFeatures,closedCircuitStructure,closedCircuitApplications} from './product-features.ts';
import {productSpecificationTables} from './product-specifications.ts';
import {catalogProducts,productCategories,type CatalogProduct} from './product-data.ts';
import {conceptIntro} from './concept-intro.ts';
import {htmlPage,heading,publicError} from './public-pages.ts';
import {escapeHtml as e} from './html-utils.ts';
import {publicProject} from './content-public.ts';
import {CatalogInputError} from './catalog.ts';
export function selectCatalog(params:URLSearchParams){
 const category=(params.get('category')||'').trim(),q=(params.get('q')||'').trim();
 const page=Number(params.get('page')||1);if(!Number.isSafeInteger(page)||page<1||page>100000)throw new CatalogInputError('검색 조건을 확인해주세요.');
 if(q.length>100||category.length>100)throw new CatalogInputError('검색 조건을 확인해주세요.');
 return {category,q,items:catalogProducts.filter(p=>(!category||p.category===category)&&(!q||[p.name,p.intro,...p.models.map(m=>m[0])].join(' ').toLowerCase().includes(q.toLowerCase())))};
}
export function catalogListing(params:URLSearchParams){
 const {category,q,items}=selectCatalog(params);
 const searchItems=selectCatalog(new URLSearchParams({q})).items;
 const nav=[{id:'',name:'전체 제품',label:'ALL PRODUCTS'},...productCategories].map(c=>`<a href="/products${c.id?'?category='+c.id:''}" ${c.id===category?'aria-current="page"':''}><span>${e(c.label)}</span>${e(c.name)}</a>`).join('');
 const groups=productCategories.map(c=>{const entries=searchItems.filter(p=>p.category===c.id);return entries.length?`<section class="catalog-group" data-catalog-category="${c.id}"${category&&category!==c.id?' hidden':''}><div class="catalog-section-head"><div><p class="eyebrow">${e(c.label)}</p><h2>${e(c.name)}</h2></div><span class="catalog-category-divider" aria-hidden="true"></span><p>${c.id==='cooling-towers'?'공정에서 발생한 열을 물과 공기의 열교환으로 방출합니다. 순환수량과 목표 수온, 수질·설치 공간을 고려해 개방형·밀폐형 등 적합한 형식을 검토합니다.':c.id==='chillers'?'냉동 사이클을 이용해 공정에 필요한 온도의 냉수를 공급합니다. 냉각 부하와 사용 수온, 외기 조건 및 운전 패턴을 바탕으로 압축기 형식과 용량을 검토합니다.':'서로 다른 두 유체를 분리한 상태로 열을 교환합니다. 양측 유체의 온도·유량·압력과 오염도, 세척 조건에 맞춰 전열판 재질과 접합 구조를 검토합니다.'}</p></div><div class="catalog-grid">${entries.map(p=>`<article class="catalog-card"><a href="/products/${p.id}"><figure><img src="${e(p.image)}" alt="${e(p.name)} 제품 사진" width="640" height="460" loading="lazy"></figure><div class="catalog-card-copy"><p class="eyebrow">${e(c.label)}</p><h3>${e(p.name)}</h3><p>${e(p.intro)}</p><span class="catalog-more">제품 자세히 보기 <span aria-hidden="true">↗</span></span></div></a></article>`).join('')}</div></section>`:'';}).join('');
 return htmlPage('제품소개',heading('제품소개','냉각탑·칠러·열교환기의 제품 정보와 모델별 사양을 살펴보세요.')+`<div class="catalog-page">`+conceptIntro('OUR PRODUCTS',['공정에 필요한 온도,','현장에 맞는 냉각.'],'냉각탑부터 칠러와 열교환기까지, 설비의 조건에 맞는 제품을 살펴보세요.','/generated/products-intro-v1.png','냉각탑·칠러·열교환기를 표현한 옅은 청록색 일러스트')+`<nav class="catalog-nav" aria-label="제품 분류">${nav}</nav>${groups}<section class="catalog-empty"${items.length?' hidden':''}><h2>검색 결과가 없습니다.</h2><p>제품명이나 분류를 바꿔 다시 확인해 주세요.</p><a href="/products">전체 제품 보기 ↗</a></section></div>`,'/products',200,category?'/products?category='+encodeURIComponent(category):'/products');
}
export async function relatedProductProjects(db:D1Database,p:CatalogProduct){
 if(!p.projectIds.length)return [];
 const ids=p.projectIds.slice(0,12);
 const result=await db.prepare(`SELECT id,title,work_type,primary_file_id AS image_id FROM projects WHERE (${publicProject}) AND id IN (${ids.map(()=>'?').join(',')}) ORDER BY first_published_at DESC,id LIMIT 3`).bind(...ids).all<{id:string;title:string;work_type:string;image_id:string}>();
 return result.results;
}
export async function catalogDetail(db:D1Database,id:string){
 const p=catalogProducts.find(p=>p.id===id);if(!p)return null;
 const cat=productCategories.find(c=>c.id===p.category)!;
 const projects=await relatedProductProjects(db,p);
 const table=productSpecificationTables[p.id]?fullSpecifications(p):p.models.length?`<section class="catalog-specs"><div class="catalog-section-head"><div><p class="eyebrow">TECHNICAL DATA</p><h2>모델별 사양</h2></div><p>${e(p.condition)}</p></div><div class="catalog-table-scroll" role="region" aria-label="${e(p.name)} 모델별 사양" tabindex="0"><table><caption>${e(p.name)} 기본 사양</caption><thead><tr>${p.headers.map(h=>`<th scope="col">${e(h)}</th>`).join('')}</tr></thead><tbody>${p.models.map(row=>`<tr>${row.map((v,i)=>i?`<td>${e(v)}</td>`:`<th scope="row">${e(v)}</th>`).join('')}</tr>`).join('')}</tbody></table></div></section>`:technicalSelection(p);
 const projectSection=`<section class="catalog-projects"><div class="catalog-section-head"><div><p class="eyebrow">IN THE FIELD</p><h2>설치 사례</h2></div><a class="catalog-more" href="/projects">전체 시공·납품 사례 ↗</a></div>${projects.length?`<div class="catalog-project-grid">${projects.map(v=>`<a href="/projects/${encodeURIComponent(v.id)}"><img src="/api/content-files/${encodeURIComponent(v.image_id)}" alt="${e(v.title)}" loading="lazy"><p>${e(v.work_type)}</p><h3>${e(v.title)}</h3></a>`).join('')}</div>`:`<p class="catalog-project-message">설치 공간과 배관 구성, 현장 적용 모습은 시공·납품 사례에서 살펴보세요.</p>`}</section>`;
 return htmlPage(p.name,heading(p.name,p.intro)+`<div class="catalog-page catalog-detail">`+conceptIntro(cat.label,[p.name,'현장의 조건에 맞게.'],p.intro,'/generated/products-intro-v1.png','냉각 제품을 표현한 옅은 청록색 일러스트')+`<nav class="catalog-breadcrumb" aria-label="제품 목록"><a href="/products">전체 제품</a><span aria-hidden="true">/</span><a href="/products?category=${p.category}">${e(cat.name)}</a></nav><section class="catalog-product-hero"><figure><img src="${e(p.image)}" alt="${e(p.name)} 제품 사진" width="760" height="560"></figure><div><p class="eyebrow">${e(cat.label)}</p><h2>${e(p.name)}</h2><p>${e(p.description)}</p><ul>${p.features.map(f=>`<li>${e(f)}</li>`).join('')}</ul><a class="catalog-more" href="#product-consultation">상담 전 확인 사항 ↓</a></div></section>${towerFeatureSection(p)}${table}${projectSection}${productFaq(p)}<section class="catalog-consultation" id="product-consultation"><div><p class="eyebrow">BEFORE WE TALK</p><h2>상담 전,<br>이런 정보를 알려주세요.</h2><p>알고 계신 내용부터 준비해 주세요.</p><a class="button" href="/inquiries?product=${p.id}">이 제품 상담하기 ↗</a></div><ol>${p.consultation.map((s,i)=>`<li><span>${String(i+1).padStart(2,'0')}</span>${e(s)}</li>`).join('')}</ol></section><div class="catalog-detail-bottom"><a class="catalog-more" href="/products?category=${p.category}">← ${e(cat.name)} 제품 목록</a></div></div>`,'/products/'+p.id);
}
function technicalSelection(p:CatalogProduct){
 const rows=p.category==='heat-exchangers'?[
 ['가스켓식','판과 가스켓을 체결하는 구조로, 분해 세척과 정비가 필요한 공정의 적용 조건을 검토합니다.'],['브레이징식','전열판을 접합한 구조입니다. 접합 재료와 유체의 적합성, 온도와 압력을 함께 확인합니다.'],['용접식','판을 용접하는 구조로, 사용 유체와 운전 조건에 적합한 재질과 정비 방식을 검토합니다.']
 ]:[['공정 유체','유체의 종류와 농도, 입·출구 온도 및 순환수량을 바탕으로 냉각 조건을 확인합니다.'],['코일과 배관','허용 압력과 압력손실, 배관 재질 및 계통 연결 조건을 함께 검토합니다.'],['운전과 관리','살수수의 수질과 코일 오염, 겨울철 동파 대비 및 점검 접근성을 살펴봅니다.']];
 return `<section class="catalog-selection"><div class="catalog-section-head"><div><p class="eyebrow">APPLICATION GUIDE</p><h2>적용 조건</h2></div></div><dl>${rows.map(([t,b])=>`<div><dt>${e(t)}</dt><dd>${e(b)}</dd></div>`).join('')}</dl></section>`;
}
function productFaq(p:CatalogProduct){return `<section class="business-faq" aria-labelledby="product-faq-title"><div class="business-faq-heading"><p class="eyebrow">FAQ</p><h2 id="product-faq-title">${e(p.name)}<br>자주 묻는 질문</h2></div><div class="business-faq-list">${p.faq.map((f,i)=>`<details class="business-faq-item" name="product-faq"><summary><span class="business-faq-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><span class="business-faq-question">${e(f.question)}</span><span class="business-faq-toggle" aria-hidden="true"></span></summary><div class="business-faq-answer"><p>${e(f.answer)}</p></div></details>`).join('')}</div></section>`;}

function fullSpecifications(p:CatalogProduct){
 const rows=productSpecificationTables[p.id];
 const labelColumns=p.id==='compact-cooler'?3:4;
 const occupied:number[]=[];
 const columnCount=rows[0].reduce((sum,c)=>sum+Number(c.colspan),0);
 const rendered=rows.map((row,rowIndex)=>{
  let col=0;
  const cells=row.map(cell=>{
   while((occupied[col]||0)>rowIndex)col++;
   // Original four-model tables contain a copied six-model colspan; keep text, fit the actual model columns.
   const span=Math.min(Number(cell.colspan),columnCount-col),height=Number(cell.rowspan),start=col;
   for(let c=col;c<col+span;c++)occupied[c]=rowIndex+height;
   col+=span;
   const header=rowIndex===0||start<labelColumns;
   const tag=header?'th':'td';
   const scope=header?` scope="${rowIndex===0?(span>1?'colgroup':'col'):(height>1?'rowgroup':'row')}"`:'';
   return `<${tag}${scope}${height>1?` rowspan="${height}"`:''}${span>1?` colspan="${span}"`:''}>${e(cell.text)||'&nbsp;'}</${tag}>`;
  }).join('');
  return `<tr>${cells}</tr>`;
 });
 return `<section class="catalog-specs"><div class="catalog-section-head"><div><p class="eyebrow">TECHNICAL DATA</p><h2>상세 사양</h2></div><p>${e(p.condition)}</p></div><div class="catalog-table-scroll catalog-full-specs" role="region" aria-label="${e(p.name)} 전체 상세 사양표" tabindex="0"><table><caption>${e(p.name)} 모델별 상세 사양</caption><thead>${rendered[0]}</thead><tbody>${rendered.slice(1).join('')}</tbody></table></div></section>`;
}

function towerFeatureSection(p:CatalogProduct){
 const features=towerFeatures[p.id];if(!features)return '';
 const entries=(items:{title:string;body:string}[])=>items.map((f,i)=>`<div><span class="catalog-feature-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><h3>${e(f.title)}</h3><p>${e(f.body)}</p></div>`).join('');
 return `<section class="catalog-features"><div class="catalog-section-head"><div><p class="eyebrow">PRODUCT FEATURES</p><h2>제품 특징</h2></div></div><div class="catalog-feature-grid">${entries(features)}</div></section>`+(p.id==='closed-circuit'?`<section class="catalog-features"><div class="catalog-section-head"><div><p class="eyebrow">HOW IT WORKS</p><h2>밀폐형 냉각탑의 구조</h2></div></div><div class="catalog-feature-grid catalog-structure-grid">${entries(closedCircuitStructure)}</div></section><section class="catalog-features"><div class="catalog-section-head"><div><p class="eyebrow">APPLICATIONS</p><h2>주요 적용 분야</h2></div></div><div class="catalog-feature-grid">${entries(closedCircuitApplications)}</div></section>`:'');
}
