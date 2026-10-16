import {conceptIntro} from './concept-intro.ts';
import {companyProfile as company} from './company-profile.ts';
import {escapeHtml as e} from './html-utils.ts';
// Edited from http://gnccool.co.kr/greeting.php, reviewed 2026-10-15.
export function companyGreeting(){

 return conceptIntro('G&C COOLING',['안정적인 냉각,','현장을 이해하는 기술에서.'],'현장을 이해하는 기술과 신뢰로, 고객과 함께하겠습니다.','/generated/company-greeting-intro.png','고객과의 소통과 신뢰를 표현한 일러스트')+`<section class="ceo-intro" aria-labelledby="ceo-message-title"><div class="ceo-intro-copy"><h2 id="ceo-message-title">고객 여러분께 드리는 인사</h2><p class="ceo-lead">공장의 냉각수 문제,<br>지엔씨쿨링과 함께 해결해 나가겠습니다.</p><div class="ceo-message"><p>지엔씨쿨링 홈페이지를 찾아주신 여러분께 감사드립니다.</p><p>공장에서 냉각수는 생산 설비의 안정적인 운전을 뒷받침하는 중요한 요소입니다. 지엔씨쿨링은 냉각탑과 칠러, 열교환기를 중심으로 고객의 현장에 필요한 냉각 솔루션을 함께 고민해 왔습니다.</p><p>설비의 용도와 생산 열부하를 살피고, 현장 조건에 맞는 기종을 선정하는 것부터 시작합니다. 설계와 제작, 배관, 설치, 시운전까지 연결되는 과정을 통해 고객이 필요로 하는 냉각시스템을 제안하겠습니다.</p><p>그동안 쌓아온 경험과 기술을 바탕으로 고객의 말씀에 귀 기울이며, 신뢰할 수 있는 파트너로 함께하겠습니다. 앞으로도 많은 관심과 성원을 부탁드립니다.</p><p>감사합니다.</p></div><div class="ceo-signature"><span>${e(company.name)}</span><p>${e(company.ceoTitle)} <strong>${e(company.ceo)}</strong></p></div></div><figure class="ceo-visual"><img src="/generated/tower.png" alt="냉각탑 구조를 표현한 설명용 이미지" fetchpriority="high"><figcaption>냉각탑 설명용 이미지 · 실제 납품 제품이나 현장 사진이 아닙니다.</figcaption><div class="ceo-visual-caption" aria-hidden="true"><span>G&amp;C COOLING</span><p>현장의 조건을 살피고,<br>필요한 냉각을 연결합니다.</p></div></figure></section>`;
}
