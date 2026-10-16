import {publicNotice} from './publication-policy.ts';
import {supportIntro} from './support-pages.ts';
import {CatalogInputError} from './catalog.ts';
import { escapeHtml as e,htmlPage,heading,publicError } from './public-pages.ts';
export async function noticesRoute(db:D1Database,path:string,params:URLSearchParams):Promise<Response|null> {
 const api=path.startsWith('/api/'),detail=path.match(/^\/(api\/)?notices\/([^/]+)$/);
 if(path!=='/notices'&&path!=='/api/notices'&&!detail)return null;
 const headers={'Cache-Control':'no-store'};
 if(detail){
  const row=await db.prepare(`SELECT id,title,body,posted_at FROM notices WHERE id=? AND ${publicNotice}`).bind(detail[2]).first<{id:string;title:string;body:string;posted_at:string}>();
  if(!row)return api?Response.json({error:'제공할 수 없는 공지입니다.'},{status:404,headers}):publicError('/notices',404,'현재 제공할 수 없는 공지입니다. 공지 목록에서 다시 확인해주세요.');
  const files=(await db.prepare(`SELECT id,original_name,mime,alt FROM files WHERE target_type='notices' AND target_id=? AND attached=1 AND status='ready' AND validated_at IS NOT NULL AND deleted_at IS NULL ORDER BY created_at,id`).bind(row.id).all<{id:string;original_name:string;mime:string;alt:string}>()).results;
  const attachments=files.map(f=>f.mime==='application/pdf'?`<p><a href="/api/content-files/${e(f.id)}">${e(f.original_name)} 다운로드</a></p>`:`<figure><img class="content-photo" src="/api/content-files/${e(f.id)}" alt="${e(f.alt)}"></figure>`).join('');
  return api?Response.json({...row,files},{headers}):htmlPage(row.title,`${heading(row.title,'')}<article class="publication-detail"><p class="publication-meta">게시일 ${e(row.posted_at.slice(0,10))}</p><p class="text">${e(row.body)}</p></article>${attachments}<a href="/notices">공지 목록</a>`,'/notices');
 }
 const page=Number(params.get('page')||1),q=(params.get('q')||'').trim();
 if(!Number.isSafeInteger(page)||page<1||page>100000||q.length>100)throw new CatalogInputError('검색 조건을 확인해주세요.');
 const query='%'+q.replace(/[\\%_]/g,'\\$&')+'%';
 const count=await db.prepare(`SELECT COUNT(*) AS total FROM notices WHERE ${publicNotice} AND title LIKE ? ESCAPE '\\'`).bind(query).first<{total:number}>();
 const items=(await db.prepare(`SELECT id,title,pinned,posted_at FROM notices WHERE ${publicNotice} AND title LIKE ? ESCAPE '\\' ORDER BY pinned DESC,posted_at DESC,id DESC LIMIT 12 OFFSET ?`).bind(query,(page-1)*12).all<{id:string;title:string;pinned:number;posted_at:string}>()).results;
 if(api)return Response.json({items,total:count?.total||0,page,pageSize:12},{headers});
 const pageUrl=(n:number)=>'/notices?'+new URLSearchParams({q,page:String(n)});
 return htmlPage('공지사항',`${heading('공지사항','지엔씨쿨링의 새로운 소식과 주요 안내를 전합니다.')}${supportIntro('notices')}<form class="search" action="/notices"><div class="search-field"><label for="notice-q">제목 검색</label><input id="notice-q" name="q" maxlength="100" value="${e(q)}"></div><button>검색</button><a href="/notices">초기화</a></form><p class="result-count">공개 공지 ${count?.total||0}개 · ${page}페이지</p>${items.length?`<div class="table-scroll"><table><thead><tr><th>제목</th><th>게시일</th></tr></thead><tbody>${items.map(row=>`<tr><td>${row.pinned?'[고정] ':''}<a href="/notices/${encodeURIComponent(row.id)}">${e(row.title)}</a></td><td>${e(row.posted_at)}</td></tr>`).join('')}</tbody></table></div>`:`<section class="notice"><h2>${q||page>1?'검색 결과가 없습니다':'공개된 공지가 없습니다'}</h2><p>${q||page>1?'검색 조건을 바꾸거나 전체 공지를 확인해주세요.':'공개된 공지가 등록되면 안내하겠습니다.'}</p><a href="/notices">전체 공지 보기</a></section>`}<nav class="pagination" aria-label="공지 목록 페이지">${page>1?`<a href="${e(pageUrl(page-1))}">이전</a>`:''}<span>${page}페이지</span>${page*12<(count?.total||0)?`<a href="${e(pageUrl(page+1))}">다음</a>`:''}</nav>`,'/notices');
}
