import {mkdirSync,appendFileSync,readFileSync,readdirSync,chmodSync} from 'node:fs';
import {resolve} from 'node:path';
export function redact(value,secrets=[]){
 let s=String(value).replace(/\x1b\[[0-9;]*m/g,'');
 for(const secret of [...secrets].filter(x=>x.length>=4).sort((a,b)=>b.length-a.length))s=s.split(secret).join('[REDACTED]');
 return s.replace(/((?:authorization|cookie|password|api[_-]?key|token|secret)\s*[:=]\s*)[^\s,;]+/gi,'$1[REDACTED]').replace(/(https?:\/\/[^\s?#]+)[?#][^\s]*/g,'$1?[REDACTED]').replace(/(\b(?:GET|POST|PUT|PATCH|DELETE|HEAD)\s+[^\s?]+)\?[^\s]*/g,'$1?[REDACTED]');
}
export function runtimeLogger(root){
 const dir=resolve(root,'../.work/local-runtime-logs');mkdirSync(dir,{recursive:true,mode:0o700});chmodSync(dir,0o700);
 const id=new Date().toISOString().replace(/[:.]/g,'-')+'-'+process.pid;
 const file=resolve(dir,id+'.jsonl');
 const secrets=[];
 for(const path of [root,resolve(root,'dev/scanner'),resolve(root,'dev/mailer')]){
  for(const name of readdirSync(path).filter(n=>n.startsWith('.dev.vars')||n.startsWith('.env'))){
   try{for(const line of readFileSync(resolve(path,name),'utf8').split(/\r?\n/)){const m=line.match(/^[A-Z_]+\s*=\s*(.+)$/);if(m)secrets.push(m[1].trim().replace(/^(['"])(.*)\1$/,'$2'));}}catch{}
  }
 }
 function clean(value){if(typeof value==='string')return redact(value,secrets);if(Array.isArray(value))return value.map(clean);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,clean(item)]));return value;}
 function log(event,data={}){const record=clean({time:new Date().toISOString(),event,...data});appendFileSync(file,JSON.stringify(record)+'\n',{mode:0o600});}
 appendFileSync(resolve(dir,'sessions.jsonl'),JSON.stringify({time:new Date().toISOString(),pid:process.pid,ppid:process.ppid,file})+'\n',{mode:0o600});
 return {log,file};
}
