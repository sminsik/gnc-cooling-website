# Ubuntu 로컬 HTTPS·가상 직원·시연 콘텐츠 통합 검증

2026-10-14. 실제 책임자 등록·고객 접수·외부 이메일 발송·Cloudflare 원격 연결·운영 배포와 구분합니다.

## 실행 중인 환경과 저장소 분리

| 대상 | 주소/경로 | 용도 |
| --- | --- | --- |
| 기존 공개 미리보기 | `http://127.0.0.1:8787/` | 기존 `.wrangler/state/` 사용, 기존 업무 데이터·직원·문의 0건 유지 |
| HTTPS 시연 홈페이지 | `https://localhost:8788/` | 별도 `.local-https/state/` D1·R2, 가상 콘텐츠만 사용 |
| HTTPS 직원 로그인 | `https://localhost:8788/admin/login` | 실제 비밀번호 인증 코드·Secure 쿠키·출처/CSRF·역할 검사 |
| 실제 검사 서비스 | `127.0.0.1:8790` | 실제 ClamAV·공식 정의 파일. [검사 환경](local-scanner.md) 참고 |

정확히 `https://localhost:8788`을 사용합니다. 인증서는 127.0.0.1도 포함하지만 인증 origin과 다른 주소로 로그인하면 출처 검사를 통과하지 못할 수 있습니다. 모든 서버는 loopback에만 바인딩합니다.

이번 작업 전 기존 공개 서버만 잠시 중지하고 D1·R2를 `.local-backups/20261014T033803.977470Z-8b300ad5/`에 백업했습니다. 소스 커밋은 `f914074`입니다. 기존 서버는 백업 후 다시 실행했습니다. 백업을 새 `.local-https/state/`에 복원해 원본을 덮어쓰지 않았습니다. 원본의 최초 책임자 등록 잠금도 가상 관리자에게 사용하지 않았습니다.

현재 HTTPS 시연 저장소에는 가상 관리자와 콘텐츠 전용 직원 2명이 활성화되어 있습니다. 실제 책임자 계정은 등록하지 않았습니다. 공개 가상 제품 3개·사례 1개·자료 1개·공지 1개를 준비했으며 모두 `[개발 예시]`로 표시합니다. 파일은 실제 검사 완료 6개·차단 1개이고 대기 검사 작업은 0개입니다. 탐색 시험 중 남은 새 가상 제품 초안 1개는 정상 관리자 UI의 복구 가능한 삭제로 정리해 감사 기록을 보존했습니다. 고객 문의·메일 발송 대기·직원 알림은 모두 0건입니다.

## HTTPS 준비와 Mac 실행 보존

`pnpm dev:https`는 플랫폼별 실행기를 사용합니다.

- **Ubuntu:** `.local-https/localhost.key`, `localhost.crt`, 별도 `.local-https/state/`를 사용합니다.
- **기존 Mac:** 기존 `../.work/c-local/localhost.key`, `localhost.crt` 및 기본 `.wrangler/state/` 실행 방식을 그대로 사용합니다. 기존 Mac 계정·설정·짧은 개발 비밀번호 이력은 이 작업에서 변경하지 않았습니다.
- 다른 경로가 필요하면 `HTTPS_WORK_DIR`로 인증서 폴더, `HTTPS_PERSIST_TO`로 저장소를 명시합니다. 이번에 실제 실행 검증한 OS는 Ubuntu이며 실제 Mac 재실행은 미확인입니다.

Ubuntu 전용 시연 준비 순서입니다. 먼저 기존 자료를 [백업](local-backup.md)하고 실제 출력된 백업 폴더를 지정합니다. `--destination`은 존재하지 않는 새 경로여야 합니다.

```sh
nvm use
python3 scripts/local-backup.py restore .local-backups/백업폴더 --destination .local-https/state
node scripts/setup-local-https.mjs --virtual-demo
node scripts/prepare-demo-admin.mjs
# 별도 터미널에서 실제 검사 서비스 실행
pnpm scanner:local
# 별도 터미널에서 HTTPS 앱·검사 어댑터 실행
pnpm dev:https
```

이미 준비된 이 컴퓨터에서는 복원·설정·초대를 다시 생성할 필요 없이 `pnpm scanner:local`, `pnpm dev:https`를 실행합니다. 이미 실행 중이면 중복 실행하지 않습니다. 설정과 계정 준비 스크립트는 기존 파일·키·계정을 덮어쓰지 않으며 실제 직원이 있는 저장소에는 가상 초기 초대를 만들지 않습니다.

인증서는 OpenSSL로 만든 30일 유효 localhost 개발 인증서입니다. 개인키·인증서·가상 로그인 정보·초대 링크·시연 DB·브라우저 결과는 `.local-https/`에, 인증 설정은 `.dev.vars.c-local`에 저장합니다. 폴더 0700·민감 파일 0600을 적용하고 모두 Git에서 제외합니다. 비밀번호와 키 값은 출력하지 않습니다. 가상 로그인 정보는 본인 컴퓨터의 `.local-https/demo-credentials.json`에서만 확인하며 채팅·문서·Git에 붙이지 않습니다.

`setup-local-https.mjs`는 비밀번호 방식·정확한 HTTPS origin·32바이트 무작위 제한 키를 준비하고 짧은 비밀번호 예외를 켜지 않습니다. 비밀번호는 무작위로 생성해 기본 15자 이상 정책을 충족합니다. 초대는 기존 `initial-admin-local.mjs`와 `initialAdminPlan/applyInitialAdmin`을 사용하고 가상 옵션은 정해진 격리 경로·가상 이름·시험 도메인·비공개 출력에서만 허용합니다. 비밀번호 해시·활성 계정·세션을 직접 DB에 넣지 않습니다. 초대 수락과 로그인은 실제 HTTPS 화면에서 수행합니다.

읽기 전용 준비 상태 확인은 저장소를 명시합니다.

```sh
pnpm setup:check --password-local --persist-to .local-https/state
```

## 인증서 신뢰

운영체제·사용자 Chrome의 인증서 신뢰 저장소는 변경하지 않았습니다. 일반 브라우저에서는 자체 서명 인증서 경고가 표시될 수 있으며 localhost 개발 인증서라는 점과 인증서 대상/지문을 확인해야 합니다.

경고 없이 수동 검수하려면 별도 개발 CA를 마련해 그 CA로 localhost 인증서를 발급하고, Ubuntu의 시스템 신뢰 및 사용하는 브라우저의 인증 기관 저장소에 **개발 CA만** 가져오는 절차가 필요합니다. 시스템 신뢰 변경은 관리자 승인이 필요한 별도 작업입니다. 이 문서는 자동 설치하지 않으며 현재의 `CA:FALSE` 서버 인증서를 개발 CA로 가져오라고 안내하지 않습니다. Mac에서도 동일하게 개발 CA와 키체인 신뢰를 별도 관리해야 합니다.

이번 자동 브라우저 시험은 실제 Chrome을 사용하고 **현재 개발 인증서의 공개키 지문 하나만** 시험 프로세스에 허용했습니다. 전체 TLS 오류 무시나 앱의 HTTPS·출처·CSRF·비밀번호·역할 검사를 해제하지 않았습니다. 일반 사용자 브라우저의 OS 신뢰 완료를 뜻하지 않습니다.

## 시연 데이터와 기존 스크립트 검토

기존 `seed-local-demo.mjs`는 Mac 절대 Python 경로와 Git 밖 검사 증빙에 의존하며 DB에 ready 파일을 직접 등록하고 가상 문의도 만듭니다. `enrich-local-demo.mjs`는 기존 시연 행을 갱신합니다. 이번에는 해당 스크립트를 실행하지 않았고 기존 Mac 코드는 보존했습니다.

Ubuntu는 `tests/browser-local-https.mjs`에서 실제 로그인 후 관리자 **화면**으로 제품·사례·자료·공지를 신규 생성하고 파일을 등록합니다. 실제 검사 완료 후 대표 사진/PDF를 선택·저장하고 공개합니다. 기존 행을 찾아 덮어쓰는 방식이 아니며 생성한 ID를 Git 제외 `demo-content.json`에 기록합니다. 기존 시연 목록에 등록된 개수만큼 다시 생성하지 않습니다. 시험이 중간에 중단되면 작성 중 행과 파일을 보존하므로 관리자 화면에서 검토한 뒤 재개해야 합니다. 실제 고객 문의나 가상 고객 접수는 생성하지 않습니다.

브라우저 도구는 테스트 전용 `.local-https/tools/`에만 설치했으며 앱 의존성을 추가하지 않았습니다.

```sh
npm install --prefix .local-https/tools --no-save playwright
node tests/browser-local-https.mjs
# 검사 서비스만 Ctrl+C로 중지한 뒤 장애 시험
node tests/browser-local-https.mjs --offline
# 검사 서비스 재시작 후 재시도/복구 시험
pnpm scanner:local
node tests/browser-local-https.mjs --recover
```

Chrome은 Ubuntu에서 `/usr/bin/google-chrome`을 사용하며 `CHROME_PATH`로 실행 파일을 지정할 수 있습니다. Playwright를 다른 경로에 설치했다면 `PLAYWRIGHT_MODULE`을 지정합니다. 실제 브라우저 시험 보고서·화면 캡처는 `.local-https/results/`에만 저장합니다. 요청 가로채기·모의 응답·위조 쿠키는 사용하지 않습니다. 로컬 예약 작업은 자동 cron 완료로 가정하지 않고 실제 `/cdn-cgi/local/scheduled` 개발 엔드포인트를 호출해 검사 작업을 진행합니다.

## 검증 결과와 남은 범위

| 항목 | 판정·근거 |
| --- | --- |
| 작업 전 백업·격리 복원 | 완료. SQLite 무결성 정상·외래키 오류 0·목록/체크섬 일치 |
| 공개 서버·실제 검사 서비스 유지 | 완료. 8787·8788·8790 loopback 실행 확인 |
| HTTPS·가상 인증 | 완료. 실제 Chrome에서 초대 활성화·기본 강한 비밀번호·재로그인·로그아웃 후 API 401 |
| 역할 검사 | 완료. 실제 콘텐츠 직원의 문의/직원 화면 및 직원 API 403 |
| 가상 콘텐츠 | 완료. 공개 제품 3·사례/자료/공지 각 1. 실제 회사 자료로 표시하지 않음 |
| 실제 관리자 정상 업로드 | 완료. 이미지/PDF 업로드→검사 대기→실제 ClamAV→ready→직원 저장→공개 |
| 차단 파일 | 완료. JavaScript가 있는 유효 PDF가 blocked, 공개 다운로드 404 |
| 검사 서비스 장애·복구 | 완료. 서버 중지 시 validating·공개 404 유지, 재시작 후 실제 재검사로만 ready |
| 실제 원본 DB·고객 접수·메일 | 원본 업무 데이터/직원 0건 유지. 시연 DB의 문의·발송 대기·알림 0건, 실제 접수 잠금 유지 |
| 코드 검사·회귀 시험·빌드 | `pnpm check`·자동 시험 123개·실행 스크립트 구문 검사·배포 없는 빌드 통과 |
| 브라우저 화면 | 실제 Chrome 1440/390px 관리자 화면 확인·캡처, 가로 넘침 없음 |
| 실제 책임자·회사 업무 검수 | **미완료**. 실제 담당자의 등록·로그인·역할·회사 파일/업무 검수 필요 |
| OS 인증서 신뢰·실제 Mac 실행 | **미완료/미확인**. 시험 Chrome의 개발 인증서 허용과 구분 |
| 외부 이메일·Cloudflare·배포 | **미실시**. 이번 작업에 포함하지 않음 |

검사 재시도 성공은 파일 자동 공개를 뜻하지 않습니다. 장애 시험으로 추가한 이미지도 대표 사진으로 자동 교체하지 않았습니다. 시연 저장소에도 계정·세션·파일이 있으므로 원본과 동일하게 백업·접근 제한 대상이며 외부 백업·운영 복구 검수는 여전히 후속입니다.
