// A declared service binding is not a verdict. Validate every returned attestation.
export function scannerVerdict(response:Response,mime:string,originalSize:number){
 const length=response.headers.get('Content-Length')||'',engine=(response.headers.get('X-Scan-Engine')||'').trim();
 const size=Number(length);
 if(!response.ok||!response.body||response.headers.get('Content-Type')!==mime||!/^\d+$/.test(length)||!Number.isSafeInteger(size)||size<12||size>originalSize||!engine||engine.length>100||/[\x00-\x1f\x7f]/.test(engine)||response.headers.get('X-Structure-Result')!=='pass'||response.headers.get('X-Malware-Result')!=='clean'||response.headers.get('X-Scan-Contract')!=='gnc-content-v1')throw Error('incomplete-verdict');
 if(mime==='application/pdf'){if(response.headers.get('X-Pdf-Safe')!=='true')throw Error('unsafe-pdf');}
 else{
  const width=response.headers.get('X-Image-Width')||'',height=response.headers.get('X-Image-Height')||'';
  if(!['image/png','image/jpeg','image/webp'].includes(mime)||response.headers.get('X-Image-Sanitized')!=='true'||!/^\d+$/.test(width)||!/^\d+$/.test(height)||!Number.isSafeInteger(Number(width))||!Number.isSafeInteger(Number(height))||Number(width)<1||Number(height)<1||Number(width)*Number(height)>40000000)throw Error('unsafe-image');
 }
 return {size,engine};
}
