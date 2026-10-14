import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {mkdirSync,mkdtempSync,writeFileSync,readFileSync,statSync,symlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {snapshot,listObjects,backupObjects,restore} from '../scripts/development-backup.mjs';
const root=resolve(import.meta.dirname,'..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function work(parent){mkdirSync(join(root,parent),{recursive:true,mode:0o700});return mkdtempSync(join(root,parent,'fixture-'));}

test('R2 list follows all pages and refuses missing/repeated cursors and incomplete responses',async()=>{
 const paths=[];
 const objects=await listObjects(async path=>{paths.push(path);return paths.length===1?{result:[{key:'b'}],result_info:{is_truncated:true,cursor:'next / page'}}:{result:[{key:'a'}],result_info:{is_truncated:false}};});
 assert.deepEqual(objects.map(o=>o.key),['a','b']);assert.equal(paths[1],'objects?cursor=next%20%2F%20page');
 await assert.rejects(()=>listObjects(async()=>({result:[],result_info:{is_truncated:true,cursor:'loop'}})),/repeated/);
 await assert.rejects(()=>listObjects(async()=>({result:[{key:'nonempty'}]})),/pagination/);
 await assert.rejects(()=>listObjects(async()=>({result:[{key:'a'},{key:'a'}],result_info:{is_truncated:false}})),/Duplicate/);
});

test('remote-format D1 and R2 backup restores only into a new isolated local environment',async()=>{
 const dir=work('.cloudflare-backups'),destination=join(work('.cloudflare-restore-tests'),'restored');
 const sql="PRAGMA foreign_keys=OFF; CREATE TABLE parents(id TEXT PRIMARY KEY); CREATE TABLE children(id INTEGER PRIMARY KEY,parent TEXT REFERENCES parents(id), value BLOB); CREATE INDEX children_parent ON children(parent); INSERT INTO parents VALUES('synthetic'); INSERT INTO children VALUES(1,'synthetic',X'00FF');";
 const db=new DatabaseSync(':memory:');db.exec(sql);
 const source=await snapshot(async statements=>statements.map(s=>db.prepare(s).all().map(row=>({...row}))));db.close();
 const values=new Map([['../가상.txt',Buffer.from('가상 파일\n')],['binary.dat',Buffer.from([0,255,128])],['empty.txt',Buffer.alloc(0)]]);
 const objects=[...values].map(([key,value])=>({key,size:value.length,etag:hash(value),custom_metadata:{purpose:'synthetic-backup-test'},http_metadata:{contentType:'application/octet-stream'},storage_class:'Standard'}));
 const r2=await backupObjects(objects,dir,async o=>values.get(o.key));
 writeFileSync(join(dir,'d1.sql'),sql,{mode:0o600});
 const manifest={format:1,verified:true,d1:source,d1File:{file:'d1.sql',bytes:Buffer.byteLength(sql),sha256:hash(sql)},r2};
 writeFileSync(join(dir,'manifest.json'),JSON.stringify(manifest),{mode:0o600});
 const report=await restore(dir,destination);assert.equal(report.integrityCheck,'ok');assert.equal(report.r2Objects,3);
 assert.equal(statSync(destination).mode&0o777,0o700);assert.equal(statSync(join(destination,'d1.sqlite')).mode&0o777,0o600);
 const metadata=JSON.parse(readFileSync(join(destination,'r2-manifest.json'),'utf8'));
 assert.deepEqual(metadata,r2);
 const require=createRequire(import.meta.url);
 const {Miniflare,convertV4MiniflareOptions}=require(require.resolve('miniflare',{paths:[dirname(require.resolve('wrangler/package.json'))]}));
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {}',compatibilityDate:'2026-10-10',resourcePersistencePath:join(destination,'synthetic-runtime/v3'),r2Buckets:{FILES:'synthetic-recovery'}}));
 try{
  const bucket=await mf.getR2Bucket('FILES');
  for(const object of metadata)await bucket.put(object.metadata.key,readFileSync(join(destination,object.file)),{customMetadata:object.metadata.custom_metadata,httpMetadata:object.metadata.http_metadata});
  assert.deepEqual((await bucket.list()).objects.map(o=>o.key).sort(),[...values.keys()].sort());
  for(const object of metadata){const item=await bucket.get(object.metadata.key);assert.deepEqual(Buffer.from(await item.arrayBuffer()),values.get(object.metadata.key));assert.deepEqual(item.customMetadata,object.metadata.custom_metadata);assert.equal(item.httpMetadata.contentType,object.metadata.http_metadata.contentType);}
 }finally{await mf.dispose();}
 await assert.rejects(()=>restore(dir,destination),/new ignored/);
 await assert.rejects(()=>restore(dir,join(root,'.wrangler/state/forbidden')),/new ignored/);
 manifest.d1.tables.parents.rows=2;writeFileSync(join(dir,'manifest.json'),JSON.stringify(manifest));
 await assert.rejects(()=>restore(dir,destination+'-wrong-count'),/mismatch/);
 manifest.d1=source;manifest.d1.tables.parents.rows=1;writeFileSync(join(dir,'manifest.json'),JSON.stringify(manifest));
 writeFileSync(join(dir,r2[0].file),'corrupt');
 await assert.rejects(()=>restore(dir,destination+'-corrupt'),/checksum/);
});

test('backup rejects unsafe symlinks, payload paths and customer-key encrypted objects',async()=>{
 const dir=work('.cloudflare-backups');
 await assert.rejects(()=>backupObjects([{key:'secret',size:1,ssec:true}],dir,async()=>Buffer.from('x')),/Customer-key/);
 const payload=join(dir,'d1.sql');symlinkSync(join(root,'README.md'),payload);
 const manifest={format:1,verified:true,d1File:{file:'d1.sql',bytes:0,sha256:hash('')},r2:[]};
 writeFileSync(join(dir,'manifest.json'),JSON.stringify(manifest));
 await assert.rejects(()=>restore(dir,join(work('.cloudflare-restore-tests'),'symlink')),/Unsafe backup file/);
 manifest.d1File.file='../../README.md';writeFileSync(join(dir,'manifest.json'),JSON.stringify(manifest));
 await assert.rejects(()=>restore(dir,join(work('.cloudflare-restore-tests'),'traversal')),/Unsafe D1 payload/);
 manifest.d1File.file='r2/'+'a'.repeat(64)+'.bin';writeFileSync(join(dir,'manifest.json'),JSON.stringify(manifest));
 await assert.rejects(()=>restore(dir,join(work('.cloudflare-restore-tests'),'wrong-d1-mapping')),/Unsafe D1 payload/);
});
