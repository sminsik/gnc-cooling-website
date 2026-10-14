import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import IconTrailButton from './tween/icon-trail-button';
import SlidingTabs from './tween/sliding-tabs';
import RatingCarousel from './tween/rating-carousel';
import FlipCard from './tween/flip-card';
import FaqAccordion from './tween/faq-accordion';
import TextRollButton from './tween/text-roll-button';
function TweenDemo(){
 const [section,setSection]=useState('products');
 const [message,setMessage]=useState('버튼에 마우스를 올리거나 키보드로 초점을 이동해보세요.');
 const items=[{value:'products',label:'제품'},{value:'business',label:'사업분야'},{value:'contact',label:'문의 안내'}];
 return <div className="tween-demo">
  <article className="tween-sample"><h3>01 아이콘 트레일 버튼</h3><p>아이콘 영역이 펼쳐지고, 이동 아이콘이 순서대로 나타납니다.</p><IconTrailButton onClick={()=>setMessage('아이콘 트레일 버튼을 확인했습니다. 실제 문의는 접수하지 않습니다.')}>문의 안내 예시</IconTrailButton></article>
  <article className="tween-sample"><h3>02 슬라이딩 탭</h3><p>포인터·키보드 이동에 따라 강조 배경이 이동합니다.</p><SlidingTabs aria-label="컴포넌트 분류 예시" items={items} value={section} onValueChange={setSection}/><p className="tween-selection" aria-live="polite">선택한 예시: {items.find(item=>item.value===section)?.label}</p></article>
  <article className="tween-sample"><h3>03 텍스트 롤 버튼</h3><p>버튼 글자가 위아래로 전환되는 GSAP 모션입니다.</p><TextRollButton onClick={()=>setMessage('텍스트 롤 버튼을 확인했습니다. 저장이나 발송은 하지 않습니다.')}>제품 살펴보기</TextRollButton></article>
  <article className="tween-sample tween-faq-sample"><h3>04 FAQ Accordion</h3><p>나중에 FAQ·문의 안내 등에 사용할 컴포넌트 예시입니다. 아래 내용은 회사의 실제 FAQ가 아닙니다.</p><FaqAccordion defaultOpen={null} items={[{"question": "[개발 예시] 냉각탑을 검토할 때 어떤 정보를 준비하나요?", "answer": "현장 용도·공간·기존 설비 정보를 정리하는 화면 예시입니다. 실제 선정 기준이나 성능 안내가 아닙니다."}, {"question": "[개발 예시] 냉각탑 교체와 보수는 어떻게 구분하나요?", "answer": "설비 상태·작업 범위·확인할 증상을 나누어 표시하는 답변 예시입니다. 회사의 실제 작업 판단은 확인 후 안내합니다."}, {"question": "[개발 예시] 칠러 관련 문의에는 어떤 조건이 필요한가요?", "answer": "사용 목적·설치 환경·기존 장비 정보를 묻는 질문 예시입니다. 구체적인 사양은 승인 자료가 필요합니다."}, {"question": "[개발 예시] 열교환기 검토에는 어떤 자료가 도움이 되나요?", "answer": "유체·설치 조건·기존 설비 자료를 정리하는 답변 구성 예시입니다. 실제 기술 권고가 아닙니다."}, {"question": "[개발 예시] 공장 배관 작업을 문의할 때 무엇을 정리하나요?", "answer": "현장과 요청 작업을 나누어 설명하는 예시입니다. 실제 작업 범위나 견적 조건은 아닙니다."}, {"question": "[개발 예시] 냉각시스템 적용 검토는 어떤 정보부터 확인하나요?", "answer": "대상 설비와 문의 사항을 정리하는 구성 예시입니다. 제공 가능한 실제 업무 범위는 회사 확인이 필요합니다."}, {"question": "[개발 예시] 현장 사진은 어떤 항목을 보여주면 좋을까요?", "answer": "설비 전체와 확인하고 싶은 부분을 구분하는 답변 형식 예시입니다. 개인정보나 타사 비공개 자료를 사용하는 내용은 아닙니다."}, {"question": "[개발 예시] 제품 모델명을 모르면 어떻게 정리하나요?", "answer": "확인 가능한 이름·사진·질문을 정리하는 화면 예시입니다. 가상 모델명과 수치는 실제 제품 정보가 아닙니다."}, {"question": "[개발 예시] A/S 요청 내용은 어떻게 설명하나요?", "answer": "증상과 발생 시점을 설명하는 답변 예시입니다. 현재 실제 온라인 접수는 잠겨 있습니다."}, {"question": "[개발 예시] 카탈로그와 제품 사양은 어디서 확인하나요?", "answer": "목록과 다운로드 연결을 시험하는 답변 예시입니다. 현재 개발용 PDF는 실제 회사 카탈로그가 아닙니다."}]}/></article>
  <article className="tween-sample tween-flip-sample"><h3>05 Flip Card</h3><p>나중에 제품·사업분야 소개에 사용할 카드 예시입니다. PC에서는 마우스 올림·초점, 터치 화면에서는 탭으로 전환합니다.</p><FlipCard title="카드 구성 예시" eyebrow="PREVIEW · 구성 검토" subtitle="앞면: 제목과 대표 이미지" description="뒷면에는 설명과 핵심 항목을 표시합니다. 실제 제품 사양이나 회사 실적을 의미하지 않습니다." image="/brand/gnc-color.png" imageAlt="제공된 지엔씨쿨링 로고 · 카드 이미지 예시" features={['설명과 핵심 항목','앞·뒷면 전환 모션','모바일·키보드 동작']} aria-label="Flip Card 앞뒷면 전환 예시"/></article>
  <article className="tween-sample tween-rating-sample"><h3>06 Rating Carousel</h3><p>평가 카드 구성 예시 · 실제 고객 평가 아님</p><p>드래그하거나 아래 이동 버튼으로 카드를 전환할 수 있습니다. 실제 평가 자료를 받기 전까지는 스타일 가이드에서만 사용합니다.</p><RatingCarousel aria-label="평가 카드 디자인 예시" testimonials={Array.from({length:10},(_,index)=>index+1).map(index=>({id:'sample-'+index,title:'카드 표시 예시 '+index,quote:'이 문장은 카드의 글자 크기와 슬라이드 전환을 확인하기 위한 예시입니다. 실제 고객 후기나 평가가 아닙니다.',name:'디자인 예시 '+index,role:'실제 고객 아님',avatar:'/brand/gnc-color.png',avatarAlt:'제공 회사 로고 · 예시 이미지'}))} swiper={{autoplay:false}}/></article>
  <p className="tween-result" role="status">{message}</p>
 </div>;
}
const target=document.getElementById('tween-ui-demo');if(target)createRoot(target).render(<TweenDemo/>);
