# 전체 로컬 개발 환경 · 2026-10-15

## 기본 실행

`Start-Local-Development.command`를 더블클릭합니다. 기본 Node 경로가 없으면 기존 Codex Node를 사용합니다.

- 전체 앱: https://localhost:8788/
- 직원 로그인: https://localhost:8788/admin/login
- 스타일 가이드: https://localhost:8788/style-guide
- http://127.0.0.1:8787/ 의 예전 주소는 전체 앱으로 이동합니다. 실행 중인 별도 디자인 서버가 있으면 먼저 종료합니다.
- 실제 소스: /Users/sminsiik/Documents/Codex/Project/gnc-cooling/website
- DB: .wrangler/state 아래 로컬 D1
- 파일: .wrangler/state 아래 로컬 R2
- 검사기: 127.0.0.1:8790, 프로젝트 .work/c-local의 기존 ClamAV/정의 파일/비공개 키 사용

실행기는 기존 앱/검사 프로세스가 있으면 재사용합니다. 종료 시 자신이 시작한 프로세스만 종료합니다. 기존 프로세스의 설정을 바꾼 경우 해당 프로세스를 종료한 뒤 다시 실행합니다. 기존 DB 초기화나 마이그레이션은 자동 실행하지 않습니다. 로컬 인증서는 시스템 신뢰 설정을 변경하지 않았습니다.

## 현재 검증

- /api/health: database/files connected
- 기존 로컬 D1에 비활성 시험 분류 저장 → 별도 실행에서 조회 → 시험 행 삭제. 기존 회사 데이터 유지.
- 기존 로컬 R2에 시험 파일 저장 → 다운로드 → 원본 바이트 비교 → 시험 객체 삭제.
- 실제 ClamAV: 정상 PNG/JPG/WebP/PDF 통과, 암호화/JavaScript/첨부 PDF·EICAR·손상 PDF 차단. 실제 서비스 binding → 검사 → ready 전환은 기존 시험의 격리 메모리 DB와 파일 객체로 확인. 실제 관리자 업로드 UI와 기존 D1/R2를 한 번에 통과하는 통합 시험은 미실시.
- 직원 계정/해시/권한: DB 기반 비밀번호 인증. 기존 활성 책임자 1명 확인, 로그인 화면 200. 기존 계정의 실제 로그인은 비밀번호를 입력하는 사용자 검수가 남음.
- Access: 로컬 비적용. 원격 비공개 개발 배포 전 적용 및 미인증 차단 검증 필수.
- 자동 타입 검사와 테스트 136개 통과.

## 메일/문의 연결의 남은 조건

Resend 연결 코드는 Cloudflare Email Service REST 어댑터로 변경했습니다. 실제 API 키/계정/발신 주소는 미설정이며 발송하지 않았습니다. `dev/mailer/local-vars.example`의 변수 이름을 참고하되 실제 비밀 설정은 Git에서 제외되는 `.dev.vars.c-local`에만 입력합니다. 기존 비공개 파일은 덮어쓰지 않았습니다.

필요 값: CF_EMAIL_API_TOKEN, CF_EMAIL_ACCOUNT_ID, MAIL_FROM, MAIL_TEST_TO, MAIL_LINK_ORIGIN. 어댑터는 지정한 시험 수신자만 허용하며 불명 발송 결과는 자동 재전송하지 않습니다. 발송 상태 조회는 unknown이므로 자동 상태 복구 완료로 보지 않습니다.

공식 문서: https://developers.cloudflare.com/email-service/get-started/send-emails/
Cloudflare DNS 및 발신 도메인 설정이 필요합니다. 현재 회사 DNS 변경 요청이 없으므로 이를 수행하지 않았습니다. 실제 발송·수신 통합 시험은 해당 조건 충족 후 진행합니다.

고객 접수는 메일·스팸 방지·시험 안내 설정이 준비되기 전 계속 닫힙니다. 실제 운영 고객 접수 활성화와 로컬 시험용 접수는 구분합니다. 전체 앱은 실제 코드/로컬 저장소를 사용하지만 메일/접수 등 모든 외부 서비스까지 연결 완료된 상태는 아닙니다.

기존 로컬 DB·인증 설정 보존. GitHub 업로드·원격 배포·회사 DNS 변경 없음.

## 로컬 서버 종료 진단 기록 · 2026-10-15

현재 실행기는 `../.work/local-runtime-logs/`에 세션별 JSONL을 저장한다. 시작 PID/부모 PID/Node 버전, 앱·검사기 출력, 하위 프로세스 종료 코드와 신호, 실행기의 SIGINT/SIGTERM/SIGHUP, 예외, 15초 주기의 HTTPS 건강상태·검사 포트·메모리·기록 간격을 남긴다. sessions.jsonl은 세션과 파일 위치 색인이다. 설정 파일의 값과 URL 쿼리/토큰은 로그에서 마스킹한다. 로그는 Git 밖의 비공개 로컬 작업 폴더에 저장한다.

이번 중단은 이전 Wrangler 로그가 한국시간 14:50:17 정상 런타임 상태 확인 후 종료 기록 없이 끊겼고, 관련 macOS 충돌 보고서는 발견되지 않았다. 이전 실행기는 종료 신호·부모 프로세스·상태 기록을 남기지 않아 원인 확정 불가. 실행 세션 정리/부모 프로세스 종료/외부 강제 종료 가능성과 앱 오류를 구분할 증거가 부족하다.

SIGKILL·전원 종료처럼 기록 프로세스 자체가 즉시 사라지는 경우 종료 원인을 직접 쓸 수 없다. 마지막 heartbeat와 다음 시작 시각을 시스템 진단 기록과 대조해야 한다. 이 기능은 원인 추적용이며 자동 재시작·상시 서비스 등록을 뜻하지 않는다.

## 재중단 분석 · 2026-10-15 후속

세션 8103의 마지막 heartbeat는 2026-10-15 15:34:52 KST: 홈페이지 /api/health 200, 검사 포트 정상, 실행기 RSS 76,283,904바이트(약 73MiB), 주기 15,001ms. supervisor-signal/exit, child-exit, 예외 기록 없이 모든 로컬 서비스 프로세스 소멸. 마지막 상태는 정상이지만, 외부 강제 종료의 주체/원인은 확정할 수 없다. 이전 실행기는 도구 실행 부모 PID 1577에 연결되어 있었다.

재발 완화: macOS Terminal 앱으로 Start-Local-Development.command를 실행하여 채팅 도구 실행 세션과 프로세스 계통을 분리했다. 새 실행기 PID 9191, 부모 셸 PID 9188, Terminal 앱 PID 9179(부모 1). /api/health DB/R2 정상 확인. 터미널 창을 닫거나 Control+C를 누르면 로컬 서비스는 종료될 수 있으므로 개발 중 실행 창을 유지한다. 시스템 상시 서비스/자동 재시작은 등록하지 않았다.
