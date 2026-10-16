import {animatedIcon} from './animated-icons.ts';
import {companyProfile as company} from './company-profile.ts';
import {conceptIntro} from './concept-intro.ts';
import {escapeHtml as e} from './html-utils.ts';

export function companyLocation(){
 const mapUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.address)}`;
 const embedUrl=`https://www.google.com/maps?q=${encodeURIComponent(company.address)}&output=embed&hl=ko&z=16`;
 return conceptIntro('VISIT G&C COOLING',['더 가까운 만남,','지엔씨쿨링으로 오시는 길'], '사업장 위치와 연락처를 안내합니다.','/generated/company-location-intro.png','지도와 위치 핀, 사업장을 표현한 옅은 청록색 일러스트')+`
 <section class="location-map-section" aria-labelledby="location-map-title">
  <div class="location-map-heading"><div><p class="location-label">FIND US</p><h2 id="location-map-title">지엔씨쿨링 김포 사업장</h2></div><a href="${e(mapUrl)}" target="_blank" rel="noopener noreferrer">Google Maps에서 보기 ↗</a></div>
  <div class="location-map-frame"><iframe src="${e(embedUrl)}" title="지엔씨쿨링 김포 사업장 위치 지도" width="1120" height="460" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>
 </section>
 <section class="location-visit" aria-labelledby="location-address-title">
  <div class="location-address">
   <p class="location-label">OUR LOCATION</p><h2 id="location-address-title">김포 사업장</h2>
   <p class="location-address-text">경기도 김포시 통진읍<br>율마로300번길 120-53</p>
   <div class="location-visit-note"><span>VISIT GUIDE</span><p>방문 일정은 전화로 먼저 문의해 주세요.</p></div>
  </div>
  <div class="location-contact"><p class="location-label">GET IN TOUCH</p><h2>편하게 연락해 주세요.</h2>
   <a class="location-primary-phone" href="${company.phoneHref}"><span>대표 전화</span><strong>${animatedIcon('phone-call')}<span>${company.phone}</span></strong></a>
   <dl class="location-details">
    <div><dt>사무실</dt><dd><a href="${company.officePhoneHref}">${company.officePhone}</a></dd></div>
    <div><dt>팩스</dt><dd>${company.fax}</dd></div>
    <div><dt>대표이사 직통</dt><dd><a href="${company.mobileHref}">${company.mobile}</a></dd></div>
    <div><dt>이메일</dt><dd><a href="mailto:${e(company.email)}">${e(company.email)}</a></dd></div>
   </dl>
  </div>
 </section>`;
}
