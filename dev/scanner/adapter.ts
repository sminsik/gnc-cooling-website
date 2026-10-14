// Local development only; the application keeps its trusted service binding contract.
export default {
 async fetch(request:Request,env:{SCANNER_TOKEN?:string}):Promise<Response>{
  if(new URL(request.url).pathname!=='/v1/content'||request.method!=='POST')return new Response(null,{status:404});
  if(!env.SCANNER_TOKEN||request.headers.get('X-Scan-Contract')!=='gnc-content-v1')return new Response(null,{status:503});
  try{
   if(!request.body)return new Response(null,{status:422});
   const reader=request.body.getReader(),chunks:Uint8Array[]=[];let length=0;
   while(true){const chunk=await reader.read();if(chunk.done)break;length+=chunk.value.length;if(length>20*1024*1024){await reader.cancel();return new Response(null,{status:422});}chunks.push(chunk.value);}
   const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
   const response=await fetch('http://127.0.0.1:8790/v1/content',{method:'POST',headers:{'Content-Type':request.headers.get('Content-Type')||'','Content-Length':String(length), 'X-Scan-Contract':'gnc-content-v1','Authorization':'Bearer '+env.SCANNER_TOKEN},body:bytes,signal:AbortSignal.timeout(55000),redirect:'manual'});
   return response.status>=300&&response.status<400?new Response(null,{status:503}):response;
  }catch{return new Response(null,{status:503});}
 }
};
