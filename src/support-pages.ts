import {conceptIntro} from './concept-intro.ts';
import {companyProfile as company} from './company-profile.ts';
import {escapeHtml as e} from './html-utils.ts';

export function supportIntro(kind:string){
 const content:Record<string,[string,string[],string]>={
  projects:['PROJECTS',['현장에서 이어지는','냉각 기술의 경험'],'냉각탑 설치와 보수, 배관 및 냉각시스템의 시공·납품 사례를 살펴보세요.'],
  resources:['TECHNICAL LIBRARY',['설비를 이해하고','선정을 준비하는 자료'],'제품과 설비에 관한 설명, 모델별 사양과 카탈로그를 확인하세요.'],
  notices:['NEWS & UPDATES',['지엔씨쿨링의 소식과','주요 안내'],'회사 소식과 홈페이지 이용에 필요한 안내를 전합니다.'],
  as:['AFTER-SALES SERVICE',['설비의 상태를 듣고','필요한 점검을 함께'],'현재 증상과 현장 조건을 바탕으로 점검·보수 상담을 안내합니다.'],
  consultation:['BEFORE WE TALK',['현장을 이해하는 대화,','상담의 시작입니다'],'제품 선정부터 설치·보수까지, 필요한 작업과 현장 조건을 알려주세요.'],
 };
 const [label,lines,description]=content[kind]||content.consultation;
 return conceptIntro(label,lines,description,`/generated/support-${kind}-v1.png`,'');
}
export function contactPanel(){return `<section class="support-contact"><div><p class="eyebrow">LET’S TALK</p><h2>전화·이메일 상담</h2><p>확인 가능한 설비 정보와 현장 지역을 함께 알려주세요.</p></div><div class="support-contact-links"><a href="${e(company.phoneHref)}">${e(company.phone)}</a><a href="mailto:${e(company.email)}">${e(company.email)}</a><a href="/company/location">사업장 위치·연락처 ↗</a></div></section>`;}
export function consultationSteps(as=false){return `<section class="support-section"><div class="support-section-heading"><p class="eyebrow">${as?'SERVICE CHECKLIST':'CONSULTATION CHECKLIST'}</p><h2>상담 전 준비할 정보</h2></div><ol class="support-steps"><li><span>01</span><h3>현장과 설비</h3><p>현장 지역과 설비 종류, 모델명·명판 사진을 준비해주세요. 모르는 사양은 비워두셔도 됩니다.</p></li><li><span>02</span><h3>${as?'증상과 발생 시점':'필요한 작업과 운전 조건'}</h3><p>${as?'평소와 달라진 증상, 발생 시점과 최근 작업 이력을 정리해주세요.':'설치·교체·보수 등 필요한 작업과 확인 가능한 온도·유량, 설치 공간을 알려주세요.'}</p></li><li><span>03</span><h3>범위와 일정 상담</h3><p>희망 일정과 현장 제약을 알려주시면 필요한 확인 사항을 함께 검토합니다. 작업 범위·비용·일정은 상담 후 확인합니다.</p></li></ol></section>`;}
export function afterSales(){return supportIntro('as')+contactPanel()+consultationSteps(true)+`<section class="support-note"><p class="eyebrow">SERVICE SCOPE</p><h2>점검·보수 범위 안내</h2><p>방문 가능 여부, 부품 공급, 보증 적용과 비용은 장비 정보 및 현장 상태를 확인한 뒤 안내합니다. 전화 상담은 방문·출동이나 무상 보수 확정을 뜻하지 않습니다.</p><a class="button" href="/inquiries?kind=as">A/S 문의 안내</a></section>`;}
