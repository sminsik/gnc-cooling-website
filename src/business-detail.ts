import {businessFaq} from './business-faq.ts';
import {conceptIntro} from './concept-intro.ts';
import {escapeHtml as e} from './html-utils.ts';
type Detail={label:string;headline:string[];intro:string;sections:{title:string;body:string;items:string[]}[];check:string[]};
const details:Record<string,Detail>={
 'cooling-tower-installation':{label:'COOLING TOWERS',headline:['운전 조건에 맞는 냉각,','설계에서 설치까지.'],intro:'유량과 온도, 설치 환경을 함께 살펴 냉각탑을 제안합니다.',sections:[
 {title:'용량보다 먼저, 운전 조건을 확인합니다.',body:'같은 용량의 냉각탑이라도 순환수량과 입·출구 수온, 외기 습구온도에 따라 운전 결과가 달라집니다. 기존 설비 교체 시에는 명판뿐 아니라 실제 운전 기록과 부하 변화를 함께 검토합니다.',items:['순환수량과 목표 냉각수 온도','설치 지역의 외기 조건과 계절별 부하','현재 운전 대수와 향후 증설 계획']},
 {title:'형식과 현장 배치를 함께 검토합니다.',body:'직교류형은 물과 공기가 교차하고, 대향류형은 서로 반대 방향으로 흐릅니다. 형식의 차이와 함께 설치 면적·높이, 수질, 정비 접근성을 살펴 기종을 검토합니다.',items:['원형·직교류·사각 냉각탑의 적용 검토','장비 반입·양중 동선과 설치 공간','팬·충진재 교체를 위한 정비 공간']},
 {title:'설치 후 운전 상태까지 확인합니다.',body:'배관 연결과 살수 상태를 확인하고 실제 부하에서 운전 데이터를 기록합니다. 외기와 운전 조건을 함께 남겨 설비 상태를 비교할 수 있도록 합니다.',items:['배관 연결·누수와 수조 수위','팬 회전 방향·전류·진동','입·출구 수온과 살수 분포']}
 ],check:['기존 냉각탑의 모델과 명판 사진','순환수량, 입·출구 수온 등 보유 운전 자료','설치 위치·공간과 반입 경로','교체 또는 신규 설치 일정']},
 'cooling-tower-repair':{label:'MAINTENANCE',headline:['증상을 넘어 원인을 살피고,','안정적인 운전으로.'],intro:'냉각 성능과 주요 부품의 상태를 함께 확인해 보수 범위를 정리합니다.',sections:[
 {title:'냉각수 온도 상승, 조건부터 비교합니다.',body:'출구 수온이 높다는 이유만으로 장비 고장을 단정하기는 어렵습니다. 계측 상태와 부하·외기 조건을 먼저 비교한 뒤 물과 공기의 흐름을 점검합니다.',items:['수온 계측 위치와 습구온도·부하 변화','펌프·밸브와 순환수량','팬 운전과 흡입·토출부 막힘']},
 {title:'충진재와 살수 계통을 함께 봅니다.',body:'충진재가 막히거나 살수가 한쪽으로 치우치면 열교환에 쓰이는 면적이 줄어듭니다. 부품의 손상뿐 아니라 수질·침전물·노즐 막힘 등 연결된 원인을 확인합니다.',items:['충진재의 오염·변형·파손과 교체 검토','살수 노즐·분배관의 막힘과 분사 편차','수조 슬러지·스트레이너·수위 상태']},
 {title:'팬·구동부 점검과 보수 후 확인.',body:'진동과 소음은 발생 시점과 회전수, 기존 기록의 변화를 함께 살펴봅니다. 회전체 점검은 정지와 에너지 차단 후 진행하고, 조치 뒤 운전 상태를 다시 확인합니다.',items:['팬·감속기·베어링과 체결 상태','구동부 정렬과 구조물의 부식·이완','조치 전후 전류·진동·소음 기록']}
 ],check:['냉각탑 전체와 이상 부위 사진','증상이 시작된 시점과 발생 조건','최근 부품 교체·청소·보수 이력','작업 가능한 정지 일정']},
 'factory-piping':{label:'FACTORY PIPING',headline:['설비와 설비 사이,','현장에 맞는 흐름을 만듭니다.'],intro:'사출기와 공장 설비의 운전 조건을 고려해 배관을 설계·시공합니다.',sections:[
 {title:'연결할 장비와 계통을 먼저 확인합니다.',body:'공급과 환수의 흐름, 펌프·밸브 위치와 기존 배관을 파악합니다. 신규 연결인지 기존 라인의 변경인지에 따라 필요한 작업 범위와 가동 중단 구간을 정리합니다.',items:['연결 장비와 공급·환수 경로','유체 종류·온도·압력과 필요 유량','기존 관경·재질과 분기 위치']},
 {title:'배관 경로부터 유지관리 공간까지.',body:'배관 재질과 접합 방식은 사용 조건과 현장 환경에 맞춰 검토합니다. 시공 경로뿐 아니라 밸브 조작·점검 공간, 지지와 보온 상태를 함께 살펴봅니다.',items:['재질·접합부와 장비 연결 방식','지지대·행거와 진동·열팽창 구간','보온·보냉과 결로·동결 취약 구간']},
 {title:'시공을 마친 뒤 흐름을 확인합니다.',body:'이물질 제거와 누설 확인, 공기 배출과 운전 상태 확인으로 마무리합니다. 도면과 설비 사양에 맞는 시험 조건을 적용하고 작업 전후 상태를 기록합니다.',items:['플러싱과 스트레이너 상태','접속부 누설과 압력·유량 확인','보온 마감·지지부와 운전 기록']}
 ],check:['연결 장비와 기존 계통도·현장 사진','배관 재질·관경과 운전 온도·압력','신규·증설·보수 등 요청 작업','가동 중단 가능 시간과 작업 동선']},
 'cooling-system':{label:'COOLING SYSTEMS',headline:['장비를 넘어 계통으로,','필요한 냉각을 설계합니다.'],intro:'냉각탑·칠러·열교환기와 배관을 하나의 흐름으로 검토합니다.',sections:[
 {title:'공정의 요구 조건에서 시작합니다.',body:'어떤 설비에 어느 온도의 냉각수가 필요한지, 부하와 운전 시간이 어떻게 달라지는지 살펴봅니다. 기존 장비 활용 여부와 향후 변화도 함께 검토합니다.',items:['목표 공급·환수 온도와 요구 유량','공정별 운전 시간과 부하 변화','기존 장비 구성과 설치·전원 여건']},
 {title:'장비와 배관의 연결 조건을 맞춥니다.',body:'장비를 개별적으로 선정하는 데 그치지 않고 펌프·밸브·배관을 포함한 순환 계통을 살펴봅니다. 장비 용량과 별개로 유량 부족이나 바이패스가 성능에 영향을 줄 수 있습니다.',items:['냉각탑·칠러·열교환기의 역할과 연결','펌프 운전·밸브 상태와 계통 유량','공기 체류·우회 흐름과 유지관리 동선']},
 {title:'성능은 운전 조건과 함께 읽습니다.',body:'냉각탑의 Range는 입구와 출구 수온의 차이, Approach는 출구 수온과 유입공기 습구온도의 차이입니다. 같은 시점의 유량과 부하를 함께 기록하고 제작사 성능자료와 비교합니다.',items:['입·출구 수온과 외기 습구온도','유량·운전 대수·부하의 동시 기록','조건을 맞춘 조치 전후 운전 비교']}
 ],check:['공정별 필요 온도와 보유 유량 자료','현재 장비 목록과 배관 계통도','운전 중 불편한 점과 개선 목표','설치 공간과 향후 증설 계획']}
};
const sectionIllustrations:Record<string,string[]>={
 'cooling-tower-installation':['installation-conditions','installation-layout','installation-commissioning'],
 'cooling-tower-repair':['repair-temperature','repair-fill-water','repair-fan-drive'],
 'factory-piping':['piping-circuit','piping-route','piping-testing'],
 'cooling-system':['system-requirements','system-connections','system-performance'],
};
export function businessDetail(slug:string){
 const d=details[slug];if(!d)return '';
 return conceptIntro(d.label,d.headline,d.intro,`/generated/business-${slug}-v1.png`,`${d.label} 일러스트`)+d.sections.map((s,i)=>`<section class="business-detail-section"><div class="business-detail-heading business-detail-heading-illustrated"><img class="business-detail-art" src="/generated/${sectionIllustrations[slug][i]}-v1.png" alt="" width="1536" height="1024" loading="lazy"><h2>${e(s.title)}</h2></div><div><p>${e(s.body)}</p><ul>${s.items.map(v=>`<li>${e(v)}</li>`).join('')}</ul></div></section>`).join('')+businessFaq(slug);
}
