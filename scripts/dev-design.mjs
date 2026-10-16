// Localhost-only design preview. Does not import the Worker or expose APIs.
import {createServer} from 'node:http';
import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile),root=resolve(import.meta.dirname,'..'),assets=resolve(root,'public');
const mime={'.css':'text/css','.js':'text/javascript','.png':'image/png','.ttf':'font/ttf','.svg':'image/svg+xml','.json':'application/json'};
async function revision(dir){let value=0;for(const item of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,item.name);value=Math.max(value,item.isDirectory()?await revision(path):(await stat(path)).mtimeMs)}return value}
export async function designResponse(method,path){
 if(method!=='GET'&&method!=='HEAD')return [405,'text/plain','조회 전용입니다.'];
 if(path==='/__design_revision')return [200,'text/plain',String(Math.max(await revision(resolve(root,'src')),await revision(assets)))];
 
 if(path.startsWith('/api/')||path.startsWith('/admin'))return [503,'text/plain; charset=utf-8','디자인 미리보기에서는 업무 기능을 사용할 수 없습니다.'];
 const pathname=new URL(path,'http://localhost').pathname;
 const file=resolve(assets,'.'+pathname);if(file!==assets&&!file.startsWith(assets+sep))return [404,'text/plain','Not found'];
 try{return [200,mime[extname(file)]||'application/octet-stream',await readFile(file)]}catch{
  if(extname(pathname))return [404,'text/plain; charset=utf-8','파일을 찾을 수 없습니다.'];
  const {stdout,stderr}=await run(process.execPath,[resolve(root,'scripts/render-design-preview.mjs'),path],{maxBuffer:8*1024*1024});
  return [Number(stderr)||200,'text/html; charset=utf-8',stdout];
 }
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const server=createServer(async(req,res)=>{try{const [status,type,body]=await designResponse(req.method,decodeURIComponent(new URL(req.url,'http://localhost').pathname)+new URL(req.url,'http://localhost').search);res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'});res.end(req.method==='HEAD'?undefined:body)}catch(error){console.error(error.message);res.writeHead(500);res.end('Preview render failed')}});
 server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'8787 포트가 사용 중입니다. 기존 디자인 서버 또는 전체 앱 서버를 종료한 뒤 다시 실행하세요.':error.message);process.exitCode=1;});
 server.listen(8787,'127.0.0.1',()=>{if(process.argv.includes('--open')&&process.platform==='darwin'){execFile('open',['http://127.0.0.1:8787/']);execFile('open',['http://127.0.0.1:8787/style-guide']);}console.log('Main: http://127.0.0.1:8787/\nStyle guide: http://127.0.0.1:8787/style-guide\nRead-only design fixtures. Ctrl+C to stop.');});
}
