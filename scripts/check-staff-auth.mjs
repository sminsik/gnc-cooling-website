// Read local configuration without displaying secret values or modifying accounts.
import {readFile} from 'node:fs/promises';
import {authConfigured} from '../src/staff-auth.ts';
const keys=['APP_ORIGIN','OIDC_ISSUER','OIDC_CLIENT_ID','OIDC_CLIENT_SECRET','STAFF_AUTH_RATE_SECRET'];
try{
 let raw='';try{raw=await readFile(new URL('../.dev.vars',import.meta.url),'utf8')}catch{}
 const env=Object.fromEntries(raw.split(/\r?\n/).filter(line=>/^[A-Z_]+=/.test(line)).map(line=>{const at=line.indexOf('=');return [line.slice(0,at),line.slice(at+1).trim().replace(/^(['"])(.*)\1$/,'$2')]}));
 const missing=keys.filter(key=>!env[key]);if(missing.length){console.log('인증 연결 대기: '+missing.join(', '));process.exitCode=1;}
 else if(!authConfigured(env)){console.log('HTTPS 주소·issuer·32자 이상 요청 제한 비밀값을 확인해주세요.');process.exitCode=1;}
 else{
  const response=await fetch(env.OIDC_ISSUER.replace(/\/$/,'')+'/.well-known/openid-configuration',{signal:AbortSignal.timeout(10000),redirect:'error'});
  const discovery=response.ok?await response.json():null;if(!discovery||discovery.issuer!==env.OIDC_ISSUER)throw Error('discovery');
  for(const key of ['authorization_endpoint','token_endpoint','jwks_uri']){const url=new URL(discovery[key]);if(url.protocol!=='https:'||url.username||url.password||url.hash)throw Error('endpoint');}
  const methods=discovery.token_endpoint_auth_methods_supported||['client_secret_basic'];if(!methods.includes('client_secret_post')&&!methods.includes('client_secret_basic'))throw Error('auth-method');
  console.log('인증 설정·Discovery 조회 확인. 실제 로그인·email_verified 제공 여부·초기 계정 검수는 별도로 필요합니다.');
 }
}catch{console.log('인증 서비스 연결 설정을 확인하지 못했습니다. 계정이나 DB를 변경하지 않았습니다.');process.exitCode=1;}
