// Explicit opt-in integration test. Requires the real local scanner + HTTPS dev workers.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire,stripTypeScriptTypes} from 'node:module';
import {dirname} from 'node:path';
import {setup} from './helpers/staff-fixture.mjs';
import {scannerVerdict} from '../src/scanner-verdict.ts';
import {processFiles} from '../src/file-processing.ts';
const require=createRequire(import.meta.url);
const {Miniflare,convertV4MiniflareOptions}=await import(require.resolve('miniflare',{paths:[dirname(require.resolve('wrangler/package.json'))]}));
const token=(await readFile(new URL('../../.work/c-local/scanner-secret',import.meta.url),'utf8')).trim();
const adapter=stripTypeScriptTypes(await readFile(new URL('../dev/scanner/adapter.ts',import.meta.url),'utf8'));
const runtime=new Miniflare(convertV4MiniflareOptions({workers:[{name:'scanner-test-app',modules:true,script:'export default {fetch(request,env){return env.FILE_SCANNER.fetch(request)}}',serviceBindings:{FILE_SCANNER:'scanner-test-service'},compatibilityDate:'2026-10-10'},{name:'scanner-test-service',modules:true,script:adapter,bindings:{SCANNER_TOKEN:token},compatibilityDate:'2026-10-10'}]}));
const proxy={env:await runtime.getBindings('scanner-test-app'),dispose:()=>runtime.dispose()};
const out=new URL('../../outputs/검증/20261011-mvp-c-local/',import.meta.url);await mkdir(out,{recursive:true});
const checks=[];
try{
 if(!process.argv.includes('--pipeline-only'))for(const [name,mime,expected] of [['safe.png','image/png',200],['safe.jpg','image/jpeg',200],['safe.webp','image/webp',200],['safe.pdf','application/pdf',200],['encrypted.pdf','application/pdf',422],['javascript.pdf','application/pdf',422],['embedded.pdf','application/pdf',422],['eicar.pdf','application/pdf',422],['broken.pdf','application/pdf',422]]){
  const source=await readFile(new URL('../../.work/c-local/fixtures/'+name,import.meta.url));
  const response=await proxy.env.FILE_SCANNER.fetch('https://scanner.internal/v1/content',{method:'POST',headers:{'Content-Type':mime,'X-Scan-Contract':'gnc-content-v1'},body:source});assert.equal(response.status,expected,name);
  if(expected===200){const verdict=scannerVerdict(response,mime,source.length),bytes=new Uint8Array(await response.arrayBuffer());assert.equal(bytes.length,verdict.size);await writeFile(new URL('../../.work/c-local/fixtures/checked-'+name,import.meta.url),bytes);checks.push(name+': actual structure + malware inspection passed');}
  else checks.push(name+': blocked');
 }
 const f=setup();try{
  await f.staff('scanner-owner',['content_manager']);const source=await readFile(new URL('../../.work/c-local/fixtures/safe.png',import.meta.url));const objects=new Map([['quarantine/test-source',source]]);
  f.env.FILE_SCANNER={async fetch(url,init){try{return await proxy.env.FILE_SCANNER.fetch(url,{...init,duplex:'half'});}catch(error){console.log('Binding invocation failure:',error.message);throw error;}}};f.env.FILES={async get(key){const bytes=objects.get(key);return bytes?{body:new ReadableStream({start(c){c.enqueue(bytes);c.close()}})}:null;},async put(key,stream){objects.set(key,new Uint8Array(await new Response(stream).arrayBuffer()));},async delete(key){objects.delete(key)}};
  f.sql.prepare("INSERT INTO files(id,original_name,object_key,source_key,mime,size_bytes,purpose,status,owner_id,created_at) VALUES('scan-test','development fixture','quarantine/test-source','quarantine/test-source','image/png',?,'public_image','validating','scanner-owner',CURRENT_TIMESTAMP)").run(source.length);
  f.sql.prepare("INSERT INTO file_jobs(file_id,available_at) VALUES('scan-test',?)").run(Date.now());await processFiles(f.env);
  const row=f.sql.prepare("SELECT status,scan_engine,object_key FROM files WHERE id='scan-test'").get();assert.equal(row.status,'ready');assert.match(row.scan_engine,/ClamAV/);assert.notEqual(row.object_key,'quarantine/test-source');assert.ok(objects.has(row.object_key));checks.push('Real service binding → inspection → new object → ready (isolated memory database)');
 }finally{f.sql.close();}
 await writeFile(new URL(process.argv.includes('--pipeline-only')?'scanner-pipeline-results.json':'scanner-results.json',out),JSON.stringify({engine:'ClamAV 1.5.4; actual official signature databases',fixture:'Generated fixtures, isolated memory DB; no company files or real staff sessions',checks},null,2));console.log(JSON.stringify({passed:checks.length,checks}));
}finally{await proxy.dispose();}
