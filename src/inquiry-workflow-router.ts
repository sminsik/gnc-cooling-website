import {mailStatus} from './mail-status.ts';
import type {StaffPrincipal} from './staff-session.ts';
import {StaffError,requirePermission,mutationInput,staffJson,text} from './staff-session.ts';
import {canAccess} from './access-policy.ts';
import type {FileEnv} from './content-files.ts';
import {inquiryDashboard,inquiryList,inquiryDetail,changeInquiry,saveMessage,sendMessage,saveQuote,sendQuote,markHandled,workflowWrite} from './inquiry-admin.ts';
import {dashboardPage,inquiryListPage,inquiryEditor} from './inquiry-admin-pages.ts';
import {reserveStaffFile,receiveStaffFile,staffInquiryFile,removeStaffFile} from './inquiry-staff-files.ts';
import {configureRecipient} from './inquiry-notifications.ts';
export async function workflowRoute(request:Request,env:FileEnv,path:string,staff:StaffPrincipal):Promise<Response|null>{
 if(path.startsWith('/api/admin/inquiry-recipients/')){requirePermission(staff,'staff');if(request.method!=='POST')throw new StaffError(405,'허용되지 않는 요청입니다.');await configureRecipient(env,staff,path.slice('/api/admin/inquiry-recipients/'.length),await mutationInput(request,env,staff));return staffJson({ok:true});}
 const file=path.match(/^\/api\/admin\/inquiry-files\/([^/]+)(?:\/(bytes|remove))?$/);if(file){requirePermission(staff,'inquiries');if(request.method==='GET'&&!file[2])return staffInquiryFile(env,file[1],staff);if(request.method==='PUT'&&file[2]==='bytes')return staffJson(await receiveStaffFile(request,env,staff,file[1]));if(request.method==='POST'&&file[2]==='remove'){await removeStaffFile(env,staff,file[1],await mutationInput(request,env,staff));return staffJson({ok:true});}throw new StaffError(405,'허용되지 않는 요청입니다.');}
 const dashboard=['/admin/dashboard','/api/admin/dashboard'].includes(path),route=path.match(/^\/(api\/)?admin\/inquiries(?:\/([^/]+))?(?:\/(.*))?$/);if(!dashboard&&!route)return null;
 requirePermission(staff,'inquiries');const api=path.startsWith('/api/');
 if(request.method==='GET'){
  if(dashboard){const data=await inquiryDashboard(env,staff);const recipients=canAccess(staff,'staff')?(await env.DB.prepare("SELECT s.id,s.name,s.version,s.inquiry_notify FROM staff s WHERE s.status='active' AND EXISTS(SELECT 1 FROM staff_roles r WHERE r.staff_id=s.id AND r.role IN('inquiry_manager','admin')) ORDER BY s.name,s.id").all<Record<string,unknown>>()).results:[];return api?staffJson(data):dashboardPage(data,staff,recipients);}
  if(!route![2]){const data=await inquiryList(env,new URL(request.url).searchParams,staff);return api?staffJson(data):inquiryListPage(data,staff);}
  if(route![3])throw new StaffError(404,'주소를 확인해주세요.');const data=await inquiryDetail(env,route![2],staff);return api?staffJson(data):inquiryEditor(data,staff);
 }
 if(dashboard||!route?.[2]||!api)throw new StaffError(405,'허용되지 않는 요청입니다.');
 const id=route[2],action=route[3]||'',input=await mutationInput(request,env,staff),record=action.match(/^(messages|quotes)(?:\/([^/]+))?(?:\/(send|uploads))?$/);
 let saved:string|undefined;
 if(record){const type=record[1],target=record[2],command=record[3];if(command==='uploads'&&target&&request.method==='POST')return staffJson(await reserveStaffFile(env,staff,id,type==='quotes'?'inquiry_quotes':'inquiry_messages',target,input),201);
  if(command==='send'&&target&&request.method==='POST'){if(type==='messages')await sendMessage(env,staff,id,target,input);else await sendQuote(env,staff,id,target,input);}
  else if(!command&&(!target&&request.method==='POST'||target&&request.method==='PATCH'))saved=type==='messages'?await saveMessage(env,staff,id,target||null,input):await saveQuote(env,staff,id,target||null,input);
  else throw new StaffError(405,'허용되지 않는 요청입니다.');
 }else if(request.method==='POST'){
  if(action==='handled')await markHandled(env,staff,id,input);
  else if(/^notifications\/[^/]+\/check$/.test(action)){
   const notification=action.split('/')[1],reason=text(input,'reason',1000,true);
   const current=await env.DB.prepare("SELECT n.id FROM inquiry_notifications n JOIN inquiries i ON i.id=n.inquiry_id WHERE n.id=? AND n.inquiry_id=? AND n.state='unknown' AND i.deleted_at IS NULL").bind(notification,id).first();
   if(!current)throw new StaffError(409,'발송 상태가 변경되었습니다. 화면을 다시 열어주세요.');
   const result=await mailStatus(env,notification);
   if(result.state==='unknown')throw new StaffError(503,'발송 결과를 아직 확인할 수 없습니다. 결과 불명 상태를 유지합니다.');
   await workflowWrite(env,staff,id,input,'notification-provider-check',reason,(op,now)=>[env.DB.prepare("UPDATE inquiry_notifications SET state=?,provider_receipt=?,available_at=?,lease_until=NULL WHERE id=? AND EXISTS(SELECT 1 FROM operation_claims WHERE id=?)").bind(result.state==='accepted'?'accepted':'failed',result.state==='accepted'?result.receipt:null,now+60000,notification,op)],"EXISTS(SELECT 1 FROM inquiry_notifications n WHERE n.id=? AND n.inquiry_id=i.id AND n.state='unknown')",[notification]);
  }
  else if(/^notifications\/[^/]+\/retry$/.test(action)){const notification=action.split('/')[1];await workflowWrite(env,staff,id,input,'notification-retry',text(input,'reason',1000,true),(op,now)=>[env.DB.prepare("UPDATE inquiry_notifications SET state='pending',attempts=0,available_at=? WHERE id=? AND EXISTS(SELECT 1 FROM operation_claims WHERE id=?)").bind(now,notification,op)],"EXISTS(SELECT 1 FROM inquiry_notifications n WHERE n.id=? AND n.inquiry_id=i.id AND n.state='failed')",[notification]);}
  else await changeInquiry(env,staff,id,action,input);
 }else throw new StaffError(405,'허용되지 않는 요청입니다.');
 return staffJson({ok:true,...(saved?{id:saved}:{}),redirect:'/admin/inquiries/'+encodeURIComponent(id)});
}
