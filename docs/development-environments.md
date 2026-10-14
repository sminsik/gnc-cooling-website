# Mac·Ubuntu 개발 환경

기준일: 2026-10-14. 저장소 루트는 Ubuntu에서 `/home/sminsik/projects/gnc-cooling-website`입니다. 공통 실행 순서는 [README](../README.md)를 따릅니다.

## 공통 버전과 실행 범위

- Node.js **24.21.0**: `.nvmrc`와 `package.json`의 `engines.node`에 고정합니다.
- pnpm **12.11.2**: `engines.pnpm`과 `packageManager`에 고정합니다.
- 각 컴퓨터에서 `nvm alias default 24.21.0`을 설정하고 프로젝트에서는 `nvm use`를 실행합니다. nvm 기본값은 사용자 환경 설정이므로 Git으로 공유되지 않습니다.
- `pnpm install --frozen-lockfile`은 기존 잠금 파일 기준으로 설치합니다. `latest` 및 범위 의존성이 있어도 이 명령에서는 새 버전으로 갱신하지 않습니다.
- 공통 순서: 버전 선택 → 패키지 설치 → UI 빌드 → 로컬 DB 마이그레이션 → 코드 검사 → `pnpm dev`.
- `pnpm test`는 메모리 DB 및 격리된 임시 DB를 사용합니다. `pnpm build`는 UI 빌드와 Wrangler dry-run이며 실제 배포가 아닙니다.

## 환경별 준비 상태

| 대상 | 기존 Mac 기록 (2026-10-10~11) | Ubuntu 확인 상태 (2026-10-14) |
| --- | --- | --- |
| 공개 미리보기 | 공개 페이지·스타일·UI 및 개발 시험 기록 있음 | `/`와 `/style-guide` HTTP 200. 기존 서버 유지 |
| 로컬 데이터 | 시연 데이터 생성 스크립트 있음. 각 시점 데이터 수는 당시 문서 기록 | D1 마이그레이션 0001~0012 적용. 제품·사례·자료·공지·파일·고객 문의 0건 |
| 직원 인증 | `mvp-c-local.md` 최신 기록에 로컬 책임자 활성화 있음. 앞선 초대 중 기록은 이전 상태 | 직원·초대·비밀번호·세션 0건. `.dev.vars`·`.dev.vars.c-local` 없음 |
| 직원 HTTPS | 개발용 인증서와 `https://localhost:8788` 검증 기록 | 지정 경로 인증서·개인키 없음. 공개 HTTP 미리보기와 별도 준비 필요 |
| 파일 검사 | macOS ClamAV 1.5.4·정의 파일·Python 가상환경·실제 검사 기록 | 프로젝트 가상환경 Python 3.14.4·Pillow 12.3.0·pikepdf 10.16.0, ClamAV 1.5.4·공식 정의 파일·공유 키 준비. [검증·한계](local-scanner.md) |
| D1·R2 | 로컬 개발 바인딩과 시험 기록 | 로컬 바인딩 사용. 실제 개발용 클라우드 연결은 미확인 |
| 이메일·공개 배포 | 실제 이메일 연결·운영 배포 미실시 기록 | 메일 바인딩·관련 비밀 설정 없음. 외부 미리보기 배포는 미확인 |
| 백업·복구 | `.work/backups/`에 단계별 로컬 DB 백업 기록 | 과거 백업은 미포함. 2026-10-14 로컬 D1·R2 백업과 격리 복원 검증 완료. [명령·결과·한계](local-backup.md) |

Mac의 로컬 DB·직원 계정·비밀값·인증서·검사 실행 파일은 Git으로 동기화되지 않습니다. Mac 기록을 Ubuntu 준비 완료로 해석하지 않습니다. 기존 문서의 OIDC 선택 및 인증·검사 미정 기록도 해당 시점의 이력으로 보존합니다.

## 저장소 밖 자료와 경로

기존 Mac 프로젝트는 `/Users/sminsiik/Documents/Codex/Project/gnc-cooling` 아래의 `website/`에서 개발했습니다. 현재 Git 저장소는 그 웹 프로젝트를 루트로 사용합니다. 저장소 및 Ubuntu의 `/home/sminsik/projects`에서 기존 `outputs/` 검증 기록·계획 자료를 확인하지 못했으므로 해당 참조를 **자료 미포함, 원문 미확인**으로 표시합니다. 비슷한 이름의 문서로 원문 증빙을 대체하지 않습니다.

현재 HTTPS 명령은 저장소의 **상위 폴더**에 있는 `../.work/c-local/`을 참조합니다. 기존 문서의 `.work/c-local/` 표기는 Mac의 상위 프로젝트 루트 기준입니다. Ubuntu에서는 `/home/sminsik/projects/.work/c-local/`에 해당하지만 HTTPS·직원 자료는 없습니다. 파일 검사 명령은 2026-10-14부터 Mac은 기존 경로를 보존하고 Ubuntu는 저장소의 `.local-scanner/`를 사용합니다.

`docs/` 내부의 구현·연결 계약 문서는 저장소에 있습니다. `outputs/` 원문 증빙, `.work/` 비공개 자료 및 백업은 저장소에 포함하지 않았습니다. 해당 자료 확보나 환경 구성은 별도 작업으로 진행합니다.

## 이번 정비의 범위

버전 고정과 문서 정비, 패키지 설치·UI 빌드·코드 검사·자동 시험·배포 없는 빌드를 수행했습니다. 로컬 DB 마이그레이션·시연 데이터 생성·직원 등록·비밀값 설정·외부 서비스 연결·실제 배포는 수행하지 않았습니다. 기존 서버는 재시작하지 않았습니다.

| 검증 | 결과 |
| --- | --- |
| 기존 Node 경로를 상속하지 않는 새 대화형 Bash 셸 | Node.js v24.21.0, pnpm 12.11.2, nvm default v24.21.0 |
| `pnpm install --frozen-lockfile` | 통과. 프로젝트 의존성 버전 유지. pnpm 12.11.2 도구 잠금 메타데이터 추가 |
| `pnpm ui:build` / `pnpm check` | 통과 |
| `pnpm test` | 122개 통과, 실패 0개. 실제 업무 DB·계정과 격리 |
| `pnpm build` | UI 빌드 및 Wrangler dry-run 통과, 실제 배포 없음 |
| README·docs의 로컬 Markdown 링크 확인 | 누락 링크 0개. 미포함 원문 참조는 경로와 상태를 텍스트로 보존 |
| 기존 로컬 DB 읽기 전용 확인 | 마이그레이션 12개 유지, 업무 데이터·직원·초대·비밀번호·세션·고객 문의 0건 유지 |
