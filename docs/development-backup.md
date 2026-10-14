# 개발용 원격 D1·R2 백업과 격리 로컬 복원

대상은 `gnc-cooling-development` D1과 `gnc-cooling-development-files` Standard 비공개 R2입니다. 기존 [로컬 백업](local-backup.md)은 `.wrangler/`용이며 이 원격 백업과 별개입니다. 운영 자원에는 사용하지 않습니다.

## 준비와 실행

저장소의 Node.js·pnpm 버전과 패키지 설치, Python 3.11 이상 표준 라이브러리 `tomllib`, 기존 Wrangler OAuth 로그인이 필요합니다. 실제 개발 설정은 Git 제외 파일 `configs/wrangler.development.jsonc`에 유지합니다. Access 읽기 토큰은 사용하지 않습니다. 스크립트는 해당 계정·Worker·D1·R2 이름을 고정 검사하고, 원격 D1 ID가 설정과 일치하는지 재조회합니다. 다른 계정이나 자원으로 바꾸는 명령 인자는 없습니다.

```sh
nvm use
node scripts/development-backup.mjs backup
```

출력은 성공 여부·저장 경로·검증 요약만 표시합니다. SQL·행 내용·R2 키/메타데이터·토큰·Wrangler export의 임시 서명 URL은 출력하지 않습니다. 원격 작업은 계정/D1 조회, 읽기 전용 SELECT/PRAGMA, D1 export와 R2 GET뿐입니다. D1 export API의 HTTP POST는 export 작업 요청이며 데이터 입력이나 마이그레이션이 아닙니다. 원격 복원·삭제·업로드 명령은 제공하지 않습니다.

**D1 export 중 DB 조회가 잠시 불가능할 수 있습니다.** 로컬 서버와 개발 Worker를 중지하거나 설정을 바꾸지 않지만, 원격 연결 점검은 그동안 실패할 수 있습니다. 일반 업무 쓰기를 잠근 현재 개발 미리보기에서 실행하고, 다른 사용자의 대시보드·CLI 쓰기 작업도 피하세요. D1과 R2를 하나의 트랜잭션으로 백업할 수는 없습니다.

## 저장과 검증 기준

- 백업: `.cloudflare-backups/<UTC 시각>-<ID>/`
- 자동 격리 복원: `.cloudflare-restore-tests/remote-<ID>/`
- 디렉터리 `0700`, 백업·복원 파일 `0600`, CLI의 umask `077`. Git 제외 경로만 사용하며 symlink 경로를 거부합니다.
- `d1.sql`: 전체 export. `manifest.json`: 시각·소스 커밋·작업 트리 변경 유무·Node/Wrangler 버전·잠금 파일 SHA-256·자원 식별 정보·스키마·테이블별 행 수·R2 메타데이터와 파일 SHA-256.
- `r2/<키의 SHA-256>.bin`: 객체 본문. 객체 키를 로컬 경로로 사용하지 않아 `../`나 유니코드 키도 파일 경로를 벗어나지 않습니다. 키와 파일의 대응은 비공개 manifest에 저장합니다.

백업 전후 D1의 테이블·열·인덱스·외래키·스키마 SQL·각 테이블 행 수, `quick_check`와 `foreign_key_check`를 비교합니다. R2는 모든 페이지의 키·크기·ETag·HTTP/사용자 메타데이터·저장 클래스·수정 시각을 수집하고 백업 후 목록을 재조회합니다. 객체 본문은 ETag·크기·SHA-256으로 확인합니다. 실제 API는 빈 버킷에서 페이지 정보를 생략할 수 있습니다. 빈 배열만 이 예외로 허용하며 비어 있지 않은 응답의 페이지 정보가 없거나 커서가 반복되면 완료 판정을 거부합니다.

자동 복원은 새로운 SQLite 파일에만 SQL을 적용합니다. Cloudflare에 연결하지 않고 export 후 꺼진 외래키 검사를 다시 켜며 `integrity_check`, `quick_check`, `foreign_key_check`와 스키마·행 수 전체를 비교합니다. `d1_migrations` 이력도 포함하고 `_cf_*`·`sqlite_*` 서비스 내부 객체는 비교에서 제외합니다. R2 본문은 새 폴더에 복사해 체크섬을 비교하고 `r2-manifest.json`에 메타데이터를 보존합니다. 복원 검증이 통과해야 백업 manifest의 `verified`가 `true`가 됩니다. 없거나 `false`인 백업과 `verification.json` 없는 실패한 복원 폴더를 정상 완료로 취급하지 않습니다.

## 재복원과 가상 파일 시험

출력된 실제 백업 경로와 사용하지 않은 새 이름을 지정합니다.

```sh
node scripts/development-backup.mjs restore \
  .cloudflare-backups/실제-백업폴더 restore-check-new

node --test tests/development-backup.test.mjs
```

재복원은 `.cloudflare-restore-tests/restore-check-new/`에만 수행하며 기존 폴더와 실제 `.wrangler/` 경로를 거부합니다. 백업 파일의 크기·체크섬·경로·symlink를 먼저 검사합니다. SQL/manifest는 신뢰할 수 있는 본인이 만든 사본만 사용하세요. 체크섬은 손상 탐지용이며 manifest 변조까지 막는 서명이 아닙니다.

가상 시험은 실제 개발 설정·OAuth 없이 새 로컬 SQLite와 Miniflare R2를 사용합니다. 텍스트·이진·빈 파일 3개, 유니코드·경로 모양 키와 사용자/HTTP 메타데이터를 백업 형식으로 저장하고 복원한 후 로컬 R2에서 목록·바이트·메타데이터를 다시 조회합니다. 이 로컬 시험의 `bucket.put`은 가상 버킷만 대상으로 합니다. 기존 경로·스키마/행 수 불일치·손상 파일·symlink·경로 탈출·암호화 객체·잘못된 페이지 응답의 거부도 검사합니다. `pnpm test`와 CI에 이 회귀 테스트가 포함됩니다.

실제 버킷이 비어 있으면 실제 파일 다운로드·원격 파일 복원 성공으로 표시하지 않습니다. R2 메타데이터는 파일과 함께 보관되지만, 실제 서비스로 재업로드 시 원래 업로드 시각·ETag·버전이 유지된다고 가정하지 않습니다. 버킷 정책·CORS·수명 주기·multipart 미완료 파일·고객 제공 암호키는 복원 범위 밖입니다. 원격 R2 재업로드나 D1 복구 전환에는 별도의 승인과 접근/업무 잠금·현재 권한/삭제 기록 검토가 필요합니다.

## 보관과 삭제

현재는 수동 백업이며 자동 예약/업로드는 없습니다. 개발 데이터 변경 전 백업과 변경 후 복원 시험을 권장합니다. 검증된 최근 사본 3개를 우선 보관하고, 30일보다 오래된 사본은 유효한 대체 사본과 정책을 확인한 후 수동 삭제하는 것을 초기 기준으로 제안합니다. 계정·세션·문의·첨부가 생기면 개인정보 보관/파기 기준을 먼저 확정하세요. 스크립트가 자동으로 삭제하거나 보관 정책을 강제하지 않습니다.

삭제 전 manifest의 `verified`와 복원 결과를 확인하고 정확한 경로 하나를 선택하세요. 예를 들어 `rm -r -- .cloudflare-backups/선택한-백업폴더` 또는 `rm -r -- .cloudflare-restore-tests/선택한-복원폴더`를 직접 실행합니다. 와일드카드나 `.wrangler/`를 사용하지 않습니다. 이 명령은 **문서 안내이며 이번 작업에서는 백업을 삭제하지 않았습니다.** 일반 파일 삭제는 SSD/스냅샷의 완전 삭제를 보장하지 않습니다.

백업은 암호화하지 않았으며 데이터 자체에 비밀/개인정보가 있을 수 있습니다. 같은 컴퓨터의 백업은 컴퓨터 고장에 대비한 외부 백업과 별개입니다. 별도 매체에 암호화한 사본을 보관하고 외부 사본 복원도 검증해야 하며 이번 작업에서는 외부 저장을 구성하지 않았습니다.

## 한계와 공식 자료

현재 도구는 객체당 64 MiB, 총 본문 1 GiB의 제한을 두고 본문과 SQL을 메모리에서 검사합니다. 제한 초과·고객 제공 암호키·미지원 응답은 중단합니다. 대규모 데이터·진행 중 업로드·가상 테이블·다른 Wrangler/SQLite 버전은 별도 검증이 필요합니다. 백업 전후 행 수/스키마/목록 비교는 같은 행 수를 유지한 동시 데이터 수정이나 중간 상태 변경까지 탐지하지 못하며 서비스 간 원자성을 보장하지 않습니다. 쓰기 없는 개발 환경에서만 현재 절차를 사용하세요. D1 export는 Cloudflare의 논리 SQL 백업이며 플랫폼 내부 스냅샷·Time Travel 보관을 대체하지 않습니다.

읽기/export도 D1 읽기와 R2 목록/다운로드 요청 사용량에 포함될 수 있습니다. 요금제 전환이나 추가 서비스 가입은 없습니다. 최신 범위는 [D1 export 공식 문서](https://developers.cloudflare.com/d1/best-practices/import-export-data/), [Wrangler D1 명령](https://developers.cloudflare.com/workers/wrangler/commands/d1/), [R2 목록 API](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/objects/methods/list/), [R2 객체 GET API](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/objects/methods/get/)를 참고하세요.

## 2026-10-14 검증 결과

최종 백업·복원 실행 결과는 아래에 기록합니다. 실제 SQL·메타데이터·계정 데이터는 제외 경로에서만 보관합니다.

| 확인 항목 | 결과 |
| --- | --- |
| 대상 계정·D1 이름/ID·R2 | 개발 설정과 일치. R2 Standard·공개 URL 꺼짐·사용자 지정 도메인 0개 |
| 실제 D1 backup → 새 로컬 SQLite | 앱 테이블 41개·열 346개·명시 인덱스 19개 및 마이그레이션 이력 테이블 일치 |
| 원본/복원 행 수 | 마이그레이션 12건·기본 제품군 3건·나머지 업무 테이블 0건, 테이블별 비교 통과 |
| 무결성 | 원격/로컬 quick check 정상·외래키 위반 0, 로컬 integrity check 정상 |
| 실제 R2 | 백업 전후 파일 0개·비공개 일치. 실제 파일 다운로드/원격 재업로드 검증은 해당 없음 |
| 별도 가상 R2 복원 | 텍스트·이진·빈 파일 3개와 HTTP/사용자 메타데이터, 목록·본문 SHA-256/바이트 비교 통과 |
| 회귀/전체 검사 | 새 회귀 테스트 3개, 전체 자동 테스트 131개·코드 검사·UI 빌드·배포 없는 빌드 통과. 실제 개발 설정·백업 없는 임시 코드 복사본에서 실행 |
| 파일 보관 | 실제 백업 디렉터리 0700·파일 0600·Git 제외 확인 |

실제 백업은 `.cloudflare-backups/2026-10-14T08-42-06-996Z-7ffb7b12/`, 자동 복원은 `.cloudflare-restore-tests/remote-a9329496/`입니다. manifest의 소스 커밋은 `ff02e32`이며 스크립트·문서 작성 중 실행했으므로 작업 트리 변경 있음으로 기록됐습니다. 실제 백업과 가상 시험 자료를 Git에 포함하지 않습니다. 원격 데이터 입력·덮어쓰기·자원 생성·배포·요금제 변경·백업 삭제는 수행하지 않았습니다.
