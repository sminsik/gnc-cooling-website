import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './helpers/staff-fixture.mjs';
import {expireUploads,cleanTemporaryFiles} from '../src/file-processing.ts';
import {runMaintenance} from '../src/maintenance.ts';
function file(sql,id,attached=0){sql.prepare("INSERT INTO files(id,object_key,source_key,original_name,mime,size_bytes,purpose,status,expires_at,attached) VALUES(?,?,?,'test','image/png',20,'private','temporary',1,?)").run(id,'safe/'+id,'raw/'+id,attached);}
test('partial object deletion retries both keys and records completion only after success',async()=>{
 const {sql,env}=setup();file(sql,'retry');let failing=true;const calls=[];env.FILES.delete=async key=>{calls.push(key);if(key==='safe/retry'&&failing)throw Error('private provider error');};
 await expireUploads(env,100);await cleanTemporaryFiles(env,100);
 assert.equal(sql.prepare('SELECT completed_at FROM file_cleanup_jobs').get().completed_at,null);
 assert.equal(sql.prepare('SELECT last_result FROM file_cleanup_jobs').get().last_result,'retry');
 await cleanTemporaryFiles(env,101);assert.equal(calls.length,2);
 failing=false;await cleanTemporaryFiles(env,60100);assert.deepEqual(calls,['raw/retry','safe/retry','raw/retry','safe/retry']);
 assert.equal(sql.prepare('SELECT completed_at FROM file_cleanup_jobs').get().completed_at,60100);
 await cleanTemporaryFiles(env,1000000);assert.equal(calls.length,4);
});
test('attached and referenced files survive cleanup; interrupted enqueue is recovered',async()=>{
 const {sql,env}=setup();file(sql,'attached',1);file(sql,'reference');file(sql,'interrupted');
 sql.exec("INSERT INTO products(id,category_id,name,primary_file_id) VALUES('p','cooling-towers','test','reference'); UPDATE files SET status='pending_deletion',deleted_at=CURRENT_TIMESTAMP WHERE id='interrupted'");
 const calls=[];env.FILES.delete=async key=>calls.push(key);
 await expireUploads(env,100);await cleanTemporaryFiles(env,100);
 assert.deepEqual(calls,['raw/interrupted','safe/interrupted']);
 assert.equal(sql.prepare("SELECT deleted_at FROM files WHERE id='attached'").get().deleted_at,null);
 assert.equal(sql.prepare("SELECT completed_at FROM file_cleanup_jobs WHERE file_id='reference'").get().completed_at,null);
});
test('one maintenance failure does not stop later tasks and error excludes private details',async()=>{
 const calls=[];
 await assert.rejects(runMaintenance({first:async()=>{calls.push(1);throw Error('customer@email.test');},second:async()=>calls.push(2)}),error=>error.message==='Maintenance failed: first');
 assert.deepEqual(calls,[1,2]);
});
