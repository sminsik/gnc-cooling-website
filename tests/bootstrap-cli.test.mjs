import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,mkdir,cp,symlink,readFile,readdir,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
test('offline CLI seeds only isolated local DB atomically, refuses repeat and reissues pending invite',async()=>{
 const work=new URL('../../.work/',import.meta.url);await mkdir(work,{recursive:true});const dir=await mkdtemp(fileURLToPath(new URL('auth-cli-',work)));
 let sql;
 try{
  await cp(fileURLToPath(new URL('../src/',import.meta.url)),dir+'/src',{recursive:true});await cp(fileURLToPath(new URL('../scripts/',import.meta.url)),dir+'/scripts',{recursive:true});await symlink(fileURLToPath(new URL('../node_modules',import.meta.url)),dir+'/node_modules','dir');
  const dbDir=dir+'/.wrangler/state/v3/d1/miniflare-D1DatabaseObject';await mkdir(dbDir,{recursive:true});sql=new DatabaseSync(dbDir+'/abcdef.sqlite');sql.exec('PRAGMA foreign_keys=ON');
  for(const name of (await readdir(new URL('../migrations/',import.meta.url))).sort())sql.exec(await readFile(new URL('../migrations/'+name,import.meta.url),'utf8'));
  const {writeFile}=await import('node:fs/promises');await writeFile(dir+'/.dev.vars','APP_ORIGIN=https://app.test\nOIDC_ISSUER=https://idp.test\nOIDC_CLIENT_ID=fixture\nOIDC_CLIENT_SECRET=fixture-only\nSTAFF_AUTH_RATE_SECRET=fixture-only-at-least-thirty-two-characters\n');
  const input=JSON.stringify({name:'CLI fixture',email:'cli@example.test',accountConfirmed:true});const run=mode=>spawnSync(process.execPath,[dir+'/scripts/initial-admin-local.mjs',mode],{input,encoding:'utf8'});
  const first=run('--create');assert.equal(first.status,0,first.stderr);assert.equal(sql.prepare('SELECT status FROM staff').get().status,'invited');assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM staff_sessions').get().n,0);
  assert.equal(run('--create').status,1);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM staff').get().n,1);assert.equal(run('--reissue').status,0);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM staff_invitations WHERE revoked_at IS NULL').get().n,1);
  sql.prepare("UPDATE staff SET status='active',provider_subject='confirmed'").run();assert.equal(run('--reissue').status,1);
 }finally{sql?.close();await rm(dir,{recursive:true,force:true});}
});
