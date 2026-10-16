import {conceptIntro} from './concept-intro.ts';
import {companyProfile as company} from './company-profile.ts';
import {escapeHtml as e} from './html-utils.ts';
// Source: http://gnccool.co.kr/bbs/board.php?bo_table=history (2026-10-15).
const history:[string,[string,string][]][]=[
 ['2026',[['02','경영혁신형 중소기업(메인비즈) 인증'],['03','품질경영시스템 ISO 9001 인증 · 냉각탑, 공기조화기 설계 및 제조'],['03','환경경영시스템 ISO 14001 인증 · 냉각탑, 공기조화기 설계 및 제조'],['03','안전보건경영시스템 ISO 45001 인증 · 냉각탑, 공기조화기 설계 및 제조']]],
 ['2025',[['03','한국산업기술진흥협회 연구개발전담부서 인정'],['09','한국중소벤처기업유통원 직접생산확인증명(냉각탑)'],['09','전문건설업 면허 취득 · 기계설비가스공사업(김포-25-파-13)']]],
 ['2024',[['03','특허 등록 · 소음이 저감된 냉각탑 (제10-2646132호)']]],
 ['2017',[['05','나이스 신용평가(주) 기술평가 우수기업 선정']]],
 ['2016',[['02','핸즈코퍼레이션(주) 협력업체 등록'],['03','고려엠지 열교환기 판매대리점 체결']]],
 ['2015',[['10','김포 사업장 이전']]],
 ['2010',[['03','인하대학교 산학협력업체 체결']]],
 ['2008',[['05','(주)와이지원 협력업체 등록']]],
 ['2007',[['02','지앤씨쿨링(주)로 법인전환'],['05','엘에스메탈(주) 협력업체 등록'],['09','(주)오토젠 협력업체 등록']]],
 ['2003',[['02','지앤씨텍으로 사업 개시 · 냉각탑, 냉난방장비, 설비']]],
];
const yearMessages:Record<string,string>={
 '2026':'품질·환경·안전의 기준을 높이며,\n신뢰의 기반을 넓혀갑니다.',
 '2025':'연구개발과 전문 시공 역량으로,\n냉각 기술의 기반을 다집니다.',
 '2024':'소음을 줄이는 냉각탑 기술,\n특허로 새로운 가치를 더합니다.',
 '2017':'기술평가 우수기업 선정,\n쌓아온 기술력을 인정받습니다.',
 '2016':'고객과의 협력을 넓히고,\n열교환기 솔루션을 더합니다.',
 '2015':'김포의 새로운 터전에서,\n다음 도약을 준비합니다.',
 '2010':'대학과 산업 현장을 연결해,\n함께 성장할 기반을 마련합니다.',
 '2008':'새로운 고객과의 만남으로,\n협력의 폭을 넓혀갑니다.',
 '2007':'법인 전환과 고객사 확대,\n성장의 새 장을 엽니다.',
 '2003':'냉각 기술을 향한 첫걸음,\n지앤씨텍으로 사업을 시작합니다.',
};
export function companyHistory(){return conceptIntro('OUR HISTORY',['현장과 함께 쌓아온 경험,','기술로 이어가는 내일.'],'2003년부터 이어온 지엔씨쿨링의 발자취와 회사 정보를 소개합니다.','/generated/company-history-intro.png','회사의 시작과 성장의 흐름을 표현한 일러스트')+`<div class="history-layout"><aside class="history-sidebar"><span class="history-since">HISTORY</span><strong data-history-year aria-label="현재 연혁 2026년">2026</strong><p data-history-message>${e(yearMessages['2026'])}</p></aside><section class="history-timeline" aria-label="연도별 회사 연혁">${history.map(([year,events])=>`<section class="history-year" data-history-message="${e(yearMessages[year])}" aria-labelledby="year-${year}"><h3 id="year-${year}">${year}</h3><ol>${events.map(([month,event])=>`<li><time datetime="${year}-${month}">${month}<span>월</span></time><p>${e(event)}</p></li>`).join('')}</ol></section>`).join('')}</section></div><section id="company-facts" class="history-facts"><div><p class="eyebrow">COMPANY PROFILE</p><h2>회사 기본정보</h2><a class="text-link" href="/company/location">찾아오시는 길 ↗</a></div><dl>${[['회사명',company.name],['영문명',company.englishName],['대표이사',company.ceo],['사업장',company.address],['주요 업무',company.businesses.join(' · ')]].map(([key,value])=>`<div><dt>${key}</dt><dd>${e(value)}</dd></div>`).join('')}</dl></section>`;}
