import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const mac=process.platform==='darwin';
const work=resolve(process.env.HTTPS_WORK_DIR || resolve(root,mac?'../.work/c-local':'.local-https'));
const key=resolve(work,'localhost.key'),cert=resolve(work,'localhost.crt');
if(!existsSync(key)||!existsSync(cert)){console.error('Local HTTPS certificate is missing. See docs/local-https-demo.md.');process.exit(1);}
const args=['node_modules/wrangler/bin/wrangler.js','dev','-c','wrangler.jsonc','-c','dev/scanner/wrangler.jsonc','-c','dev/mailer/wrangler.jsonc','--env','c-local','--local','--ip','127.0.0.1','--port','8788','--inspector-port','9231','--local-protocol','https','--https-key-path',key,'--https-cert-path',cert,'--test-scheduled'];
if(!mac||process.env.HTTPS_PERSIST_TO){
 const state=resolve(process.env.HTTPS_PERSIST_TO || resolve(work,'state'));
 if(!existsSync(resolve(state,'v3/d1'))){console.error('Isolated local D1 is missing. Restore a local backup into the new HTTPS persist root first.');process.exit(1);}
 args.push('--persist-to',state);
}
const child=spawn(process.execPath,args,{cwd:root,stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('error',()=>{console.error('Local HTTPS server could not start.');process.exitCode=1;});
child.on('exit',(code,signal)=>{process.exitCode=code ?? (signal==='SIGINT'?130:1);});
