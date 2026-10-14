// Explicit synthetic localhost environment. No OS trust, real staff, or remote resources.
import {mkdir,readFile,writeFile,chmod,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {resolve} from 'node:path';
if(!process.argv.includes('--virtual-demo'))throw Error('Requires --virtual-demo; see docs/local-https-demo.md.');
process.umask(0o077);
const root=resolve(import.meta.dirname,'..'),work=resolve(root,'.local-https');
await mkdir(work,{recursive:true,mode:0o700});await chmod(work,0o700);
const exists=async path=>{try{await access(path);return true;}catch{return false;}};
const key=resolve(work,'localhost.key'),cert=resolve(work,'localhost.crt');
if(await exists(key)!==await exists(cert))throw Error('Incomplete certificate pair; existing files were preserved.');
if(!await exists(key)){
 const config=resolve(work,'openssl.cnf');
 await writeFile(config,'[req]\nprompt=no\ndistinguished_name=subject\nx509_extensions=local_cert\n[subject]\nCN=localhost\n[local_cert]\nsubjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1\nbasicConstraints=critical,CA:FALSE\n',{flag:'wx',mode:0o600});
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','30','-keyout',key,'-out',cert,'-config',config],{stdio:'ignore'});
}
execFileSync('openssl',['x509','-in',cert,'-noout','-checkend','86400'],{stdio:'ignore'});
await chmod(key,0o600);await chmod(cert,0o600);
const vars=resolve(root,'.dev.vars.c-local');
if(!await exists(vars))await writeFile(vars,'STAFF_AUTH_MODE=password\nAPP_ORIGIN=https://localhost:8788\nSTAFF_AUTH_RATE_SECRET='+randomBytes(32).toString('hex')+'\n',{flag:'wx',mode:0o600});
const settings=Object.fromEntries((await readFile(vars,'utf8')).split(/\r?\n/).filter(line=>/^[A-Z_]+=/.test(line)).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
if(settings.STAFF_AUTH_MODE!=='password'||settings.APP_ORIGIN!=='https://localhost:8788'||settings.STAFF_DEV_SHORT_PASSWORD==='true'||(settings.STAFF_AUTH_RATE_SECRET?.length||0)<32||settings.INQUIRY_INTAKE_ENABLED)throw Error('Existing config is not the closed localhost password environment. No settings were overwritten.');
await chmod(vars,0o600);
const credentials=resolve(work,'demo-credentials.json');
if(!await exists(credentials))await writeFile(credentials,JSON.stringify({developmentOnly:true,origin:'https://localhost:8788',admin:{name:'[가상] 로컬 시연 관리자',email:'demo-admin@gnc.example.test',password:randomBytes(24).toString('base64url')},content:{name:'[가상] 콘텐츠 직원',email:'demo-content@gnc.example.test',password:randomBytes(24).toString('base64url')}},null,2),{flag:'wx',mode:0o600});
console.log('Local HTTPS certificate, closed password config and private synthetic credentials prepared. Values are not displayed.');
