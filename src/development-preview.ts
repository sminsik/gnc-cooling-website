import {createRemoteJWKSet,jwtVerify} from 'jose';
import type {JWTVerifyGetKey} from 'jose';
import {isWithinPath} from './access-policy.ts';
export interface PreviewEnv {DEPLOYMENT_ENVIRONMENT?:string;ACCESS_TEAM_DOMAIN?:string;ACCESS_AUD?:string}
const keys=new Map<string,ReturnType<typeof createRemoteJWKSet>>();
export const isDevelopmentPreview=(env:PreviewEnv)=>env.DEPLOYMENT_ENVIRONMENT==='development';
const denied=(status:number)=>Response.json({code:status===503?'SERVICE_UNAVAILABLE':'ACCESS_DENIED',error:'현재 이용할 수 없습니다.'},{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}});
// The resolver parameter is only a unit-test seam; production uses the configured Access JWKS.
export async function previewGate(request:Request,env:PreviewEnv,resolver?:JWTVerifyGetKey):Promise<Response|null>{
 // 로컬 개발: Access 인증을 적용하지 않는다. 로컬 wrangler 설정에는
 // DEPLOYMENT_ENVIRONMENT=development를 지정하지 않으며 직원 DB 인증은 유지한다.
 // Cloudflare 비공개 개발 배포 전: development 설정과 Access 도메인/AUD,
 // 미인증 차단을 반드시 검수한다. 공유 인증 호출 전체를 주석 처리하지 않는다.
 if(!isDevelopmentPreview(env))return null;
 const domain=env.ACCESS_TEAM_DOMAIN||'',aud=env.ACCESS_AUD||'';
 if(!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain)||!aud||aud.startsWith('REPLACE_'))return denied(503);
 const token=request.headers.get('Cf-Access-Jwt-Assertion');if(!token||token.length>16384)return denied(403);
 try{
  const issuer='https://'+domain;
  let jwks:JWTVerifyGetKey|undefined=resolver||keys.get(domain);
  if(!jwks){const remote=createRemoteJWKSet(new URL(issuer+'/cdn-cgi/access/certs'),{timeoutDuration:3000});keys.set(domain,remote);jwks=remote;}
  const {payload}=await jwtVerify(token,jwks,{issuer,audience:aud,algorithms:['RS256'],requiredClaims:['iss','aud','exp','iat','sub','email']});
  if(typeof payload.email!=='string'||!payload.email) return denied(403);
 }catch{return denied(403);}
 let path:string;try{path=decodeURIComponent(new URL(request.url).pathname);}catch{return denied(404);}
 if(['/admin','/api/admin','/api/staff','/api/staff-auth','/my-inquiries','/api/my-inquiries','/api/inquiries','/api/files','/api/uploads'].some(base=>isWithinPath(path,base)))return denied(503);
 if(!['GET','HEAD'].includes(request.method))return denied(405);
 return null;
}
export function identifyPreview(response:Response,env:PreviewEnv){
 if(!isDevelopmentPreview(env))return response;
 const headers=new Headers(response.headers);headers.set('X-GNC-Environment','development');headers.set('X-Robots-Tag','noindex, nofollow');headers.set('Cache-Control','no-store');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
