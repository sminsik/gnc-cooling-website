// Validates the actual ignored development bindings, then bundles only. Never deploys.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
const path=resolve(root,'configs/wrangler.development.jsonc');
const config=JSON.parse(readFileSync(path,'utf8'));
const template=JSON.parse(readFileSync(resolve(root,'configs/wrangler.development.example.jsonc'),'utf8'));
assert.match(config.account_id,/^[a-f0-9]{32}$/);assert.match(config.d1_databases[0].database_id,/^[a-f0-9-]{36}$/);
const policy=structuredClone(config);policy.account_id=template.account_id;policy.d1_databases[0].database_id=template.d1_databases[0].database_id;
// Access values may be supplied after approval; the worker rejects missing values.
for(const field of ['ACCESS_TEAM_DOMAIN','ACCESS_AUD'])policy.vars[field]=template.vars[field];
assert.deepEqual(policy,template,'Actual development config violates closed preview policy.');
if(config.vars.ACCESS_TEAM_DOMAIN)assert.match(config.vars.ACCESS_TEAM_DOMAIN,/^[a-z0-9-]+\.cloudflareaccess\.com$/);
config.main=resolve(path,'..',config.main);config.assets.directory=resolve(path,'..',config.assets.directory);config.d1_databases[0].migrations_dir=resolve(path,'..',config.d1_databases[0].migrations_dir);
const work=resolve(root,'.cloudflare-plan/development-preview-build');mkdirSync(work,{recursive:true,mode:0o700});
const generated=resolve(work,'wrangler.json');writeFileSync(generated,JSON.stringify(config,null,2),{mode:0o600});
const env={...process.env,WRANGLER_SEND_METRICS:'false'};for(const n of ['CLOUDFLARE_API_TOKEN','CLOUDFLARE_API_KEY','CLOUDFLARE_EMAIL','CLOUDFLARE_ACCOUNT_ID'])delete env[n];
const r=spawnSync(process.execPath,[resolve(root,'node_modules/wrangler/bin/wrangler.js'),'deploy','--config',generated,'--env=','--dry-run','--outdir',resolve(work,'bundle')],{cwd:root,env,encoding:'utf8',timeout:60000});
assert.equal(r.status,0,'Development dry-run failed; raw output suppressed.');
console.log(JSON.stringify({ok:true,dryRun:true,worker:config.name,d1:config.d1_databases[0].database_name,r2:config.r2_buckets[0].bucket_name,publicUrlsEnabled:false,accessConfigured:!!config.vars.ACCESS_TEAM_DOMAIN&&!!config.vars.ACCESS_AUD}));
