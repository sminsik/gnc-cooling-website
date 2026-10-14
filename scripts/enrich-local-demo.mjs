// Explicit fixture update for local preview. Never modifies non-demo content or staff.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
if(process.argv[2]!=='--local-demo')throw Error('Requires --local-demo');
const root=resolve(import.meta.dirname,'..');process.chdir(root);
if(JSON.parse(readFileSync('wrangler.jsonc')).d1_databases[0].database_id!=='00000000-0000-0000-0000-000000000001')throw Error('Local configuration required');
const dir='.wrangler/state/v3/d1/miniflare-D1DatabaseObject';const names=readdirSync(dir).filter(n=>n.endsWith('.sqlite')&&n!=='metadata.sqlite');if(names.length!==1)throw Error('One local DB required');
const path=resolve(dir,names[0]);const db=new DatabaseSync(path);db.exec('PRAGMA busy_timeout=10000; PRAGMA foreign_keys=ON');
const prefix='demo-20261013-';const scans=resolve(root,'../.work/reference-photos');
const photos=JSON.parse(readFileSync(scans+'/manifest.json','utf8'));
for(const p of photos){const scan=JSON.parse(readFileSync(scans+'/'+p.key+'-scan.json','utf8'));if(!scan.engine?.startsWith('ClamAV '))throw Error('Positive real scan required');p.engine=scan.engine;p.bytes=readFileSync('public/reference/'+p.key+'.jpg').length;p.object='development-demo/reference-v2/'+p.key+'.jpg';
 execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','r2','object','put','gnc-cooling-local-files/'+p.object,'--local','--file','public/reference/'+p.key+'.jpg','--content-type','image/jpeg'],{stdio:'pipe'});
}
const backup=resolve(root,'../.work/backups/content-enrichment-'+Date.now());mkdirSync(backup,{recursive:true});
execFileSync('/usr/bin/python3',['-c','import sqlite3,sys,os; s=sqlite3.connect(sys.argv[1]); t=sqlite3.connect(sys.argv[2]); s.backup(t); t.close(); s.close(); os.chmod(sys.argv[2],0o600)',path,backup+'/catalog.sqlite']);
const products=[
 ['tower','공정과 연결되는 개방형 냉각탑을 검토할 때 확인할 항목을 소개합니다.','냉각탑 설치 공간, 사용 목적과 확보된 냉각수 조건을 정리합니다.','현재 장비의 형식·명판, 설치 공간과 연결 배관 정보를 준비해주세요.'],
 ['tower','밀폐형 냉각탑 제품군을 탐색하기 위한 개발 예시입니다.','예시 사진은 일반 개방형 냉각탑이며 밀폐형 모델 외형을 나타내지 않습니다. 실제 형식과 구조는 모델 자료로 확인해야 합니다.','필요한 공정 조건과 기존 순환 계통, 설치 공간을 정리해주세요.'],
 ['tower','제한된 설치 공간에서 냉각탑을 검토할 때의 상담 항목입니다.','사진은 일반 냉각탑 참고 이미지이며 소형 모델의 크기나 실제 외형을 뜻하지 않습니다.','반입 경로, 설치 치수와 주변 공간을 확인 가능한 범위에서 알려주세요.'],
 ['tower','기존 냉각탑의 충진재 관련 상담을 위한 구성 예시입니다.','사진은 냉각탑 전체 참고 이미지입니다. 충진재 교체 가능 여부와 부품 호환성은 기존 모델 확인이 필요합니다.','장비 명판, 사용 이력과 확인한 증상을 정리해주세요.'],
 ['chiller','공랭식 칠러를 검토할 때 필요한 현장 정보를 안내합니다.','사용 공정, 설치 위치와 주변 환경을 바탕으로 제품 정보를 확인합니다.','요청하는 냉각 조건, 운전 시간과 현장 전원 정보를 준비해주세요.'],
 ['chiller','수랭식 칠러 제품군의 상담 준비를 위한 예시입니다.','사진은 공랭식 칠러 참고 사진으로 수랭식 모델의 구조를 의미하지 않습니다.','기존 냉각수 계통과 연결 장비, 확보된 운전 조건을 정리해주세요.'],
 ['chiller','공정 냉각용 칠러를 검토하기 위한 제품 구성 예시입니다.','연결할 공정과 필요한 온도 조건, 기존 장비 사용 여부를 함께 정리합니다.','공정 종류와 현재 냉각 상태, 목표 조건을 알려주세요.'],
 ['plate','판형 열교환기를 살펴보고 상담 항목을 정리합니다.','열을 주고받는 유체와 온도·유량 조건을 확인 가능한 범위에서 준비합니다.','연결 규격, 사용 유체와 설치 공간 정보를 알려주세요.'],
 ['piping','쉘앤튜브 열교환기 구성의 상담 준비 예시입니다.','사진은 열교환기와 연결 배관의 일반 사례입니다. 회사 공급 모델과 연결 방식은 별도 확인이 필요합니다.','현재 장비 정보, 유체와 확보된 온도·유량 조건을 정리해주세요.'],
 ['piping','냉각수 순환 장비와 열교환 연결 구성을 살펴보는 예시입니다.','열교환기 단품뿐 아니라 연결 장비와 기존 배관 구성을 함께 정리합니다.','연결 도면과 현재 불편한 점, 개선할 구간을 알려주세요.']
];
const jobs=[
 ['tower','냉각탑 신규 설치','설치 공간과 반입 조건','연결 설비와 필요한 공급 범위','장비·배관 연결 범위 확인'],
 ['tower','노후 냉각탑 교체','기존 명판·치수와 운전 상태','철거·반입 구간과 작업 가능 시간','기존 연결부 재사용 여부 확인'],
 ['tower','냉각탑 충진재 보수','기존 장비 형식과 증상','부품 확인과 교체 대상 구간','부품 호환성과 작업 범위 확인'],
 ['tower','냉각탑 팬 점검','소음·진동 발생 시점','모델과 최근 유지관리 기록','실제 점검 후 필요한 항목 정리'],
 ['piping','공장 냉각수 배관 구성','배관 시작점과 연결 대상','기존 재질·관경과 작업 구간','신규·변경 구간을 도면에서 구분'],
 ['piping','순환 펌프 연결 배관','펌프 명판과 연결 장비','현재 배관과 작업 접근 공간','연결부·밸브 포함 범위 확인'],
 ['chiller','칠러 연계 냉각 구성','공정 용도와 운전 조건','기존 장비와 목표 냉각 조건','장비와 배관의 검토 항목 정리'],
 ['piping','열교환기 연결 작업','양측 유체와 확보된 운전 조건','연결 규격·배관 경로','장비 설치와 연결 범위 확인'],
 ['piping','냉각수 순환 점검','현재 증상과 확인 시점','기존 순환 구성과 측정 기록','현장 기록을 바탕으로 상담'],
 ['chiller','냉각시스템 적용 검토','냉각 대상과 사용 목적','설치 공간·전원과 기존 설비','제품 선정에 필요한 자료 정리']
];
const warning='개발 예시입니다. 실제 취급 제품·공급 사양 또는 회사 시공 실적이 아닙니다.';
const resources=[
 ['냉각탑 제품 구성 안내','직교류·사각·원형 등 명함에 안내된 제작 업무를 살펴봅니다.','확인 항목: 사용 목적, 기존 장비 형식, 설치 공간, 연결 배관.'],
 ['칠러 제품 구성 안내','칠러 검토에 필요한 공정 조건과 현장 정보를 정리합니다.','확인 항목: 연결 공정, 목표 온도, 운전 시간, 전원과 설치 위치.'],
 ['열교환기 제품 구성 안내','열교환기 상담에서 필요한 자료를 준비합니다.','확인 항목: 양측 유체, 확보된 온도·유량, 연결 규격과 설치 공간.'],
 ['냉각탑 설치 준비 항목','신규 설치와 기존 설비 교체에 필요한 현장 정보를 구분합니다.','확인 항목: 반입 경로, 장비 치수, 기존 배관, 작업 가능 시간.'],
 ['냉각탑 보수 점검 항목','증상과 최근 작업 이력을 정리하는 상담용 체크 항목입니다.','확인 항목: 발생 시점, 소음·진동·누수 등 증상, 장비 명판.'],
 ['공장 배관 상담 준비','배관의 시작점과 연결 대상, 작업 구간을 정리합니다.','확인 항목: 도면 유무, 재질·관경, 가동 중인 구간과 작업 시간.'],
 ['냉각시스템 검토 항목','여러 장비의 연결 조건을 함께 정리합니다.','확인 항목: 냉각 대상, 기존 설비 구성, 확보된 운전 기록과 목표 조건.'],
 ['A/S 문의 준비 항목','전화 상담 전에 필요한 기록을 정리합니다.','확인 항목: 현장 지역, 장비 종류, 증상과 시점, 구매·시공 관련 기록.'],
 ['설비 사양 정리 양식','확인 가능한 사양을 항목별로 기록하는 화면 구성 예시입니다.','정리 항목: 제조사, 모델명, 전원, 용량, 설치 치수, 연결 규격. 미확인 항목은 비워두세요.'],
 ['정기 점검 기록 양식','장비별 유지관리 이력을 정리하는 화면 구성 예시입니다.','기록 항목: 확인 날짜, 장비명, 관찰한 증상과 조치 이력. 점검 주기는 실제 장비 기준으로 확인합니다.']
];
const notices=[
 ['미리보기 데이터 안내','현재 홈페이지의 [개발 예시] 제품·사례와 수치는 화면 검토용입니다.','인터넷 참고 사진은 실제 회사 제품·현장이 아닙니다. 승인된 자료로 교체할 예정이며 출처는 이미지 출처 페이지에서 확인할 수 있습니다.'],
 ['제품 목록 탐색 안내','제품소개에서 냉각탑·칠러·열교환기를 제품군으로 구분해 볼 수 있습니다.','제품명을 검색한 뒤 상세 화면에서 설명과 예시 모델 정보를 확인하세요. 표시된 예시 수치는 구매나 설비 선정에 사용하지 마세요.'],
 ['냉각탑 문의 준비 안내','현재 장비 명판, 설치 공간과 필요한 작업을 정리해주세요.','신규 제작인지 기존 장비 교체인지 알려주시면 상담 준비에 도움이 됩니다. 확인되지 않은 사양은 추정하지 않아도 됩니다.'],
 ['칠러 사양 확인 안내','냉각 대상 공정과 필요한 조건, 설치 위치를 정리해주세요.','목표 온도나 유량 자료가 있다면 함께 확인합니다. 현재 예시 모델은 실제 공급 모델이 아니며 상세 자료는 별도 확인이 필요합니다.'],
 ['열교환기 자료 확인 안내','양측 유체, 확보된 운전 조건과 연결 규격을 정리해주세요.','실제 모델 선정과 공급 범위는 상담으로 확인합니다. 사진에 보이는 외형만으로 제품을 선정하지 마세요.'],
 ['설치 현장 정보 정리 안내','설치 장소, 장비 반입 경로와 작업 가능한 시간을 확인해주세요.','도면이 있다면 신규·변경 구간을 구분해 정리합니다. 철거와 연결 작업의 포함 여부는 상담 시 별도로 확인해주세요.'],
 ['보수 요청 정보 정리 안내','증상이 발생한 시점과 현재 확인 가능한 장비 상태를 정리해주세요.','가동 중인 장비에 접근하거나 직접 분해하지 말고 현장 안전 절차를 따라주세요. 점검·방문과 부품 교체 여부는 회사 상담으로 확인합니다.'],
 ['자료 다운로드 시험 안내','기술자료·카탈로그에서 제목별 안내와 다운로드 흐름을 확인할 수 있습니다.','현재 내려받는 공통 PDF는 개발 시험용 문서입니다. 실제 제품 카탈로그·매뉴얼이나 작업 지침으로 사용하지 마세요.'],
 ['A/S 안내 화면 시험','A/S 안내에는 전화 상담과 사전 준비 항목이 표시되어 있습니다.','대표 전화 1522-3201 또는 사무실 031-988-1562로 연락할 수 있습니다. 온라인 접수는 준비 중이며 문의가 방문·출동 확정을 의미하지 않습니다.'],
 ['홈페이지 화면 검토 안내','PC와 모바일에서 메뉴, 제품 목록, 상세 화면과 연락 안내를 검토할 수 있습니다.','이 공지는 화면 검토용 초안입니다. 회사의 공식 공지나 접수 개시 발표가 아니며 최종 승인 후 운영 자료로 교체합니다.']
];
for(let i=1;i<=10;i++)for(const [type,photoKey] of [['products',products[i-1][0]],['projects',jobs[i-1][0]]]){
 const key='development-demo/reference-v2/'+type+'-'+i+'.jpg';
 execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','r2','object','put','gnc-cooling-local-files/'+key,'--local','--file','public/reference/'+photoKey+'.jpg','--content-type','image/jpeg'],{stdio:'pipe'});
}
try{db.exec('BEGIN IMMEDIATE');
 for(let i=1;i<=10;i++){
  const [key,intro,body,prepare]=products[i-1];const p=photos.find(p=>p.key===key);
  db.prepare('UPDATE products SET intro=?,description=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=?').run(intro,'[개발 예시]\n'+warning+'\n\n제품 이해\n'+body+'\n\n상담 준비\n'+prepare+'\n\n자료 안내\n사진은 '+p.label+' 참고 이미지입니다. 실제 외형·공급 모델·성능은 승인된 자료로 확인합니다.',prefix+'products-'+i);
  db.prepare('UPDATE product_models SET description=? WHERE id=?').run('예시 모델 표기와 수치는 화면 검토용입니다. 실제 모델명과 공급 사양은 확인 후 교체합니다.\n'+prepare,prefix+'model-'+i);
  const [projectPhoto,title,a,b,c]=jobs[i-1];const projectImg=photos.find(p=>p.key===projectPhoto);
  db.prepare('UPDATE projects SET description=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=?').run('[개발 예시] '+title+' 검토 흐름\n'+warning+'\n\n상담 배경\n'+a+'을 먼저 정리하는 가상 구성입니다.\n\n검토 항목\n'+b+'을 확인합니다.\n\n범위 정리\n'+c+'이 필요합니다.\n\n사진 안내\n'+projectImg.label+' 참고 사진이며 이 회사가 수행한 작업이 아닙니다. 고객명·위치·공사 기간·성과는 임의로 기재하지 않았습니다.',prefix+'projects-'+i);
  for(const [type,photo] of [['products',p],['projects',projectImg]]){
   const id=prefix+'file-'+type+'-'+i;
   // Unique R2 keys per DB row are required; one photo may illustrate multiple demo items.
   const key='development-demo/reference-v2/'+type+'-'+i+'.jpg';

   const alt=photo.label+(photo.key==='plate'?' 구조 참고도':' 참고 사진')+' · 실제 회사 제품·현장 아님';
   db.prepare('UPDATE files SET object_key=?,original_name=?,mime=?,size_bytes=?,alt=?,scan_engine=?,scan_reason=NULL,source_key=NULL,validated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=? AND status=\'ready\'').run(key,photo.key+'.jpg','image/jpeg',photo.bytes,alt,photo.engine,id);
   db.prepare('UPDATE file_links SET alt=?,caption=? WHERE file_id=?').run(alt,photo.author+' · '+photo.license+' · 출처 /image-credits#'+photo.key,id);
  }
  const [resourceTitle,resourceBody,check]=resources[i-1];
  db.prepare('UPDATE resources SET description=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?').run('[개발 예시] '+resourceTitle+'\n\n'+resourceBody+'\n'+check+'\n\n다운로드 안내\n현재 파일은 공통 개발 시험 PDF입니다. 이 화면의 설명은 상담 준비용이며 실제 카탈로그·설비 매뉴얼이나 점검 지침은 아닙니다.',prefix+'resources-'+i);
  const [noticeTitle,noticeBody,extra]=notices[i-1];
  db.prepare('UPDATE notices SET body=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?').run('[개발 예시] '+noticeTitle+'\n회사 공식 공지로 승인되지 않은 화면 검토용 내용입니다.\n\n'+noticeBody+'\n\n'+extra,prefix+'notice-'+i);
 }
 db.exec('COMMIT');
}catch(error){db.exec('ROLLBACK');throw error;}
console.log(JSON.stringify({products:10,projects:10,resources:10,notices:10,images:20,foreignKeyErrors:db.prepare('PRAGMA foreign_key_check').all().length,backup},null,2));db.close();
