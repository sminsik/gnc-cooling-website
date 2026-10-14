// Offline policy checks plus optional Wrangler dry-run. Never fills real resource IDs.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..');
const live=await readFile(resolve(root,'wrangler.jsonc'));
const templates=[];
for(const environment of ['development','production']){
 const path=resolve(root,'configs/wrangler.'+environment+'.example.jsonc');
 const config=JSON.parse(await readFile(path,'utf8'));
 assert.equal(config.name,'gnc-cooling-'+environment);assert.match(config.account_id,/^REPLACE_WITH_APPROVED_/);
 assert.equal(config.workers_dev,false);assert.equal(config.preview_urls,false);assert.deepEqual(config.routes,[]);
 assert.deepEqual(config.triggers.crons,[]);assert.deepEqual(config.services,[]);
 assert.equal(config.vars.STAFF_AUTH_MODE,'');assert.equal(config.vars.APP_ORIGIN,'');
 assert.equal(config.vars.INQUIRY_INTAKE_ENABLED,'');assert.equal(config.vars.CUSTOMER_ORIGIN,'');
 assert.deepEqual(Object.keys(config.vars).sort(),['APP_ORIGIN','CUSTOMER_ORIGIN','INQUIRY_INTAKE_ENABLED','STAFF_AUTH_MODE']);
 assert.equal(config.d1_databases.length,1);assert.equal(config.d1_databases[0].binding,'DB');
 assert.equal(config.d1_databases[0].database_name,config.name);assert.match(config.d1_databases[0].database_id,/^REPLACE_WITH_APPROVED_/);
 assert.equal(config.r2_buckets.length,1);assert.equal(config.r2_buckets[0].binding,'FILES');
 assert.equal(config.r2_buckets[0].bucket_name,config.name+'-files');
 assert.equal(config.assets.binding,'ASSETS');
 assert.ok((await stat(resolve(path,'..',config.main))).isFile());
 for(const relative of [config.assets.directory,config.d1_databases[0].migrations_dir])assert.ok((await stat(resolve(path,'..',relative))).isDirectory());
 templates.push({environment,path,config});
}
assert.notEqual(templates[0].config.d1_databases[0].database_id,templates[1].config.d1_databases[0].database_id);
assert.notEqual(templates[0].config.r2_buckets[0].bucket_name,templates[1].config.r2_buckets[0].bucket_name);
if(process.argv.includes('--dry-run')){
 const work=resolve(root,'.cloudflare-plan');await mkdir(work,{recursive:true,mode:0o700});
 for(const {environment,path,config} of templates){
  const temporary=structuredClone(config);
  temporary.account_id='f'.repeat(32);
  temporary.d1_databases[0].database_id=environment==='development'?'11111111-1111-4111-8111-111111111111':'22222222-2222-4222-8222-222222222222';
  temporary.main=resolve(path,'..',config.main);temporary.assets.directory=resolve(path,'..',config.assets.directory);
  temporary.d1_databases[0].migrations_dir=resolve(path,'..',config.d1_databases[0].migrations_dir);
  const generated=resolve(work,'wrangler.'+environment+'.json');await writeFile(generated,JSON.stringify(temporary,null,2),{mode:0o600});
  const env={...process.env,WRANGLER_SEND_METRICS:'false'};
  for(const name of ['CLOUDFLARE_API_TOKEN','CLOUDFLARE_API_KEY','CLOUDFLARE_EMAIL','CLOUDFLARE_ACCOUNT_ID'])delete env[name];
  const result=spawnSync(process.execPath,[resolve(root,'node_modules/wrangler/bin/wrangler.js'),'deploy','--config',generated,'--env=','--dry-run','--outdir',resolve(work,environment)],{cwd:root,env,encoding:'utf8',timeout:30000});
  if(result.status!==0){console.error('Offline dry-run failed for '+environment+'; raw CLI output suppressed.');process.exit(1);}
 }
}
assert.deepEqual(await readFile(resolve(root,'wrangler.jsonc')),live);
console.log(JSON.stringify({ok:true,environments:templates.map(t=>t.environment),publicRoutes:false,servicesConnected:false,localConfigurationUnchanged:true,localConfigSha256:createHash('sha256').update(live).digest('hex'),dryRun:process.argv.includes('--dry-run')},null,2));
