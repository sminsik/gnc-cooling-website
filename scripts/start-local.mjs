import {runtimeLogger} from './local-runtime-log.mjs';
import {request as httpsRequest} from 'node:https';
import {readFileSync} from 'node:fs';
// Starts existing persisted local app and scanner; never resets DB or provisions remote resources.
import {spawn,execFile} from 'node:child_process';
import {createServer} from 'node:http';
import {connect} from 'node:net';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),children=[];
const {log,file:logFile}=runtimeLogger(root);
log('supervisor-start',{pid:process.pid,ppid:process.ppid,node:process.version,platform:process.platform});
console.log('실행 기록: '+logFile);
let stopping=false;
const listening=port=>new Promise(done=>{const socket=connect({host:'127.0.0.1',port});socket.once('connect',()=>{socket.destroy();done(true)});socket.once('error',()=>done(false));});
function start(script){
 const p=spawn(process.execPath,[script],{cwd:root,stdio:['inherit','pipe','pipe']});children.push(p);log('child-start',{script,pid:p.pid});
 for(const [name,stream,target] of [['stdout',p.stdout,process.stdout],['stderr',p.stderr,process.stderr]]){
  let pending='';stream.setEncoding('utf8');stream.on('data',chunk=>{target.write(chunk);pending+=chunk;const lines=pending.split(/\r?\n/);pending=lines.pop();for(const line of lines)if(line.trim())log('child-output',{script,stream:name,line});if(pending.length>16000){log('child-output',{script,stream:name,line:pending.slice(0,16000)});pending='';}});
  stream.on('end',()=>{if(pending.trim())log('child-output',{script,stream:name,line:pending});});
 }
 p.on('error',error=>log('child-spawn-error',{script,message:error.message}));
 p.on('exit',(code,signal)=>{log('child-exit',{script,pid:p.pid,code,signal,expected:stopping});if(!stopping)console.error(`${script} 종료: code=${code}, signal=${signal}. 기록: ${logFile}`);});return p;
}
if(!await listening(8790))start('dev/scanner/run.mjs');else console.log('기존 로컬 검사 프로세스를 사용합니다.');
if(!await listening(8788))start('scripts/run-local-https.mjs');else console.log('기존 전체 앱 서버를 사용합니다.');
let redirect;
if(!await listening(8787)){
 redirect=createServer((req,res)=>{res.writeHead(307,{Location:'https://localhost:8788'+req.url,'Cache-Control':'no-store'});res.end();});
 redirect.on('error',error=>{log('redirect-error',{code:error.code,message:error.message});console.error('8787 연결 안내 서버 오류: '+error.code);});
 redirect.listen(8787,'127.0.0.1');
}else console.log('8787 포트가 이미 사용 중입니다. 전체 앱은 https://localhost:8788/ 로 접속하세요.');
console.log('전체 앱: https://localhost:8788/\n직원 로그인: https://localhost:8788/admin/login\n스타일 가이드: https://localhost:8788/style-guide\nDB/파일: 기존 로컬 D1/R2. 종료: Control+C');
if(process.platform==='darwin'&&process.argv.includes('--open'))execFile('open',['https://localhost:8788/']);
const ca=readFileSync(resolve(process.env.HTTPS_WORK_DIR||resolve(root,process.platform==='darwin'?'../.work/c-local':'.local-https'),'localhost.crt'));
function health(){return new Promise(done=>{const r=httpsRequest({hostname:'localhost',port:8788,path:'/api/health',ca,timeout:5000},response=>{response.resume();done({ok:response.statusCode===200,status:response.statusCode});});r.on('timeout',()=>r.destroy(new Error('health-timeout')));r.on('error',e=>done({ok:false,code:e.code||e.message}));r.end();});}
let checking=false,lastTick=Date.now();
const timer=setInterval(async()=>{if(checking)return;checking=true;const gapMs=Date.now()-lastTick;lastTick=Date.now();try{log('heartbeat',{pid:process.pid,ppid:process.ppid,memory:process.memoryUsage().rss,gapMs,app:await health(),scannerListening:await listening(8790)});}catch(error){log('monitor-error',{message:error.message});}finally{checking=false;}},15000);
for(const signal of ['SIGINT','SIGTERM','SIGHUP'])process.on(signal,()=>{if(stopping)return;stopping=true;log('supervisor-signal',{signal});clearInterval(timer);redirect?.close();for(const p of children)p.kill(signal);});
process.on('uncaughtExceptionMonitor',error=>log('uncaught-exception',{message:error.message,stack:error.stack}));
process.on('unhandledRejection',reason=>{log('unhandled-rejection',{message:String(reason)});process.exitCode=1;});
process.on('exit',code=>log('supervisor-exit',{code,stopping}));
