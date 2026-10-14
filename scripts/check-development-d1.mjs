// Remote modes are read-only. Only --local applies migrations, in a new isolated directory.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,readdirSync,mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
const root=resolve(import.meta.dirname,'..');
const modes=['--preflight','--local','--verify-remote'];
const mode=process.argv[2];assert.ok(modes.includes(mode),'Choose --preflight, --local or --verify-remote.');
const configPath=resolve(root,'configs/wrangler.development.jsonc');
const config=JSON.parse(readFileSync(configPath,'utf8'));
assert.equal(config.name,'gnc-cooling-development');assert.equal(config.d1_databases.length,1);
const binding=config.d1_databases[0];assert.equal(binding.binding,'DB');assert.equal(binding.database_name,'gnc-cooling-development');
assert.match(config.account_id,/^[a-f0-9]{32}$/);assert.match(binding.database_id,/^[a-f0-9-]{36}$/);
const migrations=readdirSync(resolve(root,'migrations')).filter(n=>n.endsWith('.sql')).sort();
assert.equal(migrations.length,12);migrations.forEach((n,i)=>assert.ok(n.startsWith(String(i+1).padStart(4,'0')+'_')));
const sources=migrations.map(n=>readFileSync(resolve(root,'migrations',n),'utf8'));
const sourceHash=createHash('sha256').update(JSON.stringify(migrations.map((name,i)=>({name,sql:sources[i]})))).digest('hex');
function cli(args,path=configPath,local=false){
 const env={...process.env,WRANGLER_SEND_METRICS:'false',CI:'true',CLOUDFLARE_ACCOUNT_ID:config.account_id};
 if(local)for(const n of ['CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_API_TOKEN','CLOUDFLARE_API_KEY','CLOUDFLARE_EMAIL'])delete env[n];
 const r=spawnSync(process.execPath,[resolve(root,'node_modules/wrangler/bin/wrangler.js'),...args,'--config',path,'--env='],{cwd:root,env,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
 if(r.status!==0)throw new Error('Wrangler failed ('+args.slice(0,3).join(' ')+'); API codes '+[...(r.stdout+r.stderr).matchAll(/\[code: (\d+)\]/g)].map(m=>m[1]).join(',')+'. Raw output suppressed. Do not retry migration automatically.');
 return r.stdout;
}
function identity(){
 const auth=JSON.parse(cli(['whoami','--json']));assert.equal(auth.loggedIn,true);
 assert.ok(auth.accounts.some(a=>a.id===config.account_id),'Configured account not in authenticated account list.');
 const db=JSON.parse(cli(['d1','info',binding.database_name,'--json']));
 assert.equal(db.name,binding.database_name);assert.equal(db.uuid??db.id,binding.database_id);
 return db;
}
const objectsSql="SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' AND name <> 'd1_migrations' AND tbl_name <> 'd1_migrations' ORDER BY type,name";
const q=n=>'"'+n.replaceAll('"','""')+'"';
const ref=new DatabaseSync(':memory:');ref.exec('PRAGMA foreign_keys=ON');sources.forEach(sql=>ref.exec(sql));
const objects=ref.prepare(objectsSql).all();
const tables=objects.filter(o=>o.type==='table').map(o=>o.name);
const indexes=tables.flatMap(t=>ref.prepare('PRAGMA index_list('+q(t)+')').all().map(i=>i.name)).sort();
const statements=[objectsSql,...tables.map(t=>'PRAGMA table_info('+q(t)+')'),...tables.map(t=>'PRAGMA foreign_key_list('+q(t)+')'),...tables.map(t=>'PRAGMA index_list('+q(t)+')'),...indexes.map(i=>'PRAGMA index_info('+q(i)+')'),...tables.map(t=>'SELECT COUNT(*) AS count FROM '+q(t)),"SELECT id,name,sort_order,active,version FROM product_categories ORDER BY id",'PRAGMA quick_check','PRAGMA foreign_key_check'];
const expected=statements.map(sql=>ref.prepare(sql).all().map(row=>({...row})));
assert.deepEqual(ref.prepare('PRAGMA integrity_check').all().map(r=>r.integrity_check),['ok']);
function query(sql,path,local,persist){
 const args=['d1','execute','DB',local?'--local':'--remote','--command',sql,'--json'];if(persist)args.push('--persist-to',persist);
 const result=JSON.parse(cli(args,path,local));assert.ok(Array.isArray(result));
 for(const r of result)assert.equal(r.success,true);
 return result.map(r=>r.results);
}
function canonical(value){return JSON.parse(JSON.stringify(value,(key,v)=>key==='sql'&&typeof v==='string'?v.replace(/\s+/g,' ').trim():v));}
function verify(path,local,persist){
 const actual=[];
 // Small batches keep request sizes bounded; SELECT and read-only PRAGMA only.
 for(let i=0;i<statements.length;i+=20)actual.push(...query(statements.slice(i,i+20).join(';')+';',path,local,persist));
 assert.equal(actual.length,expected.length);
 actual.forEach((rows,i)=>assert.deepEqual(canonical(rows),canonical(expected[i]),'Schema/data check failed at '+statements[i]));
 const history=query('SELECT name FROM d1_migrations ORDER BY id;',path,local,persist)[0].map(r=>r.name);
 assert.deepEqual(history,migrations);
 const countStart=1+tables.length*3+indexes.length;
 const counts=Object.fromEntries(tables.map((t,i)=>[t,actual[countStart+i][0].count]));
 assert.equal(counts.product_categories,3);assert.ok(Object.entries(counts).every(([t,n])=>t==='product_categories'||n===0));
 return {tables:tables.length,columns:expected.slice(1,1+tables.length).reduce((n,r)=>n+r.length,0),explicitIndexes:objects.filter(o=>o.type==='index').length,indexesIncludingAutomatic:indexes.length,foreignKeys:expected.slice(1+tables.length,1+2*tables.length).reduce((n,r)=>n+r.length,0),history:history.length,pending:migrations.filter(n=>!history.includes(n)),quickCheck:'ok',foreignKeyViolations:0,rows:counts};
}
let result;
if(mode==='--preflight'){
 const db=identity();assert.equal(db.num_tables,0,'STOP: remote DB no longer empty.');
 const all=query("SELECT name,type FROM sqlite_master WHERE name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' ORDER BY name;",configPath,false)[0];
 assert.deepEqual(all,[],'STOP: unexpected tables/schema present; do not apply migrations.');
 result={accountMatchesConfig:true,databaseNameMatches:true,databaseIdMatches:true,tables:0,empty:true};
}else if(mode==='--local'){
 const parent=resolve(root,'.cloudflare-plan');mkdirSync(parent,{recursive:true,mode:0o700});
 const work=mkdtempSync(resolve(parent,'migration-validation-'));
 const isolated=JSON.parse(readFileSync(resolve(root,'configs/wrangler.development.example.jsonc'),'utf8'));
 isolated.account_id='f'.repeat(32);isolated.d1_databases[0].database_id='11111111-1111-4111-8111-111111111111';
 isolated.main=resolve(root,'src/index.ts');isolated.assets.directory=resolve(root,'public');isolated.d1_databases[0].migrations_dir=resolve(root,'migrations');
 const path=resolve(work,'wrangler.json');writeFileSync(path,JSON.stringify(isolated,null,2),{mode:0o600});
 const persist=resolve(work,'state');
 cli(['d1','migrations','apply','DB','--local','--persist-to',persist],path,true);
 const files=readdirSync(resolve(persist,'v3/d1'),{recursive:true}).filter(n=>/(^|\/)[a-f0-9]{64}\.sqlite$/.test(String(n)));
 assert.equal(files.length,1,'Expected one isolated SQLite file.');
 const actualDb=new DatabaseSync(resolve(persist,'v3/d1',files[0]),{readOnly:true});
 assert.deepEqual(actualDb.prepare('PRAGMA integrity_check').all().map(r=>r.integrity_check),['ok']);
 assert.deepEqual(actualDb.prepare('PRAGMA foreign_key_check').all(),[]);actualDb.close();
 result={isolatedPath:work,integrityCheck:'ok',...verify(path,true,persist)};
 writeFileSync(resolve(work,'validation.json'),JSON.stringify({sourceHash,result},null,2),{mode:0o600});
}else{identity();result={accountMatchesConfig:true,databaseIdMatches:true,...verify(configPath,false)};}
console.log(JSON.stringify({ok:true,mode,readOnly:mode!=='--local',sourceHash,result},null,2));
