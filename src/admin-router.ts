import {workflowRoute} from './inquiry-workflow-router.ts';
import {createPermit,receiveFile,removeFile,fileResponse,fileRows,targetTables} from './content-files.ts';
import type {FileEnv} from './content-files.ts';
import { isWithinPath, defaultStaffPath, canAccess } from './access-policy.ts';
import { StaffError, staffJson, resolveStaff, requirePermission, mutationInput, cookie, SESSION_COOKIE } from './staff-session.ts';
import type { StaffEnv } from './staff-session.ts';
import { startAuth, completeAuth, authConfigured } from './staff-auth.ts';
import {passwordPage,passwordLogin,setPassword,issuePasswordReset} from './password-auth.ts';
import { isContentType, contentRows, contentRow, saveContent, changePublication, deleteRestore, saveModel, modelAction } from './content-admin.ts';
import { inviteStaff, changeStaff, staffList, renewStaffInvitation } from './staff-admin.ts';
import { saveCategory } from './category-admin.ts';
import { adminPage, loginPage, accountPage, contentListPage, contentEditor, categoriesPage, staffPage, contentPreview } from './admin-pages.ts';
export async function adminRoute(request:Request,env:FileEnv,path:string):Promise<Response|null> {
 if(!['/admin','/api/admin','/api/staff','/api/staff-auth'].some(base=>isWithinPath(path,base)))return null;
 const api=path.startsWith('/api/');
 try {
  if(path==='/admin/login'&&env.STAFF_AUTH_MODE==='password')return passwordPage(env);
  if(path==='/admin/password')return passwordPage(env,true);
  if(path==='/api/staff-auth/password-login')return await passwordLogin(request,env);
  if(path==='/api/staff-auth/password-set')return await setPassword(request,env);
  if(env.STAFF_AUTH_MODE==='password'&&(path==='/api/staff-auth/start'||path==='/api/staff-auth/callback'))throw new StaffError(404,'제공하지 않는 로그인 방식입니다.');
  if(path==='/admin/login')return loginPage(authConfigured(env));
  if(path==='/api/staff-auth/start')return await startAuth(request,env);
  if(path==='/api/staff-auth/callback')return await completeAuth(request,env);
  const staff=await resolveStaff(request,env);
  if(!staff)throw new StaffError(401,'직원 로그인이 필요합니다.');
  if(path==='/api/staff-auth/logout'&&request.method==='POST') {
   await mutationInput(request,env,staff);
   const now=Date.now();await env.DB.batch([env.DB.prepare('UPDATE staff_sessions SET revoked_at=? WHERE token_hash=?').bind(now,staff.session_hash),env.DB.prepare("INSERT INTO staff_auth_events(id,staff_id,event,at) VALUES(?,?,'logout',?)").bind(crypto.randomUUID(),staff.id,now)]);
   const response=staffJson({redirect:'/admin/login'});response.headers.append('Set-Cookie',cookie(SESSION_COOKIE,'',0));return response;
  }
  const fileRoute=path.match(/^\/api\/admin\/files\/([^/]+)(?:\/(bytes|remove))?$/);
  if(fileRoute){
   requirePermission(staff,'content');
   if(request.method==='PUT'&&fileRoute[2]==='bytes')return staffJson(await receiveFile(request,env,staff,fileRoute[1]));
   if(request.method==='GET'&&!fileRoute[2])return await fileResponse(env,fileRoute[1],staff);
   if(request.method==='POST'&&fileRoute[2]==='remove'){await removeFile(env,staff,fileRoute[1],await mutationInput(request,env,staff));return staffJson({ok:true});}
   throw new StaffError(405,'허용되지 않는 요청입니다.');
  }
  const uploads=path.match(/^\/api\/admin\/(products|models|projects|resources|notices)\/([^/]+)\/uploads$/);
  if(uploads){requirePermission(staff,'content');if(request.method==='GET'){const target=await env.DB.prepare(`SELECT id FROM ${targetTables[uploads[1]]} WHERE id=? AND deleted_at IS NULL`).bind(uploads[2]).first();if(!target)throw new StaffError(404,'등록 대상을 찾을 수 없습니다.');return staffJson({items:await fileRows(env.DB,uploads[1],uploads[2]),scannerConfigured:!!env.FILE_SCANNER});}if(request.method==='POST')return staffJson(await createPermit(env,staff,uploads[1],uploads[2],await mutationInput(request,env,staff)),201);throw new StaffError(405,'허용되지 않는 요청입니다.');}
  if(path==='/api/staff/me'&&request.method==='GET')return staffJson({id:staff.id,name:staff.name,email:staff.email,roles:staff.roles,status:staff.status,csrf:staff.csrf});
  if(path==='/admin'&&request.method==='GET')return new Response(null,{status:303,headers:{Location:defaultStaffPath(staff),'Cache-Control':'private, no-store'}});
  if(path==='/admin/account'&&request.method==='GET')return accountPage(staff);
  const workflow=await workflowRoute(request,env,path,staff);if(workflow)return workflow;
  if(path==='/admin/staff'||path==='/api/admin/staff'||/^\/api\/admin\/staff\/[^/]+\/(roles|suspend|activate|reinvite|reset)$/.test(path)) {
   requirePermission(staff,'staff');
   if(request.method==='GET'){const rows=await staffList(env.DB);const pending=env.STAFF_PENDING_CONTENT_NAME&&env.STAFF_PENDING_CONTENT_EMAIL&&!rows.some(r=>r.email===env.STAFF_PENDING_CONTENT_EMAIL)?{name:env.STAFF_PENDING_CONTENT_NAME,email:env.STAFF_PENDING_CONTENT_EMAIL}:undefined;return api?staffJson({items:rows}):staffPage(rows,staff,env.STAFF_AUTH_MODE==='password',pending);}
   if(request.method==='POST') {
    const input=await mutationInput(request,env,staff);
    if(path==='/api/admin/staff')return staffJson(await inviteStaff(env,staff,input),201);
    const route=path.match(/^\/api\/admin\/staff\/([^/]+)\/(roles|suspend|activate|reinvite|reset)$/);
    if(route){if(route[2]==='reset')return staffJson(await issuePasswordReset(env,staff,route[1],input));if(route[2]==='reinvite')return staffJson(await renewStaffInvitation(env,staff,route[1],input));await changeStaff(env,staff,route[1],route[2],input);return staffJson({ok:true});}
   }
   throw new StaffError(405,'허용되지 않는 요청입니다.');
  }
  const category=path.match(/^\/api\/admin\/categories(?:\/([^/]+))?$/);
  if(path==='/admin/categories'||category) {
   requirePermission(staff,'content');
   if(request.method==='GET')return api?staffJson({items:(await env.DB.prepare('SELECT * FROM product_categories ORDER BY sort_order,id').all()).results}):await categoriesPage(env.DB,staff);
   if(category&&(request.method==='POST'&&!category[1]||request.method==='PATCH'&&category[1]))return staffJson({id:await saveCategory(env.DB,staff,category[1]||null,await mutationInput(request,env,staff))});
   throw new StaffError(405,'허용되지 않는 요청입니다.');
  }
  const model=path.match(/^\/api\/admin\/products\/([^/]+)\/models(?:\/([^/]+))?(?:\/(publication|delete|restore))?$/);
  if(model) {
   requirePermission(staff,model[3]==='delete'||model[3]==='restore'?'delete_restore':'content');
   if(request.method==='GET')return staffJson({items:(await env.DB.prepare('SELECT * FROM product_models WHERE product_id=? AND deleted_at IS NULL ORDER BY sort_order,id').bind(model[1]).all()).results});
   const input=await mutationInput(request,env,staff);
   if(model[3]&&model[2]&&request.method==='POST'){await modelAction(env.DB,staff,model[1],model[2],model[3],input);return staffJson({ok:true});}
   if(request.method==='POST'&&!model[2]||request.method==='PATCH'&&model[2]&&!model[3])return staffJson({id:await saveModel(env.DB,staff,model[1],model[2]||null,input),redirect:'/admin/products/'+encodeURIComponent(model[1])});
   throw new StaffError(405,'허용되지 않는 요청입니다.');
  }
  const content=path.match(/^\/(api\/)?admin\/([^/]+)(?:\/([^/]+))?(?:\/(publication|delete|restore|preview))?$/);
  if(content&&isContentType(content[2])) {
   const type=content[2],id=content[3],action=content[4];
   requirePermission(staff,action==='delete'||action==='restore'?'delete_restore':'content');
   if(request.method==='GET') {
    if(!id){const params=new URL(request.url).searchParams;if(params.get('deleted')==='1')requirePermission(staff,'delete_restore');const result=await contentRows(env.DB,type,params);return api?staffJson(result):contentListPage(type,result.items,staff,result);}
    if(id==='new'&&!api)return await contentEditor(env.DB,type,null,staff);
    const row=await contentRow(env.DB,type,id);if(!row||(row.deleted_at&&!canAccess(staff,'delete_restore')))throw new StaffError(404,'항목을 찾을 수 없습니다.');
    if(action==='preview')return await contentPreview(env.DB,type,row,staff);
    return api?staffJson(row):await contentEditor(env.DB,type,row,staff);
   }
   const input=await mutationInput(request,env,staff);
   if(id&&action&&request.method==='POST') {
    if(action==='publication')await changePublication(env.DB,staff,type,id,input);
    else if(action==='delete'||action==='restore')await deleteRestore(env.DB,staff,type,id,action==='restore',input);
    else throw new StaffError(405,'허용되지 않는 요청입니다.');
    return staffJson({ok:true,redirect:action==='delete'?'/admin/'+type:'/admin/'+type+'/'+encodeURIComponent(id)});
   }
   if(request.method==='POST'&&!id||request.method==='PATCH'&&id&&!action) {
    const saved=await saveContent(env.DB,staff,type,id||null,input);return staffJson({id:saved,redirect:'/admin/'+type+'/'+encodeURIComponent(saved)},id?200:201);
   }
   throw new StaffError(405,'허용되지 않는 요청입니다.');
  }
  throw new StaffError(404,'관리 화면을 찾을 수 없습니다.');
 }catch(error) {
  const status=error instanceof StaffError?error.status:503;
  const message=error instanceof StaffError?error.message:'요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';
  return api?staffJson({code:'STAFF_REQUEST_FAILED',error:message},status):adminPage('직원 이용 안내',`<section class="notice"><p>${message}</p><a href="/admin/login">직원 로그인</a></section>`,null,status);
 }
}
