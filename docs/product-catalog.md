# 제품소개 — 파일 기반 카탈로그

구현일: 2026-10-16. 실제 작업 폴더: /Users/sminsiik/Documents/Codex/Project/gnc-cooling/website

## 구성과 관리

- 제품 데이터: `src/product-data.ts`. 냉각탑 4개, 칠러 5개, 열교환기 1개. 모델 기본 사양 총 84행.
- 화면: `src/product-pages.ts`. `/products`, 분류별 목록과 10개 상세 페이지. 검색 박스·상품 개수는 표시하지 않으며 분류 변경은 목록만 갱신한다.
- 공통 컨셉, Asta Sans, 강조색 #153D43, 보조 배경 #F5F5F3 및 기존 FAQ 동작을 적용한다.
- 상세: 컨셉 → 제품 사진·설명 → 모델 사양 또는 적용 조건 → 설치 사례 → FAQ → BEFORE WE TALK 상담 준비 항목·상담 버튼.
- 제품은 파일로 관리한다. 기존 DB 제품 API·관리자·사진 접근 제어는 보존했다. 공개 제품 메뉴는 파일 카탈로그를 사용하며, 문의 연결은 기존 문의 흐름에서 파일 제품도 인식한다. 접수 활성화 설정은 변경하지 않았다.
- 모델 ID는 현재 제품 ID와 배열 인덱스로 생성한다. 향후 모델별 문의 링크를 공개하기 전 고정 모델 ID로 전환할 것. 현재 UI는 제품 단위 문의만 제공한다.

## 자료와 게시 범위

자료 폴더: `../outputs/제품자료/기존홈페이지_20261016/`

- 원본 사이트의 실제 제품 사진 10장을 이름을 유지한 채 `public/product-media/`로 복사. 원본은 보존한다.
- 냉각탑: 카탈로그 주요 사양 전사 CSV 58행. 온도 조건과 냉각탑 RT 기준을 표시한다.
- 칠러: 기존 HTML 사양표 5개에서 모델·냉각능력·중량, ACU 탱크·펌프 토출량을 수록. 압축기 정격출력을 장비 총소비전력으로 오인하지 않도록 전력 칸을 생략했다.
- 냉매와 보호 설정, 오기 가능성이 있는 유량 단위·치수는 게시하지 않았다. SC100 높이, CTN100/125 길이처럼 자료 간 충돌하는 항목도 제외한다.
- CT80 열량 오기 의심 값은 '—'로 표시했다. 잘린 원형 사양표의 첫 모델은 추정하여 추가하지 않았다.
- SCC-CT와 판형 열교환기는 정확한 모델별 수치가 없어 적용 조건으로 설명한다. 타사 모델 수치로 채우지 않는다.
- SG/SGD 최신 공급 여부·냉매와 명판 대응, SG60AR/SGD120AR 접미사, SG03AR 계열 압축기 외부 표기 충돌은 등록준비/온라인보완 문서의 미확인 항목으로 유지한다. 현행 판매 가능 여부나 효율 우위를 홍보 문구로 확정하지 않았다.
- 온라인 보완: BAC·EVAPCO·Trane·센추리·Kelvion 공식 자료의 제품군 원리·선정 조건만 반영. 출처별 URL과 적용 범위는 원 조사 문서 참조.

## 설치 사례 연결

각 제품의 `projectIds`에 회사에서 확인한 기존 사례 ID를 넣으면 해당 사례를 `/projects/{id}`로 연결한다. 1차 메뉴와 같은 데이터·상세 페이지를 사용한다. 공개 승인과 이미지 검증 조건을 통과한 사례만 표시하고 임의의 작업 종류·제목 유사도 매칭은 하지 않는다. 현재 확인된 대응 ID가 없어 빈 배열이다. 빈 상태에서는 전체 시공·납품 사례 링크만 제공한다.

## 일러스트

imagegen 내장 도구로 제작. 기존 `business-intro-v2.png`를 스타일 참조로 사용했다. 원본 `public/generated/products-intro-v1.png`. 컨셉 영역에서 옅은 색과 설비 바닥선 정렬을 CSS로 조절한다.

최종 프롬프트: Create one new website editorial illustration for a Korean industrial cooling PRODUCT catalog. Reference image is STYLE REFERENCE only. Match pale desaturated teal thick rounded line art and off-white fills, two-tone flat simple illustration. Show three compact products grouped on a shared level baseline: a square cooling tower with top fan on left, a small air cooled chiller with front grille in middle, a plate heat exchanger with stacked plates on right. Clean elegant balanced horizontal 3:2 composition, no wrench or badge, no people, NO TEXT, no numbers, NO GLOW, no shadows, no dark background. Transparent background. All equipment fits fully within canvas with small clear margins, recognizable moderate detail, same bold friendly flat outline as reference. Do not recreate product photographs; this is a symbolic category illustration.

## 검증

`tests/product-catalog.test.mjs`: 분류·모델 검색, 정적 데이터 행 정합성, 10개 상세와 문의 연결, HTML 이스케이프, HEAD, 공개 사례 연결 제약. 기존 DB API의 비공개 데이터 보호 테스트를 유지한다. 정적 제품 목록은 DB 장애 시에도 제공하도록 기존 DB 의존 페이지 테스트 한 항목을 새 동작에 맞췄다.

최종 검증: 타입 검사 2종·자동 테스트 141개 통과. Chrome 1440/390/320px에서 목록·냉각탑 상세·열교환기 상세 점검, 컨셉 간격 48/32px, Asta Sans, 이미지 누락·가로 넘침·브라우저 오류 없음. 분류/모델 검색·FAQ 단일 열림·상담 제품명 유지 확인. 화면 및 결과: `../outputs/검증/20261016-products/`.


## 상세 사양표 복원 (2026-10-16 사용자 요청)

칠러 5개 상세 페이지에는 기존 사이트의 전체 표를 `src/product-specifications.ts`로 보존해 표시한다. 압축기·응축기·증발기·전원·냉매·보호장치·작동치·접속 관경·외형·중량, ACU 탱크·펌프 항목까지 모두 포함한다. 기존 요약 모델 데이터는 검색과 문의 연결용으로 유지한다. 본문의 기본 사양표는 전체 표로 교체해 중복하지 않는다.

기존 문서의 '냉매·보호 설정 등을 생략' 방침은 이 요청에 따라 변경되었다. 표는 기존 자료의 값과 단위를 그대로 표시하며 최신 공급 사양으로 재검증되었다는 의미는 아니다. 특히 냉수량 ㎡/h 오기 가능성과 냉매 R-22 및 작동치의 현행 적용 여부는 내부 확인 항목으로 유지한다. 원본 4모델 표의 압축기 형식 셀 colspan=6은 6모델 표에서 복사된 구조 오류로 판단되어, 표시할 때 실제 4개 모델 열 폭에 맞춘다. 원본 구조 데이터는 수정하지 않는다.


## 냉각탑 특징 복원 (2026-10-16)

기존 사이트 pro01~04 본문과 비교해 `src/product-features.ts`에 사각 6개·밀폐형 6개·직교류 8개·원형 5개 특징을 수록했다. 제품 사진 다음, 사양표 전에 '제품 특징'으로 배치한다. 밀폐형은 공기·공정 유체·외부 살수 회로의 구조 3항목 및 적용 분야 4항목도 복원했다.

비산율 0.02%, 비교 대상이 불명확한 절전·저소음·비용 우위, 반영구적 수명, 완전한 무오염, 내진·난연 관련 포괄 보장 표현은 수치 보증 대신 구조와 검토 조건으로 편집했다. 원형 충진재의 PP/PVC 고온 적용은 원본의 소재 설명을 보존하면서 실제 수온별 적합성 확인 항목으로 다룬다. 냉각탑 원본에 있던 각 특징 주제는 모두 반영했으며 제조사 시험값을 새로 만든 것은 없다.
