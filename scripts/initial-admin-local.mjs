// Trusted local operator command. Input on stdin, no network or HTTP bootstrap route.
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir,open} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {initialAdminPlan,applyInitialAdmin,reissueInitialAdmin} from '../src/staff-bootstrap.ts';
import {authConfigured} from '../src/staff-auth.ts';
import {passwordConfigured,staffIssuer} from '../src/password-auth.ts';
const base=new URL('../',import.meta.url),mode=process.argv[2];
if(!['--create','--reissue'].includes(mode)){console.error('사용법: node scripts/initial-admin-local.mjs --create 또는 --reissue. 확인한 개인 계정 JSON은 표준 입력으로 전달합니다. 로컬 DB만 변경합니다.');process.exit(1);}
let db,privateFile;
try{
 const localPassword=process.argv.includes('--password-local');
 const config=Object.fromEntries((await readFile(new URL(localPassword?'.dev.vars.c-local':'.dev.vars',base),'utf8')).split(/\r?\n/).filter(line=>/^[A-Z_]+=/.test(line)).map(line=>{const split=line.indexOf('=');return [line.slice(0,split),line.slice(split+1).trim().replace(/^(['"])(.*)\1$/,'$2')]}));
 if(!(localPassword?passwordConfigured(config):authConfigured(config)))throw Error('실제 인증 설정이 완료되지 않았습니다. 비공개 설정을 먼저 확인해주세요.');
 let raw='';for await(const chunk of process.stdin){raw+=chunk;if(raw.length>4096)throw Error('입력 정보가 너무 깁니다.');}const input=JSON.parse(raw);
 if(input.accountConfirmed!==true)throw Error('확인한 개인 책임 관리자 계정만 등록합니다.');
 if(!config.APP_ORIGIN.startsWith('https://'))throw Error('직원 인증 시험용 HTTPS 주소를 먼저 설정해주세요.');
 const outputIndex=process.argv.indexOf('--private-output');
 if(outputIndex>=0){if(!process.argv[outputIndex+1])throw Error();privateFile=await open(process.argv[outputIndex+1],'wx',0o600);}
 const persistIndex=process.argv.indexOf('--persist-to');
 const root=fileURLToPath(base),persist=persistIndex>=0?resolve(process.argv[persistIndex+1]||''):resolve(root,'.wrangler/state');
 if(persistIndex>=0&&!process.argv[persistIndex+1])throw Error();
 if(process.argv.includes('--virtual-local')){
  if(persist!==resolve(root,'.local-https/state')||config.APP_ORIGIN!=='https://localhost:8788'||!localPassword||!input.name?.startsWith('[가상]')||!input.email?.endsWith('@gnc.example.test')||!privateFile)throw Error('가상 초대는 격리된 localhost 시험 저장소와 비공개 출력에서만 가능합니다.');
 }
 const dir=resolve(persist,'v3/d1/miniflare-D1DatabaseObject'),candidates=[];
 for(const name of await readdir(dir)){if(!/^[a-f0-9]+\.sqlite$/.test(name))continue;const probe=new DatabaseSync(resolve(dir,name),{readOnly:true});try{if(probe.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name IN('staff','staff_bootstrap','staff_auth_events')").get().n===3)candidates.push(name)}finally{probe.close()}}
 if(candidates.length!==1)throw Error('대상 로컬 DB를 하나로 확인하지 못했습니다. 먼저 로컬 migration을 적용해주세요.');
 db=new DatabaseSync(resolve(dir,candidates[0]));db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000');
 const DB={prepare(sql){let values=[];return {bind(...args){values=args;return this},async first(){return db.prepare(sql).get(...values)||null},async run(){return {meta:{changes:Number(db.prepare(sql).run(...values).changes)}}}}},async batch(statements){db.exec('BEGIN IMMEDIATE');try{const result=[];for(const statement of statements)result.push(await statement.run());db.exec('COMMIT');return result}catch(error){db.exec('ROLLBACK');throw error}}};
 const env={...config,DB};const result=mode==='--create'?await applyInitialAdmin(env,await initialAdminPlan({...input,issuer:staffIssuer(env),origin:config.APP_ORIGIN})):await reissueInitialAdmin(env,input);
 if(privateFile){await privateFile.writeFile(JSON.stringify(result));console.log('초기 초대 링크를 비공개 파일에 저장했습니다.');}
 else{console.log('초기 책임 관리자 초대를 로컬에 준비했습니다. 초대 수락 전에는 활성 계정이 아닙니다.');console.log('초대 링크(48시간 유효·다시 조회할 수 없음): '+result.invitationUrl);}
}catch(error){console.error(error?.name==='StaffError'?error.message:'초기 등록하지 못했습니다. 인증 설정·입력 정보·로컬 DB 상태를 확인해주세요.');process.exitCode=1;}finally{db?.close();await privateFile?.close();}
