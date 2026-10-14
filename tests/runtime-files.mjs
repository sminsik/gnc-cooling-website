// Optional isolated Workers/R2 runtime QA; uses installed Wrangler dependencies, no company DB.
import {realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(realpathSync(fileURLToPath(new URL('../node_modules/wrangler/package.json',import.meta.url))));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
const {build}=require('esbuild');
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
const source=`import {putChecked} from './src/content-files.ts';export default {async fetch(request,env){try{await putChecked(env.FILES,'qa',request.body,Number(request.headers.get('X-Size')),request.headers.get('Content-Type'));const object=await env.FILES.get('qa');return Response.json({size:object.size})}catch(error){return Response.json({rejected:true},{status:400})}}}`;
const result=await build({stdin:{contents:source,resolveDir:process.cwd(),sourcefile:'qa.ts'},bundle:true,format:'esm',platform:'browser',write:false});
const mf=new Miniflare(convertV4MiniflareOptions({name:'qa',modules:true,script:result.outputFiles[0].text,compatibilityDate:'2026-10-10',r2Buckets:['FILES']}));
const checks=[];
try{
 for(const [mime,size,prefix] of [['image/png',10*1024*1024,[137,80,78,71,13,10,26,10]],['application/pdf',20*1024*1024,[37,80,68,70,45]]]){const bytes=new Uint8Array(size);bytes.set(prefix);const response=await mf.dispatchFetch('https://qa.test',{method:'POST',headers:{'Content-Type':mime,'X-Size':String(size)},body:bytes});assert.equal(response.status,200,await response.clone().text());assert.equal((await response.json()).size,size);checks.push(mime+' '+size+' bytes streamed into isolated R2');}
 for(const [bytes,size] of [[new Uint8Array(50),50],[Uint8Array.from([137,80,78,71,13,10,26,10,1,2,3,4,5]),12]]){const response=await mf.dispatchFetch('https://qa.test',{method:'POST',headers:{'Content-Type':'image/png','X-Size':String(size)},body:bytes});assert.equal(response.status,400);}
 checks.push('signature mismatch and actual-byte overflow rejected');
 const out=new URL('../../outputs/검증/20261011-content-files/',import.meta.url);await mkdir(out,{recursive:true});await writeFile(new URL('runtime-results.json',out),JSON.stringify({fixture:'격리된 실제 Workers 런타임/R2, 서명만 갖춘 가상 바이트. 디코딩/악성코드 검사 시험 아님',checks},null,2));console.log(checks);
}finally{await mf.dispose()}
