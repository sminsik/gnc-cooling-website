import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {checkMvpC} from '../scripts/check-mvp-c.mjs';
import {scannerVerdict} from '../src/scanner-verdict.ts';
const good={'Content-Type':'image/png','Content-Length':'12','X-Scan-Contract':'gnc-content-v1','X-Scan-Engine':'test-only','X-Structure-Result':'pass','X-Malware-Result':'clean','X-Image-Sanitized':'true','X-Image-Width':'1','X-Image-Height':'1'};
test('scanner rejects missing/ambiguous attestations, oversized decoded images and unsafe PDFs',()=>{
 for(const field of Object.keys(good)){const headers={...good};delete headers[field];assert.throws(()=>scannerVerdict(new Response(new Uint8Array(12),{headers}),'image/png',20),field);}
 for(const change of [{'Content-Length':'1e1'},{'Content-Length':'21'},{'X-Scan-Engine':' '},{'X-Malware-Result':'unknown'},{'X-Image-Width':'1e2'},{'X-Image-Width':'40000001'}])assert.throws(()=>scannerVerdict(new Response(new Uint8Array(12),{headers:{...good,...change}}),'image/png',20));
 assert.deepEqual(scannerVerdict(new Response(new Uint8Array(12),{headers:good}),'image/png',20),{size:12,engine:'test-only'});
 const pdf={...good,'Content-Type':'application/pdf'};assert.throws(()=>scannerVerdict(new Response(new Uint8Array(12),{headers:pdf}),'application/pdf',20));assert.equal(scannerVerdict(new Response(new Uint8Array(12),{headers:{...pdf,'X-Pdf-Safe':'true'}}),'application/pdf',20).size,12);
});
test('connection report is read-only, redacts secrets and never claims a declaration proves integration',async()=>{
 const root=await mkdtemp(join(tmpdir(),'gnc-c-'));
 try{
  await writeFile(join(root,'.dev.vars'),'APP_ORIGIN=https://test.example\nOIDC_ISSUER=https://identity.example\nOIDC_CLIENT_ID=private-client\nOIDC_CLIENT_SECRET=private-secret\nSTAFF_AUTH_RATE_SECRET='+ 'x'.repeat(32));
  await writeFile(join(root,'wrangler.jsonc'),'// declaration only\n'+JSON.stringify({services:[{binding:'FILE_SCANNER',service:'private-service'}]}));
  const report=await checkMvpC(root);assert.equal(report.readOnly,true);assert.equal(report.items[0].state,'configured');assert.equal(report.items[1].state,'declared');assert.equal(report.items[2].state,'database-unavailable');
  for(const value of ['private-client','private-secret','private-service','https://identity.example'])assert.equal(JSON.stringify(report).includes(value),false);
  await writeFile(join(root,'.dev.vars'),'APP_ORIGIN=http://invalid.example');const missing=await checkMvpC(root);assert.equal(missing.items[0].state,'missing');
 }finally{await rm(root,{recursive:true,force:true});}
});
