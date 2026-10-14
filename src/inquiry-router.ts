import {publicProject} from './content-public.ts';
import {productDetail} from './catalog.ts';
import {businesses} from './site-content.ts';
import {customerMessage,acknowledge} from './inquiry-customer-workflow.ts';
import {StaffError,ready,staffJson,input,origin,newSubmitSession,submitSession,customerCookie,cookie,rate,policy} from './inquiry-security.ts';
import type {InquiryEnv} from './inquiry-security.ts';
import {submitInquiry,requestVerification,confirmVerification,ownInquiries,customerScope} from './inquiry-service.ts';
import {uploadGroup,reserve,receive,groupStatus,customerFile} from './inquiry-files.ts';
import {closedInquiry,inquiryForm,verificationLanding,verificationRequestPage,customerPage} from './inquiry-pages.ts';
import {authenticationPlaceholder,publicError,htmlPage,escapeHtml} from './public-pages.ts';
export async function inquiryRoute(request:Request,env:InquiryEnv,path:string):Promise<Response|null>{
 if(path==='/privacy'&&['GET','HEAD'].includes(request.method)&&ready(env)){const p=policy(env)!;const r=htmlPage('개인정보 처리방침',`<section class="page-heading"><h1>개인정보 처리방침</h1></section><p class="text">${escapeHtml(p.text)}</p><p>보관 기간: ${escapeHtml(p.retention)}</p><p>문의 창구: ${escapeHtml(p.contact)}</p><p>안내 버전: ${escapeHtml(p.version)}</p>`,'/privacy');return request.method==='HEAD'?new Response(null,{status:r.status,headers:r.headers}):r;}
 if(!(path==='/inquiries'||(path==='/api/inquiries'||path.startsWith('/api/inquiries/'))||path==='/my-inquiries'||path.startsWith('/my-inquiries/')||path==='/api/my-inquiries'||path.startsWith('/api/my-inquiries/')))return null;
 const api=path.startsWith('/api/'),url=new URL(request.url),read=['GET','HEAD'].includes(request.method);
 const head=(r:Response)=>request.method==='HEAD'?new Response(null,{status:r.status,headers:r.headers}):r;
 if(!ready(env)){if(path==='/inquiries'&&read){
   const context:string[]=[],selection:Record<string,string>={},source=businesses.find(b=>b.path.split('/').pop()===url.searchParams.get('source'));if(source){context.push(source.title);selection.source=source.path.split('/').pop()!;selection.work=source.work;}
   const id=url.searchParams.get('product'),model=url.searchParams.get('model');let unavailable=false;
   if(id){
    try{const product=id.length<=100?await productDetail(env.DB,id):null;
     if(product){context.push(product.name);selection.product=product.id;if(model){const selected=product.models.find(m=>m.id===model);if(selected){context.push('모델: '+selected.name);selection.model=selected.id;}else unavailable=true;}}
     else unavailable=true;
    }catch{return head(publicError('/products',503,'제품 정보를 불러오지 못했습니다. 잠시 후 다시 확인해주세요.'));}
   }else if(model)unavailable=true;
   const projectId=url.searchParams.get('project');if(projectId){
    try{const project=projectId.length<=100?await env.DB.prepare(`SELECT title FROM projects WHERE id=? AND (${publicProject})`).bind(projectId).first<{title:string}>():null;if(project){context.push('사례: '+project.title);selection.project=projectId;}else unavailable=true;}
    catch{return head(publicError('/projects',503,'사례 정보를 불러오지 못했습니다. 잠시 후 다시 확인해주세요.'));}
   }
   return head(closedInquiry({kind:url.searchParams.get('kind')||undefined,context,unavailable,selection}));
  }return head(api?staffJson({code:path.startsWith('/api/my-inquiries')?'AUTHENTICATION_REQUIRED':'SERVICE_UNAVAILABLE',error:path.startsWith('/api/my-inquiries')?'이메일 본인 확인이 필요합니다.':'문의 접수를 준비 중입니다.'},path.startsWith('/api/my-inquiries')?401:503):authenticationPlaceholder(path,401));}
 if(url.origin!==env.CUSTOMER_ORIGIN)return staffJson({error:'허용되지 않는 주소입니다.'},403);
 try{
  if(path==='/inquiries'&&read){const session=await screenSession(request,env);const r=inquiryForm(env,session.csrf,url.searchParams);if(session.cookie)r.headers.append('Set-Cookie',session.cookie);return head(r);}
  if(path==='/my-inquiries/verify'&&read)return head(verificationLanding());
  if(path==='/my-inquiries'&&read){try{const scope=await customerScope(request,env);return head(customerPage(await ownInquiries(request,env),scope.csrf));}catch(error){if(!(error instanceof StaffError)||error.status!==401)throw error;const session=await screenSession(request,env);const r=verificationRequestPage(env,session.csrf);if(session.cookie)r.headers.append('Set-Cookie',session.cookie);return head(r);}}
  const addition=path.match(/^\/api\/my-inquiries\/([\w-]+)\/(messages|seen)$/);if(addition&&request.method==='POST'){const data=await input(request);if(addition[2]==='messages')await customerMessage(request,env,addition[1],data);else await acknowledge(request,env,addition[1],data);return staffJson({ok:true});}
  const detail=path.match(/^\/(api\/)?my-inquiries\/([\w-]+)$/);
  if(read&&path==='/api/my-inquiries')return head(staffJson({inquiries:await ownInquiries(request,env)}));
  if(detail&&read){const rows=await ownInquiries(request,env,detail[2]);return head(detail[1]?staffJson({inquiry:rows[0]}):customerPage(rows,(await customerScope(request,env)).csrf,true));}
  const privateFile=path.match(/^\/api\/my-inquiries\/files\/([\w-]+)$/);if(privateFile&&read)return head(await customerFile(request,env,privateFile[1]));
  if(path==='/api/inquiries/confirm'&&request.method==='POST'){origin(request,env);await rate(env,'confirm-network:'+(request.headers.get('CF-Connecting-IP')||'shared-unknown'),20,600000);const data=await input(request);const r=staffJson({next:'/my-inquiries'});r.headers.append('Set-Cookie',await confirmVerification(env,data.token));return r;}
  if(path==='/api/my-inquiries/logout'&&request.method==='POST'){origin(request,env);const s=await customerScope(request,env);if(request.headers.get('X-CSRF-Token')!==s.csrf)throw new StaffError(403,'화면을 다시 열어주세요.');await env.DB.prepare('DELETE FROM customer_sessions WHERE token_hash=?').bind(s.tokenHash).run();const r=staffJson({ok:true});r.headers.append('Set-Cookie',cookie(customerCookie,'',0));return r;}
  const session=await submitSession(request,env,!read),network=request.headers.get('CF-Connecting-IP')||'shared-unknown';
  const group=path.match(/^\/api\/inquiries\/uploads\/([\w-]+)$/);if(group&&read)return head(staffJson({files:await groupStatus(env,session.owner,group[1])}));
  const bytes=path.match(/^\/api\/inquiries\/files\/([\w-]+)\/bytes$/);if(bytes&&request.method==='PUT')return staffJson(await receive(request,env,session.owner,bytes[1]));
  if(request.method!=='POST')throw new StaffError(405,'허용되지 않는 요청입니다.');const data=await input(request);
  if(path==='/api/inquiries')return staffJson(await submitInquiry(env,session.owner,data,network));
  if(path==='/api/inquiries/verification'){await requestVerification(env,data,network);return staffJson({message:'신청 정보와 발송 기준에 맞으면 확인 메일을 보냅니다. 메일이 오지 않으면 잠시 후 재시도하거나 회사 연락 안내를 확인해주세요.'});}
  if(path==='/api/inquiries/uploads')return staffJson(await uploadGroup(env,session.owner,data.turnstileToken,network));
  if(group)return staffJson(await reserve(env,session.owner,group[1],data));
  throw new StaffError(404,'제공하지 않는 주소입니다.');
 }catch(error){const status=error instanceof StaffError?error.status:503,message=error instanceof StaffError?error.message:'처리하지 못했습니다. 잠시 후 다시 시도해주세요.';return head(api?staffJson({error:message},status):publicError('/my-inquiries',status,message));}
}

async function screenSession(request:Request,env:InquiryEnv){try{return {...await submitSession(request,env),cookie:null};}catch(error){if(!(error instanceof StaffError)||error.status!==401)throw error;await rate(env,'submit-session:'+(request.headers.get('CF-Connecting-IP')||'shared-unknown'),60,600000);return newSubmitSession(env);}}
