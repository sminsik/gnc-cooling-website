// All writes are confined to a new, ignored test directory; no real bindings or secrets.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {cp, mkdtemp, mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(import.meta.url);
const {Miniflare,convertV4MiniflareOptions}=require(require.resolve('miniflare',{paths:[dirname(require.resolve('wrangler/package.json'))]}));
await mkdir(resolve(root,'.local-restore-tests'),{recursive:true,mode:0o700});
const work=await mkdtemp(resolve(root,'.local-restore-tests/fixture-'));
const state=resolve(work,'source/v3');
const options={modules:true,script:'export default {fetch(){return new Response("fixture")}}',
 compatibilityDate:'2026-10-10',d1Databases:{DB:'00000000-0000-0000-0000-000000000001'},
 r2Buckets:{FILES:'gnc-cooling-local-files'}};
function runtime(state){return new Miniflare(convertV4MiniflareOptions({...options,resourcePersistencePath:state}));}
const objects=new Map([
 ['fixture/안내.txt',Buffer.from('가상 백업 시험 자료\n')],
 ['fixture/binary.dat',Buffer.from([0,1,2,255,128])],
 ['fixture/empty.txt',Buffer.alloc(0)],
]);
let mf=runtime(state);
try{
 const db=await mf.getD1Database('DB');
 for(const name of (await readdir(resolve(root,'migrations'))).filter(n=>n.endsWith('.sql')).sort()){
  const sql=await readFile(resolve(root,'migrations',name),'utf8');
  // D1 exec expects one statement per line; use prepared migration statements.
  for(const statement of sql.replace(/^--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean))
   await db.prepare(statement).run();
 }
 await db.prepare('INSERT INTO notices(id,title,body) VALUES(?,?,?)')
  .bind('backup-fixture','가상 공지','실제 고객·직원 정보 없음').run();
 const bucket=await mf.getR2Bucket('FILES');
 for(const [key,value] of objects)await bucket.put(key,value,{customMetadata:{purpose:'backup-fixture'}});
}finally{await mf.dispose();}

function python(...args){
 const result=spawnSync('python3',[resolve(root,'scripts/local-backup.py'),...args],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);
}
const backup=python('backup','--state',state,'--output',resolve(work,'backups'),'--quiesced');
const restored=resolve(work,'restored');
python('restore',backup.backup,'--destination',restored);
const report=python('verify',backup.backup,'--state',resolve(restored,'v3'));
assert.equal(report.ok,true);
function refuses(...args){
 const result=spawnSync('python3',[resolve(root,'scripts/local-backup.py'),...args],{encoding:'utf8'});
 assert.equal(result.status,1,'Unsafe operation should be refused');
}
refuses('backup','--state',state,'--output',resolve(work,'unconfirmed'));
refuses('restore',backup.backup,'--destination',restored);
refuses('restore',backup.backup,'--destination',resolve(root,'.wrangler/state/new-restore'));
const corrupt=resolve(work,'corrupt-backup');await cp(backup.backup,corrupt,{recursive:true});
const manifest=JSON.parse(await readFile(resolve(corrupt,'manifest.json'),'utf8'));
const blob=Object.keys(manifest.inventory.r2_files)[0];
await writeFile(resolve(corrupt,'state/v3',blob),'changed bytes');
refuses('restore',corrupt,'--destination',resolve(work,'must-not-restore'));
refuses('verify',corrupt,'--state',resolve(restored,'v3'));
mf=runtime(resolve(restored,'v3'));
try{
 const db=await mf.getD1Database('DB');
 assert.equal((await db.prepare('SELECT title FROM notices WHERE id=?').bind('backup-fixture').first()).title,'가상 공지');
 const bucket=await mf.getR2Bucket('FILES');
 const list=await bucket.list();assert.deepEqual(list.objects.map(o=>o.key).sort(),[...objects.keys()].sort());
 for(const [key,value] of objects)assert.deepEqual(Buffer.from(await (await bucket.get(key)).arrayBuffer()),value);
}finally{await mf.dispose();}
await writeFile(resolve(work,'verification.json'),JSON.stringify({ok:true,objects:objects.size,negativeChecks:5,report},null,2),{mode:0o600});
console.log(JSON.stringify({ok:true,work,objects:objects.size,negativeChecks:5,report},null,2));
