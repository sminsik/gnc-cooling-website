// Only development read operations are available remotely. Restore never contacts Cloudflare.
import {spawnSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,lstatSync,existsSync,chmodSync,readdirSync,copyFileSync} from 'node:fs';
import {resolve,join,relative,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {isDeepStrictEqual} from 'node:util';

const root=resolve(import.meta.dirname,'..');
const backupRoot=join(root,'.cloudflare-backups');
const restoreRoot=join(root,'.cloudflare-restore-tests');
const configPath=join(root,'configs/wrangler.development.jsonc');
const maxObjectBytes=64*1024*1024,maxTotalBytes=1024*1024*1024;
const q=name=>'"'+name.replaceAll('"','""')+'"';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const objectsSql="SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' ORDER BY type,name";
class SafeError extends Error {}
function requireOk(value,message){if(!value)throw new SafeError(message);}
function same(a,b,label){requireOk(isDeepStrictEqual(a,b),label+' mismatch; private details suppressed.');}
function plain(rows){return rows.map(row=>({...row}));}
function secureDirectory(path){
 const parts=relative(root,path).split('/');
 requireOk(!parts.includes('..')&&!isAbsolute(relative(root,path)),'Path outside project refused.');
 let current=root;
 for(const part of parts){current=join(current,part);if(!existsSync(current))mkdirSync(current,{mode:0o700});const st=lstatSync(current);requireOk(st.isDirectory()&&!st.isSymbolicLink(),'Unsafe directory refused.');chmodSync(current,0o700);}
}
function privateFile(path){const st=lstatSync(path);requireOk(st.isFile()&&!st.isSymbolicLink(),'Unsafe backup file refused.');return readFileSync(path);}
function writePrivate(path,value){writeFileSync(path,value,{mode:0o600,flag:'wx'});}
function jsonFile(path,value){writePrivate(path,JSON.stringify(value,null,2)+'\n');}
function cli(args,config){
 const r=spawnSync(process.execPath,[join(root,'node_modules/wrangler/bin/wrangler.js'),...args,'--config',configPath,'--env='],{cwd:root,env:{...process.env,CLOUDFLARE_ACCOUNT_ID:config.account_id,WRANGLER_SEND_METRICS:'false',CI:'true'},encoding:'utf8',timeout:180000,maxBuffer:16*1024*1024});
 requireOk(r.status===0,'Wrangler read/export failed; raw output and signed download URL suppressed. No automatic retry.');return r.stdout;
}
function developmentConfig(){
 const c=JSON.parse(readFileSync(configPath,'utf8'));
 requireOk(c.account_id==='98b54057fb45feb1d317a48971e4050b'&&c.name==='gnc-cooling-development','Unexpected development account/Worker.');
 requireOk(c.d1_databases?.length===1&&c.r2_buckets?.length===1,'Expected exactly one D1 and R2 binding.');
 requireOk(c.d1_databases[0].binding==='DB'&&c.d1_databases[0].database_name==='gnc-cooling-development','Unexpected D1 binding.');
 requireOk(/^[a-f0-9-]{36}$/.test(c.d1_databases[0].database_id),'Invalid D1 ID.');
 requireOk(c.r2_buckets[0].binding==='FILES'&&c.r2_buckets[0].bucket_name==='gnc-cooling-development-files','Unexpected R2 binding.');return c;
}
function oauthToken(){
 if(process.env.CLOUDFLARE_API_TOKEN)return process.env.CLOUDFLARE_API_TOKEN;
 // Captured in memory only, never printed, logged or copied into backup.
 const r=spawnSync('python3',['-c',`import os,pathlib,tomllib,json
base=pathlib.Path(os.environ.get('XDG_CONFIG_HOME',str(pathlib.Path.home()/'.config')))
data=tomllib.loads((base/'.wrangler/config/default.toml').read_text())
print(json.dumps(data.get('oauth_token') or data.get('api_token')))`],{encoding:'utf8'});
 requireOk(r.status===0,'Wrangler OAuth configuration unavailable; use wrangler login.');
 const token=JSON.parse(r.stdout);requireOk(typeof token==='string'&&token.length>0,'No Wrangler token available.');return token;
}
export function schemaPlan(objects){
 const tables=objects.filter(o=>o.type==='table').map(o=>o.name);
 return {tables,sql:tables.flatMap(t=>['PRAGMA table_info('+q(t)+')','PRAGMA foreign_key_list('+q(t)+')','PRAGMA index_list('+q(t)+')','SELECT COUNT(*) AS count FROM '+q(t)])};
}
export async function snapshot(query){
 const objects=(await query([objectsSql]))[0];
 const {tables,sql}=schemaPlan(objects);
 const data=await query(sql);
 const indexes=data.filter((_,i)=>i%4===2).flat().map(i=>i.name).sort();
 const indexDetails=await query(indexes.map(i=>'PRAGMA index_xinfo('+q(i)+')'));
 const checks=await query(['PRAGMA quick_check','PRAGMA foreign_key_check']);
 same(checks[0],[{quick_check:'ok'}],'DB quick check');same(checks[1],[],'Foreign key check');
 return {objects:objects.map(o=>({...o,sql:o.sql?.replace(/\s+/g,' ').trim()??null})),tables:Object.fromEntries(tables.map((t,i)=>[t,{columns:data[i*4],foreignKeys:data[i*4+1],indexes:data[i*4+2],rows:data[i*4+3][0].count}])),indexDetails:Object.fromEntries(indexes.map((name,i)=>[name,indexDetails[i]])),quickCheck:'ok',foreignKeyViolations:0};
}
function remoteQuery(config){return async statements=>{
 const out=[];for(let i=0;i<statements.length;i+=20){
  const results=JSON.parse(cli(['d1','execute','DB','--remote','--command',statements.slice(i,i+20).join(';')+';','--json'],config));
  requireOk(Array.isArray(results)&&results.every(r=>r.success===true),'D1 read query failed.');out.push(...results.map(r=>r.results));
 }requireOk(out.length===statements.length,'Incomplete D1 results.');return out;
};}
export async function listObjects(get){
 const objects=[],seen=new Set();let cursor;
 do{
  const data=await get('objects'+(cursor?'?cursor='+encodeURIComponent(cursor):''));
  requireOk(Array.isArray(data.result),'Unexpected R2 list response.');objects.push(...data.result);
  const info=data.result_info;
  // Current API omits result_info for an empty bucket. Accept only that unambiguous case.
  if(info===undefined&&data.result.length===0)break;
  requireOk(typeof info?.is_truncated==='boolean','Missing R2 pagination status for nonempty response.');
  cursor=info.is_truncated?info.cursor:undefined;
  if(info.is_truncated){requireOk(typeof cursor==='string'&&cursor.length>0&&!seen.has(cursor),'Invalid/repeated R2 cursor.');seen.add(cursor);}
 }while(cursor);
 requireOk(new Set(objects.map(o=>o.key)).size===objects.length,'Duplicate R2 keys.');
 return objects.sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);
}
export async function backupObjects(objects,directory,download){
 secureDirectory(join(directory,'r2'));
 let total=0;const inventory=[];
 for(const object of objects){
  requireOk(typeof object.key==='string'&&Number.isSafeInteger(object.size)&&object.size>=0,'Invalid object metadata.');
  requireOk(!object.ssec,'Customer-key encrypted object requires separate recovery procedure.');
  total+=object.size;requireOk(object.size<=maxObjectBytes&&total<=maxTotalBytes,'Backup size limit exceeded.');
  const bytes=await download(object);
  requireOk(bytes.length===object.size,'R2 object size changed during backup.');
  const file='r2/'+hash(Buffer.from(object.key))+'.bin';writePrivate(join(directory,file),bytes);
  inventory.push({metadata:object,file,bytes:bytes.length,sha256:hash(bytes)});
 }return inventory;
}
function checkedBackup(path,allowPending=false){
 const dir=resolve(path);requireOk(dir.startsWith(backupRoot+'/'),'Only ignored development backups accepted.');secureDirectory(dir);
 const manifest=JSON.parse(privateFile(join(dir,'manifest.json')));
 requireOk(manifest.format===1&&Array.isArray(manifest.r2)&&(manifest.verified===true||allowPending),'Unsupported/incomplete backup.');
 const payloads=[manifest.d1File,...manifest.r2];const names=new Set();
 for(const entry of payloads){
  requireOk(entry&&(entry.file==='d1.sql'||/^r2\/[a-f0-9]{64}\.bin$/.test(entry.file)),'Unsafe payload path.');
  requireOk(!names.has(entry.file),'Duplicate payload file.');names.add(entry.file);
  if(entry.file.startsWith('r2/'))requireOk(lstatSync(join(dir,'r2')).isDirectory()&&!lstatSync(join(dir,'r2')).isSymbolicLink(),'Unsafe R2 directory.');
  const bytes=privateFile(join(dir,entry.file));requireOk(bytes.length===entry.bytes&&hash(bytes)===entry.sha256,'Backup checksum mismatch.');
 }
 requireOk(new Set(manifest.r2.map(o=>o.metadata.key)).size===manifest.r2.length,'Duplicate object keys.');
 return {dir,manifest};
}
export async function restore(backup,destination,{validation=false}={}){
 const {dir,manifest}=checkedBackup(backup,validation);const dest=resolve(destination);
 requireOk(dest.startsWith(restoreRoot+'/')&&!existsSync(dest),'Restore requires a new ignored isolated directory.');
 secureDirectory(dest);secureDirectory(join(dest,'r2'));
 const dbPath=join(dest,'d1.sqlite');const db=new DatabaseSync(dbPath);chmodSync(dbPath,0o600);
 let actual;
 try{
  db.exec(privateFile(join(dir,'d1.sql')).toString());
  // Export disables FK checks for import order. Enable again and inspect every relation.
  db.exec('PRAGMA foreign_keys=ON');
  same(plain(db.prepare('PRAGMA integrity_check').all()),[{integrity_check:'ok'}],'SQLite integrity');
  actual=await snapshot(async statements=>statements.map(sql=>plain(db.prepare(sql).all())));
  same(actual,manifest.d1,'Restored D1 schema/row counts');
 }finally{db.close();}
 for(const object of manifest.r2)copyFileSync(join(dir,object.file),join(dest,object.file));
 for(const object of manifest.r2){chmodSync(join(dest,object.file),0o600);requireOk(hash(privateFile(join(dest,object.file)))===object.sha256,'Restored R2 checksum mismatch.');}
 jsonFile(join(dest,'r2-manifest.json'),manifest.r2);
 const report={ok:true,restoredAt:new Date().toISOString(),backup:dir,localOnly:true,tables:Object.keys(actual.tables).length,integrityCheck:'ok',foreignKeyViolations:0,r2Objects:manifest.r2.length,r2ChecksumsMatch:true};
 jsonFile(join(dest,'verification.json'),report);return report;
}
export async function backup(){
 const config=developmentConfig();
 const auth=JSON.parse(cli(['whoami','--json'],config));
 requireOk(auth.loggedIn&&auth.accounts.some(a=>a.id===config.account_id),'Configured account not authenticated.');
 const identity=JSON.parse(cli(['d1','info',config.d1_databases[0].database_name,'--json'],config));
 requireOk(identity.name===config.d1_databases[0].database_name&&(identity.uuid??identity.id)===config.d1_databases[0].database_id,'Remote D1 identity mismatch.');
 const token=oauthToken(),base='https://api.cloudflare.com/client/v4/accounts/'+config.account_id+'/r2/buckets/'+config.r2_buckets[0].bucket_name;
 async function get(path){
  const response=await fetch(base+(path?'/'+path:''),{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(60000),redirect:'error'});
  requireOk(response.ok,'R2 GET failed (HTTP '+response.status+'); raw output suppressed.');return response;
 }
 async function json(path){const data=await (await get(path)).json();requireOk(data.success===true,'R2 read failed.');return data;}
 const bucket=(await json('')).result;
 requireOk(bucket.name===config.r2_buckets[0].bucket_name&&bucket.storage_class==='Standard','R2 identity/storage class mismatch.');
 const publicAccess=(await json('domains/managed')).result;
 const domains=(await json('domains/custom')).result;
 requireOk(publicAccess.enabled===false&&Array.isArray(domains.domains)&&domains.domains.length===0,'Expected private R2 with no custom domains.');
 const before=await snapshot(remoteQuery(config));const objects=await listObjects(json);
 const startedAt=new Date().toISOString();const dir=join(backupRoot,startedAt.replaceAll(/[:.]/g,'-')+'-'+randomUUID().slice(0,8));secureDirectory(dir);
 const sqlPath=join(dir,'d1.sql');
 // Capture all Wrangler output: it contains a temporary signed SQL download URL.
 cli(['d1','export','DB','--remote','--output',sqlPath,'--skip-confirmation'],config);chmodSync(sqlPath,0o600);
 const r2=await backupObjects(objects,dir,async object=>{
  const response=await get('objects/'+encodeURIComponent(object.key));
  requireOk(response.headers.get('etag')?.replaceAll('"','')===object.etag,'R2 object ETag changed.');
  return Buffer.from(await response.arrayBuffer());
 });
 const after=await snapshot(remoteQuery(config));same(before,after,'Remote D1 before/after export');same(objects,await listObjects(json),'Remote R2 before/after backup');
 const sql=privateFile(sqlPath);
 const commit=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim();
 const dirty=spawnSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).stdout.trim().length>0;
 const manifest={format:1,verified:false,startedAt,completedAt:new Date().toISOString(),sourceCommit:commit,workingTreeDirty:dirty,node:process.versions.node,wrangler:JSON.parse(readFileSync(join(root,'node_modules/wrangler/package.json'),'utf8')).version,lockSha256:hash(readFileSync(join(root,'pnpm-lock.yaml'))),accountId:config.account_id,databaseId:config.d1_databases[0].database_id,databaseName:identity.name,bucketName:bucket.name,bucketStorageClass:bucket.storage_class,r2Private:true,d1:before,d1File:{file:'d1.sql',bytes:sql.length,sha256:hash(sql)},r2,restore:'node scripts/development-backup.mjs restore BACKUP NEW_NAME',consistency:'Read-only before/after comparison; not an atomic cross-service snapshot. No remote restore supported.'};
 jsonFile(join(dir,'manifest.json'),manifest);
 const name='remote-'+randomUUID().slice(0,8);const verification=await restore(dir,join(restoreRoot,name),{validation:true});
 manifest.verified=true;manifest.completedAt=new Date().toISOString();
 writeFileSync(join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600});
 return {ok:true,backup:relative(root,dir),restore:relative(root,join(restoreRoot,name)),accountMatches:true,databaseMatches:true,r2Private:true,tables:verification.tables,integrityCheck:verification.integrityCheck,foreignKeyViolations:0,r2Objects:r2.length,r2FileRecovery:r2.length?'Local copy checksums verified':'Empty bucket verified; use separate synthetic recovery test'};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 process.umask(0o077);
 try{
  const [mode,a,b,...extra]=process.argv.slice(2);requireOk(extra.length===0,'Too many arguments.');
  let report;
  if(mode==='backup'){requireOk(!a&&!b,'backup takes no resource overrides.');report=await backup();}
  else if(mode==='restore'){requireOk(a&&b&&/^[a-zA-Z0-9_-]+$/.test(b),'Use restore BACKUP NEW_NAME.');report=await restore(a,join(restoreRoot,b));}
  else throw new Error('Use backup or restore BACKUP NEW_NAME.');
  console.log(JSON.stringify(report,null,2));
 }catch(error){console.error('Development backup/restore failed: '+(error instanceof SafeError ? error.message:'private details suppressed')+'; no remote write or automatic cleanup was attempted.');process.exitCode=1;}
}
