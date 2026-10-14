// Explicit opt-in real scanner + isolated workerd bindings/pipeline. No HTTPS/staff server required.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire,stripTypeScriptTypes} from 'node:module';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import {setup} from './helpers/staff-fixture.mjs';
import {scannerVerdict} from '../src/scanner-verdict.ts';
import {processFiles} from '../src/file-processing.ts';
const require=createRequire(import.meta.url);
const {Miniflare,convertV4MiniflareOptions}=await import(require.resolve('miniflare',{paths:[dirname(require.resolve('wrangler/package.json'))]}));
const project=fileURLToPath(new URL('../',import.meta.url));
const work=process.env.SCANNER_WORK_DIR || (process.platform==='darwin'?resolve(project,'../.work/c-local'):resolve(project,'.local-scanner'));
const file=name=>pathToFileURL(resolve(work,name));
const token=(await readFile(file('scanner-secret'),'utf8')).trim();
const adapter=stripTypeScriptTypes(await readFile(new URL('../dev/scanner/adapter.ts',import.meta.url),'utf8'));
const timeoutTest=process.argv.includes('--timeout');
const hanging=timeoutTest?createServer((request,response)=>{request.resume();}):undefined;
if(hanging)await new Promise((accept,reject)=>{hanging.once('error',reject);hanging.listen(8790,'127.0.0.1',accept);});
const runtime=new Miniflare(convertV4MiniflareOptions({workers:[{name:'scanner-test-app',modules:true,script:'export default {fetch(request,env){return env.FILE_SCANNER.fetch(request)}}',serviceBindings:{FILE_SCANNER:'scanner-test-service'},compatibilityDate:'2026-10-10'},{name:'scanner-test-service',modules:true,script:adapter,bindings:{SCANNER_TOKEN:token,...(timeoutTest?{SCANNER_TIMEOUT_MS:'100'}:{})},compatibilityDate:'2026-10-10'}]}));
const proxy={env:await runtime.getBindings('scanner-test-app'),dispose:()=>runtime.dispose()};
const out=pathToFileURL(resolve(work,'results')+'/');await mkdir(out,{recursive:true,mode:0o700});
const checks=[];
const offline=process.argv.includes('--offline')||timeoutTest;
try{
 if(offline){
  const source=await readFile(file('fixtures/safe.png'));
  const response=await proxy.env.FILE_SCANNER.fetch('https://scanner.internal/v1/content',{method:'POST',headers:{'Content-Type':'image/png','X-Scan-Contract':'gnc-content-v1'},body:source});
  assert.equal(response.status,503);assert.throws(()=>scannerVerdict(response,'image/png',source.length));
  checks.push((timeoutTest?'Unresponsive synthetic server → actual adapter timeout':'Stopped real scanner')+' → adapter 503 → no valid verdict');
 }
 if(!offline&&!process.argv.includes('--pipeline-only'))for(const [name,mime,expected] of [['safe.png','image/png',200],['safe.jpg','image/jpeg',200],['safe.webp','image/webp',200],['safe.pdf','application/pdf',200],['encrypted.pdf','application/pdf',422],['javascript.pdf','application/pdf',422],['embedded.pdf','application/pdf',422],['eicar.pdf','application/pdf',422],['broken.pdf','application/pdf',422]]){
  const source=await readFile(file('fixtures/'+name));
  const response=await proxy.env.FILE_SCANNER.fetch('https://scanner.internal/v1/content',{method:'POST',headers:{'Content-Type':mime,'X-Scan-Contract':'gnc-content-v1'},body:source});assert.equal(response.status,expected,name);
  if(expected===200){const verdict=scannerVerdict(response,mime,source.length),bytes=new Uint8Array(await response.arrayBuffer());assert.equal(bytes.length,verdict.size);await writeFile(file('fixtures/checked-'+name),bytes,{mode:0o600});checks.push(name+': actual structure + malware inspection passed');}
  else checks.push(name+': blocked');
 }
 const f=setup();try{
  await f.staff('scanner-owner',['content_manager']);const source=await readFile(file('fixtures/safe.png'));const objects=new Map([['quarantine/test-source',source]]);
  f.env.FILE_SCANNER={async fetch(url,init){return proxy.env.FILE_SCANNER.fetch(url,{...init,duplex:'half'});}};f.env.FILES={async get(key){const bytes=objects.get(key);return bytes?{body:new ReadableStream({start(c){c.enqueue(bytes);c.close()}})}:null;},async put(key,stream){objects.set(key,new Uint8Array(await new Response(stream).arrayBuffer()));},async delete(key){objects.delete(key)}};
  f.sql.prepare("INSERT INTO files(id,original_name,object_key,source_key,mime,size_bytes,purpose,status,owner_id,created_at) VALUES('scan-test','development fixture','quarantine/test-source','quarantine/test-source','image/png',?,'public_image','validating','scanner-owner',CURRENT_TIMESTAMP)").run(source.length);
  f.sql.prepare("INSERT INTO file_jobs(file_id,available_at) VALUES('scan-test',?)").run(Date.now());await processFiles(f.env);
  const row=f.sql.prepare("SELECT status,scan_engine,object_key FROM files WHERE id='scan-test'").get();
  if(offline){assert.equal(row.status,'validating');assert.equal(row.scan_engine,null);assert.equal(objects.size,1);checks.push('Stopped scanner pipeline stays validating; no new safe object');}
  else{assert.equal(row.status,'ready');assert.match(row.scan_engine,/ClamAV/);assert.notEqual(row.object_key,'quarantine/test-source');assert.ok(objects.has(row.object_key));checks.push('Real service binding → inspection → new object → ready (isolated memory database)');}
 }finally{f.sql.close();}
 await writeFile(new URL(timeoutTest?'scanner-timeout-results.json':offline?'scanner-offline-results.json':process.argv.includes('--pipeline-only')?'scanner-pipeline-results.json':'scanner-results.json',out),JSON.stringify({fixture:'Generated fixtures, isolated memory DB; no company files or real staff sessions',checks},null,2),{mode:0o600});console.log(JSON.stringify({passed:checks.length,checks}));
}finally{await proxy.dispose();if(hanging){hanging.closeAllConnections();await new Promise(accept=>hanging.close(accept));}}
