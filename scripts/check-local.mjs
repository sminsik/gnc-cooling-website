// Read-only local checks: no database migrations, credentials or remote operations.
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const commands=[['node_modules/typescript/bin/tsc','--noEmit'],['node_modules/typescript/bin/tsc','-p','tsconfig.ui.json'],['--test','tests/*.test.mjs']];
console.log(`Local checks · Node ${process.versions.node} · ${root}`);
for(const args of commands){const r=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
console.log('타입 검사와 자동 테스트 완료. 실제 DB·인증·메일 검수를 대신하지 않습니다.');
