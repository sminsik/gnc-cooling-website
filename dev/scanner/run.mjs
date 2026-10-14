import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const project=fileURLToPath(new URL('../../',import.meta.url));
const work=process.env.SCANNER_WORK_DIR || (process.platform==='darwin'?resolve(project,'../.work/c-local'):resolve(project,'.local-scanner'));
const python=[resolve(work,'venv/bin/python'),resolve(work,'scanner-venv/bin/python')].find(existsSync);
if(!python){console.error('Scanner virtual environment is missing. See docs/local-scanner.md.');process.exit(1);}
const child=spawn(python,[fileURLToPath(new URL('server.py',import.meta.url))],{stdio:'inherit',env:{...process.env,SCANNER_WORK_DIR:work}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('error',()=>{console.error('Local scanner could not start.');process.exitCode=1;});
child.on('exit',(code,signal)=>{process.exitCode=code ?? (signal==='SIGINT'?130:1);});
