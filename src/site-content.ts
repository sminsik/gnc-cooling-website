export const companyPages = [
 {id:'GNC-ST01',path:'/company/greeting',title:'CEO 인사말',message:'대표이사 이상민 · 회사가 승인한 인사말은 준비 중입니다.'},
 {id:'GNC-ST02',path:'/company/about',title:'회사 개요·연혁',message:'냉각탑 전문기업의 기본정보와 주요 업무를 안내합니다.'},
 {id:'GNC-ST03',path:'/company/certifications',title:'인증서',message:'보유 인증과 유효 여부·공개 가능한 증서를 확인하고 있습니다.'},
 {id:'GNC-ST04',path:'/company/location',title:'찾아오시는 길',message:'사업장 주소와 대표 전화·이메일을 확인하세요.'},
];
export const businesses = [
 {id:'GNC-ST06',path:'/business/cooling-tower-installation',title:'냉각탑 제작·설치',message:'명함에 안내된 직교류·사각·원형 냉각탑 제작 업무입니다. 현장별 설치 범위와 진행 과정은 상담으로 확인합니다.',work:'installation'},
 {id:'GNC-ST07',path:'/business/cooling-tower-repair',title:'냉각탑 보수',message:'보수 작업 범위와 현장 확인 항목을 정리하고 있습니다.',work:'repair'},
 {id:'GNC-ST08',path:'/business/factory-piping',title:'공장 배관',message:'명함에 안내된 사출기·공장 배관 시공 업무입니다. 현장별 작업 범위는 상담으로 확인합니다.',work:'installation'},
 {id:'GNC-ST09',path:'/business/cooling-system',title:'냉각시스템 설계·적용',message:'시스템 설계·적용 업무와 관련 제품을 확인하고 있습니다.',work:'unknown'},
];
export const staticPages = [...companyPages,
 {id:'GNC-REF01',path:'/image-credits',title:'이미지 출처',message:'분야 설명용 참고 사진의 출처와 사용 조건을 안내합니다.'},
 {id:'GNC-ST05',path:'/business',title:'사업분야',message:'분야별 작업 내용을 확인하고 있습니다. 아래에서 관심 분야를 선택해주세요.'},
 ...businesses,
 {id:'GNC-ST10',path:'/support/as',title:'A/S 안내',message:'전화 상담 연락처와 상담 시 확인할 정보를 안내합니다. 현재 온라인 신청은 준비 중입니다.'},
 {id:'GNC-ST11',path:'/privacy',title:'개인정보 처리방침',message:'개인정보 처리방침을 준비 중입니다. 수집 항목·보관 기간·문의 창구는 회사 확인 후 게시하며, 현재 온라인 문의로 개인정보를 수집하지 않습니다.'},
];
export const menu = [
 {title:'회사소개',path:'/company/greeting',links:companyPages},
 {title:'사업분야',path:'/business',links:[{path:'/business',title:'사업분야 안내'},...businesses]},
 {title:'제품소개',path:'/products',links:[{path:'/products',title:'전체 제품'},{path:'/products?category=cooling-towers',title:'냉각탑'},{path:'/products?category=chillers',title:'칠러'},{path:'/products?category=heat-exchangers',title:'열교환기'}]},
 {title:'시공·납품 사례',path:'/projects',links:[{path:'/projects',title:'전체 사례'}]},
 {title:'고객지원',path:'/notices',links:[{path:'/notices',title:'공지사항'},{path:'/resources',title:'기술자료·카탈로그'},{path:'/support/as',title:'A/S 안내'}]},
 {title:'견적·상담',path:'/inquiries',links:[{path:'/inquiries',title:'문의 신청'},{path:'/my-inquiries',title:'내 문의 확인'}]},
];
