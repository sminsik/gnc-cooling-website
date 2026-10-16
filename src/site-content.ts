export const companyPages = [
 {id:'GNC-ST01',path:'/company/greeting',title:'CEO 인사말',message:'현장을 이해하는 기술로, 고객과 함께하는 냉각 솔루션을 제안합니다.'},
 {id:'GNC-ST02',path:'/company/about',title:'회사 개요·연혁',message:'2003년부터 이어온 지엔씨쿨링의 발자취와 회사 기본정보를 소개합니다.'},
 {id:'GNC-ST03',path:'/company/certifications',title:'인증 및 등록',message:'경영·품질 인증부터 사업·기술 역량과 협력 이력까지 소개합니다.'},
 {id:'GNC-ST04',path:'/company/location',title:'찾아오시는 길',message:'지엔씨쿨링의 사업장 위치와 연락처를 안내합니다.'},
];
export const businesses = [
 {id:'GNC-ST06',path:'/business/cooling-tower-installation',title:'냉각탑 제작·설치',message:'현장 조건과 사용 목적에 맞춰 냉각탑을 설계하고 제작·설치합니다.',work:'installation'},
 {id:'GNC-ST07',path:'/business/cooling-tower-repair',title:'냉각탑 보수',message:'냉각탑 점검과 주요 부품 교체로 안정적인 설비 운전을 돕습니다.',work:'repair'},
 {id:'GNC-ST08',path:'/business/factory-piping',title:'공장 배관',message:'사출기와 공장 설비의 운전 환경을 고려한 배관을 설계·시공합니다.',work:'installation'},
 {id:'GNC-ST09',path:'/business/cooling-system',title:'냉각시스템 설계·적용',message:'냉각탑·칠러·열교환기와 배관을 함께 검토해 현장에 맞는 냉각시스템을 제안합니다.',work:'unknown'},
];
export const staticPages = [...companyPages,
 {id:'GNC-REF01',path:'/image-credits',title:'이미지 출처',message:'분야 설명용 참고 사진의 출처와 사용 조건을 안내합니다.'},
 {id:'GNC-ST05',path:'/business',title:'사업분야',message:'냉각 설비의 제작·설치부터 보수와 배관까지, 주요 사업을 소개합니다.'},
 ...businesses,
 {id:'GNC-ST10',path:'/support/as',title:'A/S 안내',message:'설비 점검과 보수 상담에 필요한 연락처와 절차를 안내합니다.'},
 {id:'GNC-ST11',path:'/privacy',title:'개인정보 처리방침',message:'개인정보 처리방침을 준비 중입니다. 수집 항목·보관 기간·문의 창구는 회사 확인 후 게시하며, 현재 온라인 문의로 개인정보를 수집하지 않습니다.'},
];
export const menu = [
 {title:'회사소개',path:'/company/greeting',links:companyPages},
 {title:'사업분야',path:'/business',links:[{path:'/business',title:'사업분야 안내'},...businesses]},
 {title:'제품소개',path:'/products',links:[{path:'/products',title:'전체 제품'},{path:'/products?category=cooling-towers',title:'냉각탑'},{path:'/products?category=chillers',title:'칠러'},{path:'/products?category=heat-exchangers',title:'열교환기'}]},
 {title:'시공·납품 사례',path:'/projects',links:[{path:'/projects',title:'전체 사례'}]},
 {title:'고객지원',path:'/notices',links:[{path:'/notices',title:'공지사항'},{path:'/resources',title:'기술자료·카탈로그'},{path:'/support/as',title:'A/S 안내'}]},
 {title:'견적·상담',path:'/inquiries',links:[{path:'/inquiries',title:'견적·상담'},{path:'/my-inquiries',title:'내 문의 확인'}]},
];
