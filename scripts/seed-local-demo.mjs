// Explicit local development fixture, never a deployment migration. Preserves non-demo rows.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,readdirSync,mkdirSync,existsSync,chmodSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
if(process.argv[2]!=='--local-demo')throw Error('Run only with --local-demo for the project-local preview database.');
const root=resolve(import.meta.dirname,'..');process.chdir(root);
const config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
if(config.d1_databases?.[0]?.database_id!=='00000000-0000-0000-0000-000000000001')throw Error('Not the approved local database configuration.');
const scanRoot=resolve(root,'../.work/dummy-seed');
const imageScan=JSON.parse(readFileSync(scanRoot+'/image-scan.json','utf8')),pdfScan=JSON.parse(readFileSync(scanRoot+'/pdf-scan.json','utf8'));
if(!imageScan.engine?.startsWith('ClamAV ')||!pdfScan.engine?.startsWith('ClamAV '))throw Error('Real local scan evidence is required.');
const images=readFileSync(scanRoot+'/safe-logo.png'),pdf=readFileSync(scanRoot+'/safe-sample.pdf');
if(images.length<12||pdf.length<12)throw Error('Missing inspected sample files.');
const folder='.wrangler/state/v3/d1/miniflare-D1DatabaseObject';const databases=readdirSync(folder).filter(n=>n.endsWith('.sqlite')&&n!=='metadata.sqlite');if(databases.length!==1)throw Error('Expected one project-local database.');
const database=resolve(folder,databases[0]);
const db=new DatabaseSync(database);db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000');
const owner=db.prepare("SELECT s.id FROM staff s JOIN staff_roles r ON r.staff_id=s.id WHERE s.status='active' AND r.role='admin' LIMIT 1").get()?.id;
if(!owner)throw Error('An existing responsible admin is needed; this script creates no staff accounts.');
const categories=['cooling-towers','chillers','heat-exchangers'];for(const id of categories)if(!db.prepare('SELECT id FROM product_categories WHERE id=? AND active=1').get(id))throw Error('Missing active category.');
const productNames=['개방형 냉각탑','밀폐형 냉각탑','소형 냉각탑','냉각탑 충진재 교체 구성','공랭식 칠러','수랭식 칠러','공정 냉각 칠러','판형 열교환기','쉘앤튜브 열교환기','냉각수 순환 열교환 구성'];
const projectNames=['냉각탑 신규 설치','노후 냉각탑 교체','냉각탑 충진재 보수','냉각탑 팬 점검','공장 냉각수 배관 구성','순환 펌프 연결 배관','칠러 연계 냉각 구성','열교환기 연결 작업','냉각수 순환 점검','냉각시스템 적용 검토'];
const resourceNames=['냉각탑 제품 구성 안내','칠러 제품 구성 안내','열교환기 제품 구성 안내','냉각탑 설치 준비 항목','냉각탑 보수 점검 항목','공장 배관 상담 준비','냉각시스템 검토 항목','A/S 문의 준비 항목','설비 사양 정리 양식','정기 점검 기록 양식'];
const noticeNames=['미리보기 데이터 안내','제품 목록 탐색 안내','냉각탑 문의 준비 안내','칠러 사양 확인 안내','열교환기 자료 확인 안내','설치 현장 정보 정리 안내','보수 요청 정보 정리 안내','자료 다운로드 시험 안내','A/S 안내 화면 시험','홈페이지 화면 검토 안내'];
const warning='개발용 더미 데이터입니다. 실제 회사 제품·사양·현장 실적·공지·고객 문의가 아닙니다. 운영 공개 전 승인된 자료로 교체해야 합니다.';
const prefix='demo-20261013-',now=Date.now(),iso=new Date(now).toISOString();
const files=[];
for(let i=1;i<=10;i++)for(const type of ['products','projects','resources']){const kind=type==='resources'?'pdf':'image';files.push({id:prefix+'file-'+type+'-'+i,target:prefix+type+'-'+i,type,key:'development-demo/'+type+'/'+i+(kind==='pdf'?'.pdf':'.png'),mime:kind==='pdf'?'application/pdf':'image/png',bytes:kind==='pdf'?pdf.length:images.length,path:scanRoot+(kind==='pdf'?'/safe-sample.pdf':'/safe-logo.png'),engine:kind==='pdf'?pdfScan.engine:imageScan.engine});}
for(const f of files){
 if(db.prepare('SELECT id FROM files WHERE id=?').get(f.id))continue;
 execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','r2','object','put','gnc-cooling-local-files/'+f.key,'--local','--file',f.path,'--content-type',f.mime],{cwd:root,stdio:'pipe'});
}
const backup=resolve(root,'../.work/backups/catalog-20261013-before-demo/catalog.sqlite');mkdirSync(resolve(backup,'..'),{recursive:true});
if(!existsSync(backup))execFileSync('/Users/sminsiik/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3',['-c','import sqlite3,sys; a=sqlite3.connect(sys.argv[1]); b=sqlite3.connect(sys.argv[2]); a.backup(b); b.close(); a.close()',database,backup]);chmodSync(backup,0o600);
const insert=(table,data)=>{const keys=Object.keys(data);return db.prepare(`INSERT OR IGNORE INTO ${table}(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...Object.values(data));};
db.exec('BEGIN IMMEDIATE');
try{
 for(const f of files)insert('files',{id:f.id,object_key:f.key,original_name:'개발용 예시 · '+(f.type==='resources'?'공통 시험자료.pdf':'대표 이미지(제품·현장 사진 아님).png'),mime:f.mime,size_bytes:f.bytes,purpose:f.type==='resources'?'private':'public_image',status:'ready',validated_at:iso,owner_id:owner,target_type:f.type,target_id:f.target,alt:'개발용 예시 · 회사 로고 표본, 실제 제품·현장 사진 아님',scan_engine:f.engine,attached:1});
 for(let i=1;i<=10;i++){
  const pid=prefix+'products-'+i,prid=prefix+'projects-'+i,rid=prefix+'resources-'+i,model=prefix+'model-'+i;
  const cat=i<=4?categories[0]:i<=7?categories[1]:categories[2];
  insert('products',{id:pid,category_id:cat,name:'[개발 예시] '+productNames[i-1],intro:'목록·상세·문의 연결을 시험하는 가상 제품입니다.',description:warning+'\n사진 자리에는 회사 로고를 사용했습니다. 실제 제품 사진이 아닙니다.\n적용 용도·설치 조건·점검 정보를 비교하는 구성 예시입니다.',primary_file_id:prefix+'file-products-'+i,featured:i<=3?1:0,featured_order:i,sort_order:i,publication_status:'published',first_published_at:iso});
  insert('file_links',{file_id:prefix+'file-products-'+i,product_id:pid,purpose:'primary_image',alt:'개발용 예시 · 회사 로고, 제품 사진 아님',caption:'제품 사진 미제공 · 레이아웃 시험용',sort_order:0});
  insert('product_models',{id:model,product_id:pid,name:'[예시 모델] DEMO-'+String(i).padStart(2,'0'),description:warning,publication_status:'published',first_published_at:iso});
  for(const [j,name,value,unit] of [[1,'표시 용량(가상)',String(50+i*10),'kW'],[2,'설치 폭(가상)',String(800+i*100),'mm'],[3,'표시 전원(가상)','380','V'],[4,'자료 상태','개발 시험 수치 · 실제 사양 아님','']])insert('model_specifications',{id:model+'-spec-'+j,model_id:model,name,value_text:value,unit,sort_order:j});
  insert('projects',{id:prid,title:'[개발 예시] '+projectNames[i-1],work_type:i<5?'냉각탑 제작·보수':i<7?'공장 배관':'냉각시스템 적용',description:warning+'\n가상 작업 범위: 현장 조건 확인 → 설비 연결 검토 → 시험 점검.\n현장명·고객명·수량·실제 성과는 포함하지 않습니다.',approval_by:'개발용 더미 등록 · 실제 실적 승인 아님',approval_at:iso,primary_file_id:prefix+'file-projects-'+i,publication_status:'published',first_published_at:iso});
  insert('resources',{id:rid,title:'[개발 예시] '+resourceNames[i-1],category:i<=3?'제품 자료':i<=7?'기술자료':'업무 양식',description:warning+'\n공통 개발 시험 PDF를 내려받을 수 있습니다. 실제 카탈로그·매뉴얼은 아닙니다.',file_id:prefix+'file-resources-'+i,publication_status:'published',first_published_at:iso});
  insert('notices',{id:prefix+'notice-'+i,title:'[개발 예시] '+noticeNames[i-1],body:warning+'\n제품·사업분야·문의 안내를 이동하고 목록과 상세 화면을 확인하는 예시 공지입니다. 실제 회사 운영 공지나 접수 개시 안내가 아닙니다.',pinned:i===1?1:0,publication_status:'published',posted_at:iso});
  const inquiry=prefix+'inquiry-'+i,created=now-(11-i)*86400000;
  insert('inquiries',{id:inquiry,receipt:'DEMO-'+String(i).padStart(3,'0'),owner_hash:'demo-owner-'+i,request_id:'demo-request-'+i,input_hash:'demo-input-'+i,kind:i%3===0?'as':'consultation',work:i<5?'installation':i<8?'repair':'unknown',title:'[개발 예시] '+projectNames[i-1]+' 문의',company:'가상 시험 현장 '+i,name:'개발 예시 담당자 '+i,phone:'000-0000-0000',email:'sample'+i+'@example.invalid',region:'가상 지역 · 개발용',body:warning+'\n견적·상담 목록과 진행 상태를 시험하는 가상 문의입니다. 실제 접수·본인 확인·메일 발송은 수행하지 않았습니다.',equipment:'DEMO-'+i,dimensions:'개발용 예시 조건',connection_json:'{}',consent_json:'{"developmentOnly":true,"realConsent":false}',status:['received','in_progress','completed','cancelled'][(i-1)%4],classification:i===9?'suspected':i===10?'spam':'normal',signals_json:'{"developmentOnly":true,"verificationSimulated":true}',verified_at:i<=8?created:null,created_at:created,updated_at:created,first_normal_received_at:i<=8?created:null,first_normal_marker:i<=8?'demo:'+inquiry:null});
  insert('inquiry_messages',{id:prefix+'message-'+i,inquiry_id:inquiry,kind:'customer',body:warning+'\n가상 문의 본문입니다.',status:'sent',created_at:created,updated_at:created});
  insert('inquiry_quotes',{id:prefix+'quote-'+i,inquiry_id:inquiry,title:'[개발 예시] 견적 초안 '+i,body:warning+'\n금액과 실제 공급 조건은 입력하지 않았습니다. 초안 목록 표시용입니다.',number:1,status:'draft',created_by:owner,created_at:created,updated_at:created});
 }
 db.exec('COMMIT');
}catch(error){db.exec('ROLLBACK');throw error;}
const counts={};for(const table of ['products','product_models','projects','resources','notices','inquiries','inquiry_quotes','files'])counts[table]=db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE id LIKE ?`).get(prefix+'%').n;
db.close();writeFileSync(resolve(root,'../outputs/개발자료/더미데이터/seed-result.json'),JSON.stringify({developmentOnly:true,prefix,counts,customerMailCreated:0,staffAccountsCreated:0},null,2));console.log(JSON.stringify(counts));
