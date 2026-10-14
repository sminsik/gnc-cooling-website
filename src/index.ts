import {styleGuidePage} from './style-guide.ts';
import {isDevelopmentPreview,previewGate,identifyPreview} from './development-preview.ts';
import type {PreviewEnv} from './development-preview.ts';
import {homeContent} from './public-home.ts';
import {runMaintenance} from './maintenance.ts';
import {processWorkflowNotifications} from './inquiry-notifications.ts';
import {inquiryRoute} from './inquiry-router.ts';
import {processInquiryMail,cleanInquiryTransient,reconcileVerificationMail} from './inquiry-mail.ts';
import type {InquiryEnv} from './inquiry-security.ts';
import {cleanStaffAuth} from './staff-maintenance.ts';
import {publicContentRoute} from './content-public.ts';
import {fileResponse} from './content-files.ts';
import {processFiles,expireUploads,cleanTemporaryFiles} from './file-processing.ts';
import { adminRoute } from './admin-router.ts';
import { noticesRoute } from './notices.ts';
import type { StaffEnv } from './staff-session.ts';
import { isWithinPath, privateUnavailable } from './access-policy.ts';
import { CatalogInputError, listProducts, productDetail, productImage } from './catalog.ts';
import { homePage, staticContent, placeholderPage, productListPage, productDetailPage, publicError, authenticationPlaceholder } from './public-pages.ts';
interface Env extends StaffEnv,InquiryEnv,PreviewEnv { ASSETS: Fetcher; DB: D1Database; FILES: R2Bucket; FILE_SCANNER?: Fetcher }
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const application = {
 async scheduled(_event:ScheduledController,env:Env,ctx:ExecutionContext){if(isDevelopmentPreview(env))return;ctx.waitUntil(runMaintenance({staff:()=>cleanStaffAuth(env),uploads:()=>expireUploads(env),scanner:()=>processFiles(env),verificationMail:()=>processInquiryMail(env),verificationStatus:()=>reconcileVerificationMail(env),notifications:()=>processWorkflowNotifications(env),customerTransient:()=>cleanInquiryTransient(env),temporaryFiles:()=>cleanTemporaryFiles(env)}));},
 async fetch(request: Request, env: Env): Promise<Response> {
  const url=new URL(request.url);
  let path:string;
  try {path=decodeURIComponent(url.pathname);}catch{return privateUnavailable(404);}
  const admin=await adminRoute(request,env,path);if(admin)return admin;
  const inquiry=await inquiryRoute(request,isDevelopmentPreview(env)?{...env,INQUIRY_INTAKE_ENABLED:''}:env,path);if(inquiry)return inquiry;
  if(['/my-inquiries','/api/my-inquiries'].some(base=>isWithinPath(path,base)))return path.startsWith('/api/')?privateUnavailable(401):authenticationPlaceholder(path,401);
  const contentFile=path.match(/^\/api\/content-files\/([^/]+)$/);
  if(contentFile&&['GET','HEAD'].includes(request.method)){try{const response=await fileResponse(env,contentFile[1],null);return request.method==='HEAD'?new Response(null,{status:response.status,headers:response.headers}):response;}catch{return privateUnavailable(404);}}
  if(['/api/files','/api/uploads'].some(base=>isWithinPath(path,base)))return privateUnavailable(404);
  const isApi=path.startsWith('/api/');
  if(!['GET','HEAD'].includes(request.method))return json({code:'METHOD_NOT_ALLOWED',error:'조회만 가능한 주소입니다.'},405);
  const head=(response:Response)=>request.method==='HEAD'?new Response(null,{status:response.status,headers:response.headers}):response;
  try {
   const publicContent=await publicContentRoute(env.DB,path,url.searchParams);if(publicContent)return head(publicContent);
   const notices=await noticesRoute(env.DB,path,url.searchParams);if(notices)return head(notices);
   if(path==='/style-guide'){
    if(!isDevelopmentPreview(env)&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname))return head(privateUnavailable(404));
    return head(styleGuidePage());
   }
   if(path==='/api/health') {
    if(!isDevelopmentPreview(env)&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname))return head(privateUnavailable(404));
    if(isDevelopmentPreview(env)){
     let ok=false;
     try{const row=await env.DB.prepare('SELECT COUNT(*) AS count FROM d1_migrations').first<{count:number}>();if(row?.count!==12)throw new Error('schema');await env.FILES.list({limit:1});ok=true;}catch{}
     console.info(JSON.stringify({event:'preview-binding-check',ok,requestId:crypto.randomUUID()}));
     return head(json({ok,environment:'development'},ok?200:503));
    }
    await env.DB.prepare('SELECT 1').first();await env.FILES.list({limit:1});
    return head(json({ok:true,database:'connected',files:'connected'}));
   }
   if(path==='/api/products'||path==='/products') {
    const result=await listProducts(env.DB,url.searchParams);
    return head(isApi?json(result):productListPage(result));
   }
   const detail=path.match(/^\/(api\/)?products\/([^/]+)$/);
   if(detail) {
    const product=await productDetail(env.DB,detail[2]);
    return head(product?(isApi?json(product):productDetailPage(product)):(isApi?json({code:'NOT_FOUND',error:'제공할 수 없는 제품입니다.'},404):publicError('/products',404,'현재 제공할 수 없는 제품입니다. 제품 목록에서 공개된 제품을 확인해주세요.')));
   }
   const image=path.match(/^\/api\/product-images\/([^/]+)$/);
   if(image)return head(await productImage(env,image[1]));
   if(isApi)return head(json({code:'NOT_FOUND',error:'아직 제공하지 않는 기능입니다.'},404));
   if(path==='/index.html')return Response.redirect(url.origin+'/',302);
   if(path==='/')return head(homePage(await homeContent(env.DB)));
   const page=staticContent(path)||placeholderPage(path);
   if(page)return head(page);
   if(path==='/home-products.js'||path==='/tween-ui.js'||path==='/tween-ui.css'||path==='/animated-icons.css'||path==='/site-ui.css'||path==='/site-header.js'||path==='/site-theme.css'||path==='/admin-theme.css'||path.startsWith('/generated/')||path.startsWith('/reference/')||path.startsWith('/brand/')||path.startsWith('/fonts/')||path==='/header.js'||path==='/ui-guide.css'||path==='/style.css'||path==='/admin.js'||path==='/inquiry.js')return head(await env.ASSETS.fetch(request));
   return head(publicError('/',404,'주소를 확인하거나 메뉴에서 원하는 페이지로 이동해주세요.'));
  }catch(error) {
   const status=error instanceof CatalogInputError?400:503;
   const message=error instanceof CatalogInputError?error.message:'자료를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
   return head(isApi?json({code:status===400?'INVALID_INPUT':'SERVICE_UNAVAILABLE',error:message},status):publicError(path,status,message));
  }
 }
} satisfies ExportedHandler<Env>;
export default {
 scheduled:application.scheduled,
 async fetch(request:Request,env:Env):Promise<Response>{
  const denied=await previewGate(request,env);
  return identifyPreview(denied||await application.fetch(request,env),env);
 }
} satisfies ExportedHandler<Env>;
