import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT} from 'jose';
import {previewGate} from '../src/development-preview.ts';
import worker from '../src/index.ts';
const env={DEPLOYMENT_ENVIRONMENT:'development',ACCESS_TEAM_DOMAIN:'gnc-test.cloudflareaccess.com',ACCESS_AUD:'test-audience'};
const {privateKey,publicKey}=await generateKeyPair('RS256');
const jwk={...await exportJWK(publicKey),kid:'test',alg:'RS256',use:'sig'};
const resolveKey=createLocalJWKSet({keys:[jwk]});
async function token(changes={}){return new SignJWT({email:'virtual@example.invalid',...changes}).setProtectedHeader({alg:'RS256',kid:'test'}).setSubject('virtual').setIssuer('https://'+env.ACCESS_TEAM_DOMAIN).setAudience(env.ACCESS_AUD).setIssuedAt().setExpirationTime('5m').sign(privateKey);}
function request(path,jwt,method='GET'){return new Request('https://preview.example.invalid'+path,{method,headers:jwt?{'Cf-Access-Jwt-Assertion':jwt}:{}});}
test('preview rejects unset Access, spoofed headers and tokens before touching bindings',async()=>{
 const bindings=new Proxy({}, {get(){throw new Error('binding must not be touched');}});
 for(const settings of [{...env,ACCESS_AUD:''},env]){
  const r=await worker.fetch(request('/api/health'),{...settings,DB:bindings,FILES:bindings,ASSETS:bindings});assert.equal(r.status,settings.ACCESS_AUD?403:503);
  assert.equal(r.headers.get('X-GNC-Environment'),'development');assert.equal(r.headers.get('Cache-Control'),'no-store');
 }
 assert.equal((await previewGate(request('/','forged'),env,resolveKey)).status,403);
 const signed=await token();assert.equal((await previewGate(request('/',signed),{...env,ACCESS_AUD:'other'},resolveKey)).status,403);
 assert.equal((await previewGate(request('/',signed),{...env,ACCESS_TEAM_DOMAIN:'other.cloudflareaccess.com'},resolveKey)).status,403);
 const expired=await new SignJWT({email:'virtual@example.invalid'}).setProtectedHeader({alg:'RS256',kid:'test'}).setSubject('virtual').setIssuer('https://'+env.ACCESS_TEAM_DOMAIN).setAudience(env.ACCESS_AUD).setIssuedAt().setExpirationTime(1).sign(privateKey);
 assert.equal((await previewGate(request('/',expired),env,resolveKey)).status,403);
 assert.equal((await previewGate(request('/',signed),env,async()=>{throw new Error('JWKS unavailable');})).status,403);
});
test('verified viewers cannot open staff, customer, uploads or any mutation; local stays unchanged',async()=>{
 const signed=await token();assert.equal(await previewGate(request('/',signed),env,resolveKey),null);
 for(const path of ['/admin/login','/api/admin/products/x/uploads','/api/admin/files/x/bytes','/api/admin/inquiry-files/x/bytes','/api/staff-auth/password-login','/api/inquiries','/api/inquiries/uploads','/api/my-inquiries','/my-inquiries'])assert.equal((await previewGate(request(path,signed),env,resolveKey)).status,503,path);
 assert.equal((await previewGate(request('/',signed,'POST'),env,resolveKey)).status,405);
 assert.equal(await previewGate(request('/admin/login'),{},resolveKey),null);
});
test('real routing checks authenticated health without exposing IDs, keys or error details',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async(url)=>{assert.equal(String(url),'https://'+env.ACCESS_TEAM_DOMAIN+'/cdn-cgi/access/certs');return Response.json({keys:[jwk]});};
 try{
  const signed=await token();let reads=0;
  const bindings={...env,DB:{prepare(sql){assert.equal(sql,'SELECT COUNT(*) AS count FROM d1_migrations');reads++;return {first:async()=>({count:12})};}},FILES:{list:async()=>{reads++;return {objects:[]};}}};
  const response=await worker.fetch(request('/api/health',signed),bindings);assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true,environment:'development'});assert.equal(reads,2);
  const failure=await worker.fetch(request('/api/health',signed),{...bindings,FILES:{list:async()=>{throw new Error('sensitive-bucket-key');}}});assert.equal(failure.status,503);assert.deepEqual(await failure.json(),{ok:false,environment:'development'});
  await worker.scheduled({},bindings,{waitUntil(){throw new Error('development scheduled work must remain disabled');}});
 }finally{globalThis.fetch=original;}
 const external=await worker.fetch(request('/api/health'),{DB:{},FILES:{}});assert.equal(external.status,404);
});
