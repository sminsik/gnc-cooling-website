import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../../src/index.ts';
import { randomToken,hash } from '../../src/staff-session.ts';
export function setup(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
 for(const name of ['0001_catalog','0002_product_structure','0003_staff_content','0004_content_files','0005_file_attachment','0006_staff_auth_operations','0007_customer_inquiries','0008_inquiry_workflow','0009_temporary_file_cleanup','0010_verification_mail_unknown','0011_staff_passwords','0012_local_password_scope'])sql.exec(readFileSync(new URL('../../migrations/'+name+'.sql',import.meta.url),'utf8'));
 let batchQueue=Promise.resolve();
 const DB={prepare(query){let values=[];return {bind(...args){values=args;return this},async first(){return sql.prepare(query).get(...values)||null},async all(){return {results:sql.prepare(query).all(...values)}},async run(){return {meta:{changes:Number(sql.prepare(query).run(...values).changes)}}}}},batch(statements){const execution=batchQueue.then(async()=>{sql.exec('BEGIN');try{const result=[];for(const stmt of statements)result.push(await stmt.run());sql.exec('COMMIT');return result}catch(error){sql.exec('ROLLBACK');throw error}});batchQueue=execution.catch(()=>{});return execution}};
 const env={DB,APP_ORIGIN:'https://app.test',OIDC_ISSUER:'https://idp.test',OIDC_CLIENT_ID:'client',OIDC_CLIENT_SECRET:'test-only-client-secret',STAFF_AUTH_RATE_SECRET:'test-only-rate-secret-at-least-32-chars',ASSETS:{fetch:async()=>new Response('asset')},FILES:{get:async()=>({body:new Uint8Array([1])}),list:async()=>({objects:[]})}};
 const sessions={};
 async function staff(id,roles,status='active'){
  sql.prepare('INSERT INTO staff(id,name,email,provider_issuer,provider_subject,status,created_at) VALUES(?,?,?,?,?,?,?)').run(id,id,id+'@example.test',env.OIDC_ISSUER,id,status,Date.now());
  for(const role of roles)sql.prepare('INSERT INTO staff_roles(staff_id,role) VALUES(?,?)').run(id,role);
  const token=randomToken(),csrf=randomToken(),now=Date.now();sql.prepare('INSERT INTO staff_sessions(token_hash,staff_id,csrf_hash,auth_version,created_at,last_seen_at,expires_at) VALUES(?,?,?,1,?,?,?)').run(await hash(token),id,await hash(csrf),now,now,now+28800000);
  sessions[id]={cookie:'gnc_staff_session='+token+'.'+csrf,csrf};return sessions[id];
 }
 function request(path,id,method='GET',body,extra={}){
  const session=sessions[id];const headers={...(session?{Cookie:session.cookie}:{}),...extra};
  if(body!==undefined){headers['Content-Type']='application/json';headers.Origin=env.APP_ORIGIN;headers['X-CSRF-Token']=session?.csrf||'';}
  Object.assign(headers,extra);
  return worker.fetch(new Request(env.APP_ORIGIN+path,{method,headers,body:body===undefined?undefined:JSON.stringify({requestId:crypto.randomUUID(),...body})}),env);
 }
 return {sql,env,sessions,staff,request};
}
