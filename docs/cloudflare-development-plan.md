# Cloudflare 개발 D1·R2 연결 준비

확인일: 2026-10-14. 초기 계정 점검·설정 준비 후, 사용자의 별도 승인에 따라 개발용 D1·R2 각 1개를 생성했습니다. 이후 별도 승인으로 기존 마이그레이션 12개를 격리 검증·개발 D1 적용했습니다. 추가 업무 데이터 입력, 배포, 공개 접근 활성화는 실행하지 않았습니다. 아래 초기 점검·자원 생성 당시 기록과 최신 적용 결과를 구분합니다.

## 초기 계정 확인 기록 — 개발 자원 생성 전

초기 점검에서는 Ubuntu Wrangler 인증이 없었으나, 사용자의 브라우저 로그인 후 읽기 전용 재점검에서 **인증 성공·계정 1개**를 확인했습니다. 단일 계정이므로 여러 계정 중 임의 선택은 없었습니다. 계정 ID·이메일·토큰·CLI 원문은 문서에 저장하지 않습니다.

| 항목 | 실제 확인 결과 | 미확인 범위 |
| --- | --- | --- |
| Wrangler 인증·계정 | 인증 성공, 계정 목록 1개, 해당 계정에서 조회 | 계정의 세부 권한/역할, 다른 조직 계정의 존재 |
| D1 목록 | 조회 성공, 0개; 제안 개발 DB 이름 없음 | 새 DB 생성 권한, 요금제·잔여 할당량 |
| R2 목록 | 조회 실패: API 오류 10042와 대시보드 R2 활성화 요구 확인 | 기존 버킷 목록/개수·제안 이름 충돌 여부 |
| R2 사용 준비 | 현재 API가 R2 사용 활성화를 요구하므로 준비 완료로 처리하지 않음 | 결제 수단·구독 이력·사용량·활성화 제한 사유 |
| Workers/D1 요금제 | 이번 CLI 목록 응답에서 확인할 수 없음 | Free/Paid 여부·기존 사용량·청구 상태 |
| 운영 서비스·도메인 | 이번 점검에서 조회/변경하지 않음 | 기존 운영 자원·공개 정책 |

10042는 공식 문서의 `NotEntitled` 오류입니다. 활성화 요구가 기존 버킷의 부재나 결제 수단 미등록을 증명하지는 않습니다. 대시보드의 R2 구독/결제 상태를 소유자가 확인한 뒤 다음 단계를 결정해야 합니다. 이번에는 활성화·결제 변경을 실행하지 않았습니다. [R2 오류 코드](https://developers.cloudflare.com/r2/api/error-codes/)

아래 자원 이름은 제안이며 R2 이름의 사용 가능 여부와 소유 관계는 사용 준비가 완료된 뒤 다시 확인해야 합니다.

## 환경 분리와 자원 계획

| 환경 | 설정·데이터 | 연결 및 공개 정책 |
| --- | --- | --- |
| 로컬 | 기존 `wrangler.jsonc`, `.wrangler/state/`; HTTPS 시연 `.local-https/state/` | 기존 실행 명령·DB·R2 유지. 로컬 검사 127.0.0.1:8790만 사용 |
| 개발 | `configs/wrangler.development.example.jsonc` → Git 제외 `configs/wrangler.development.jsonc` | 전용 D1 1개 `gnc-cooling-development`, Standard R2 1개 `gnc-cooling-development-files`. 운영과 다른 자원 ID 사용 |
| 운영 | `configs/wrangler.production.example.jsonc`는 구조 제안만 제공 | 기존 운영 계정·자원·도메인 미확인. 제안 이름으로 기존 운영을 교체하거나 새 운영 자원을 만들지 않음 |

가능하면 개발 전용 계정을 선택합니다. 같은 계정에서 이름만 분리하는 것은 권한 격리를 보장하지 않습니다. 개발 계정에도 기존 자원이 있을 수 있으므로 소유자·용도·요금제를 먼저 확인합니다. 지역은 APAC 배치 힌트를 검토하되 한국 내 저장 보장으로 취급하지 않습니다. 실제 고객 자료·운영 데이터·로컬 계정·비밀 설정은 복사하지 않습니다. [D1 위치](https://developers.cloudflare.com/d1/configuration/data-location/), [R2 위치](https://developers.cloudflare.com/r2/reference/data-location/)

템플릿은 각각 독립 설정 파일이며 루트의 로컬 환경을 상속하지 않습니다. `workers_dev: false`, `preview_urls: false`, `routes: []`, 예약 작업·서비스 바인딩 비어 있음, 관측 로그 비활성 상태입니다. 직원 인증 모드·앱 주소·고객 접수·고객 주소는 빈 값으로 잠겨 있습니다. 검사·메일·메일 상태 조회·스팸 서비스와 관련 비밀값도 연결하지 않습니다. R2의 공개 dev URL과 custom domain은 Worker 설정으로 통제되지 않으므로 생성 후 별도로 비활성 여부를 확인해야 합니다. [Wrangler 설정](https://developers.cloudflare.com/workers/wrangler/configuration/)

필요한 일반 설정은 계정 ID, 개발 D1 UUID/이름, 개발 R2 이름, `DB`/`FILES` 바인딩입니다. ID는 비밀번호가 아니지만 승인된 실제 계정 설정은 Git 제외 파일에만 기록합니다. API 토큰은 셸·비밀 저장소로 공급하며 JSON 설정이나 문서에 적지 않습니다. Workers 바인딩에는 별도 R2 S3 액세스 키가 필요하지 않습니다.

## 인증과 읽기 전용 확인

프로젝트 루트의 버전 선택 후 사용자가 브라우저에서 계정을 확인하고 승인합니다. 최초 준비 때 로그인 명령은 실행하지 않았고, 후속으로 사용자가 브라우저 로그인을 완료했습니다. 아래는 이후 재인증이 필요한 경우의 절차입니다.

```sh
nvm use
pnpm exec wrangler login
# SSH 등 콜백 localhost:8976에 접근할 수 없는 경우 대안:
# pnpm exec wrangler login --device
node scripts/check-cloudflare-account.mjs
```

브라우저 승인 화면의 계정과 요청 권한을 확인하세요. Wrangler OAuth 기본 로그인이 읽기 전용 권한만 요청한다고 가정하지 않습니다. 반복 점검·CI에는 계정 범위를 제한한 읽기 전용 API 토큰을 권장합니다. [Wrangler 로그인](https://developers.cloudflare.com/workers/wrangler/commands/general/#login)

점검 스크립트는 `whoami --json`, `d1 list --json`, `r2 bucket list`만 허용합니다. 토큰·계정 ID·이메일·CLI 원문은 출력하지 않고 인증 여부·계정 이름·자원 이름/개수만 표시합니다. 계정이 여러 개면 자동 선택하지 않습니다. 승인한 계정 ID를 `CLOUDFLARE_ACCOUNT_ID`로 공급해 다시 실행합니다. 설치된 Wrangler 4.149의 R2 목록은 JSON 옵션이 없어 레이블 형식을 해석하며, 조회 실패는 미확인으로 남깁니다. 요금제·R2 구독 상태는 목록만으로 확정할 수 없으므로 대시보드에서 별도 확인합니다.

| 작업 | 필요한 권한의 범위 | 적용 시점 |
| --- | --- | --- |
| 계정·자원 점검 | Account Settings Read, D1 Read, Workers R2 Storage Read; Worker 목록 필요 시 Workers Scripts Read | 인증 후 읽기 전용 확인 |
| 사용자 토큰의 계정 목록 조회 | User Details Read, Memberships Read 등 인증 방식에 필요한 사용자 읽기 권한 | `whoami`가 목록을 얻지 못할 때 확인 |
| 개발 DB·버킷 생성 | 승인된 계정의 D1 Edit, Workers R2 Storage Edit | 별도 생성 승인 후만 |
| Worker 배포 | Workers Scripts Edit 및 필요한 바인딩 권한 | 이번 단계 불필요; 별도 승인 대상 |
| 운영 도메인 변경 | DNS/Zone 쓰기 권한 | 요청하지 않음 |

정확한 권한 이름과 토큰 범위는 [공식 API 권한 목록](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)에서 확인합니다. 계정 단위 D1 Edit 권한은 같은 계정의 운영 D1까지 영향을 줄 수 있으므로 개발 전용 계정 또는 권한 검토가 선행되어야 합니다.

## 최초 적용 계획과 단계별 승인 범위

1. 브라우저 로그인 후 계정 소유·권한을 확인하고 위 읽기 전용 점검을 수행합니다.
2. 기존 자원과 제안 이름의 충돌, 운영 자원의 식별, 계정 요금제·기존 사용량·R2 구독/결제 등록 여부를 확인합니다. 충돌한 자원을 임의로 재사용하지 않습니다.
3. 개발 계정·두 자원 이름·지역 힌트·비용을 확정하고 자원 생성 승인을 받습니다. R2 활성화/결제 등록이 필요하면 그 절차도 별도로 승인합니다.
4. 승인된 계정에 개발 D1 1개와 Standard 비공개 R2 1개만 생성합니다. 기존 루트 설정 자동 갱신을 막기 위해 생성 시 `--update-config=false`를 사용합니다. 운영 자원과 Worker는 생성하지 않습니다.
5. 반환된 계정 ID·D1 UUID·R2 이름을 개발 전용 실제 설정에 기록합니다. 인증 비밀값·검사·메일 바인딩은 추가하지 않습니다.
6. 아래 조회로 이름·ID의 개발 대상 일치, 버킷 공개 주소/도메인 없음, Standard 등급을 확인합니다. 공개 설정이 발견되면 기록하고 승인 범위 없이 변경하지 않습니다.
7. **별도 원격 DB 변경 승인 후** 개발 D1에만 마이그레이션을 적용합니다. 로컬 시연 계정·자료는 자동 가져오지 않습니다. 원격 백업/복구 정책도 이때 마련합니다.
8. 클라우드 검사·메일·인증·비공개 접근 정책을 확정하고 검증한 후에만 기능을 연결합니다. Workers 배포나 Access를 적용한 시험 주소 활성화는 별도 단계입니다.

생성 후 사용할 읽기 전용 명령(개발 자원 생성 전 단계이므로 이번에는 실행하지 않음):

```sh
pnpm exec wrangler d1 info gnc-cooling-development --json --config configs/wrangler.development.jsonc
pnpm exec wrangler r2 bucket info gnc-cooling-development-files --json --config configs/wrangler.development.jsonc
pnpm exec wrangler r2 bucket dev-url get gnc-cooling-development-files --config configs/wrangler.development.jsonc
pnpm exec wrangler r2 bucket domain list gnc-cooling-development-files --config configs/wrangler.development.jsonc
```

조회 결과에는 식별자가 포함될 수 있으므로 공개 문서에 CLI 원문을 복사하지 않습니다. 원격 `migrations list`를 순수 읽기 전용 점검으로 간주하지 않으며 이 단계에서는 원격 SQL 명령을 사용하지 않습니다.

## 클라우드 검사·메일의 선행 조건

Ubuntu의 Python 검사 서버와 ClamAV는 프로세스 실행·로컬 파일·큰 메모리를 사용합니다. Workers의 `127.0.0.1`은 Ubuntu가 아니며, 현재 로컬 어댑터를 원격 바인딩으로 그대로 연결할 수 없습니다. Workers 메모리 한도는 128MB입니다. 별도 검사 서비스의 실행 환경, 비공개 통신, 인증, 자원 제한·비용, 악성 파일 차단, 장애/시간 초과 시 통과 방지와 재시도를 설계해야 합니다. [Workers 한도](https://developers.cloudflare.com/workers/platform/limits/)

현재 템플릿은 직원 로그인 자체가 닫혀 있어 관리자 업로드에 진입할 수 없습니다. 인증을 나중에 연결하기 전에 검사 미연결 업로드를 계속 차단하는 운영 정책/코드 검증이 필요합니다. 검사 대기 상태를 정상 검사 완료로 처리하지 않습니다. 메일 제공자·메일 결과 조회·개인정보 정책·고객 본인 확인·스팸 검수도 확정 전 연결하지 않고 고객 접수 잠금을 유지합니다. 로컬 로그인 시험 통과는 클라우드 로그인·메일·검사 통합 완료를 뜻하지 않습니다. 현재 비밀번호 연산의 Free CPU 한도 적합성도 실측 전 미확인이며 보안을 낮추어 맞추지 않습니다.

## 비용과 무료 범위

2026-10-14 공식 문서 확인, USD 기준. 계정별 기존 사용량과 요금제는 로그인 후 점검에서도 미확인입니다. 아래 할당량을 이 프로젝트만의 별도 무료량으로 계산하지 않습니다.

| 항목 | 무료/포함 범위 | 비용·제약 |
| --- | --- | --- |
| D1 Free | 읽기 500만 행/일, 쓰기 10만 행/일, 계정 저장 총 5GB | Free는 DB당 500MB·최대 10개. 한도 초과 시 요청/쓰기 제한 |
| D1 Paid | 읽기 250억 행/월, 쓰기 5천만 행/월, 저장 5GB 포함 | 초과 읽기 $0.001/백만 행, 쓰기 $1/백만 행, 저장 $0.75/GB·월; Workers Paid 요금 별도 |
| R2 Standard | 저장 10GB·월, Class A 100만/월, Class B 1천만/월 | 초과 저장 $0.015/GB·월, A $4.50/백만, B $0.36/백만; 인터넷 egress 무료 |
| Workers Free | 요청 10만/일, CPU 10ms/요청 | 클라우드 인증/검사 처리 적합성 미확인 |
| Workers Paid | 기본 최소 $5/계정·월, 요청 1천만·CPU 3천만ms/월 포함 | 초과 요청 $0.30/백만·CPU $0.02/백만ms |

출처: [D1 요금](https://developers.cloudflare.com/d1/platform/pricing/), [D1 한도](https://developers.cloudflare.com/d1/platform/limits/), [R2 요금](https://developers.cloudflare.com/r2/pricing/), [Workers 요금](https://developers.cloudflare.com/workers/platform/pricing/).

R2는 Free 범위가 있어도 구독/결제 준비가 필요할 수 있습니다. 무료 초과분은 사용량 과금이며 사용 단위 올림도 적용됩니다. ListBuckets 등 읽기 전용 목록 조회도 R2 Class A 작업량에 들어갑니다. Infrequent Access는 무료 범위가 없고 검색 비용·최소 30일 보관이 있어 이번 제안에서 사용하지 않습니다. [R2 시작 절차](https://developers.cloudflare.com/r2/get-started/)

정적 자산 직접 응답은 Workers 요청/CPU 과금에서 제외되지만, 이 프로젝트는 `run_worker_first: true`이므로 Worker를 거친 페이지 응답까지 전부 무료 정적 호스팅으로 계산하면 안 됩니다. 향후 로그, 검사 호스트/Containers, 이메일, 비공개 접근 제품은 선택한 요금제에 따라 별도 비용을 검토합니다. 최초 준비 단계에서는 가입·플랜 변경·자원 생성을 하지 않았습니다. 이후 사용자가 R2 구독을 활성화하고 개발 자원 생성을 승인한 결과는 아래 후속 기록을 따릅니다.

## 로컬 검증과 유지

```sh
nvm use
node scripts/validate-cloudflare-templates.mjs
node scripts/validate-cloudflare-templates.mjs --dry-run
```

검증기는 공개 URL/라우트·예약 작업·서비스 연결·인증/접수 활성화가 없는지, 환경별 자원 이름/ID 분리와 소스·자산·마이그레이션 경로를 검사합니다. dry-run은 가짜 계정/DB ID로 `.cloudflare-plan/` 아래에 임시 설정과 번들을 만들고 실제 API 인증 환경변수를 제거합니다. `wrangler deploy --dry-run`만 실행하며 배포하지 않습니다. 실제 설정 파일과 이 임시 디렉터리는 Git 제외 상태입니다. 실제 ID를 담은 파일은 이 검증기가 자동으로 검증하지 않으므로 적용 전 별도 검토가 필요합니다.

최초 준비·점검 결과(생성 전): 두 템플릿 정책 검사·Wrangler dry-run·코드 검사 통과, 기존 루트 `wrangler.jsonc` 변경 없음. 후속 계정 점검은 인증 성공·계정 1개·D1 0개를 확인했습니다. R2는 오류 10042 및 활성화 요구로 목록 미확인입니다. 로컬 D1·R2·비밀값·서버 프로세스는 변경하지 않았습니다. 후속 사용자 요청에 따라 이번 템플릿·점검 스크립트·문서·제외 설정만 커밋/push하며 실제 설정·인증 정보·데이터·번들은 포함하지 않습니다.


## 후속: 개발 자원 생성 완료 (2026-10-14)

사용자가 R2 구독 활성화를 완료한 뒤 두 개발 자원의 생성을 명시적으로 승인했습니다. 생성 직전 점검과 생성 명령 직전 재확인에서 인증 성공·계정 1개·D1 0개·R2 0개였으며 지정한 이름의 중복이 없었습니다. 기존 자원을 재사용·삭제·덮어쓰지 않았습니다. 다른 계정을 선택하거나 요금제를 전환·추가 서비스를 가입하지 않았습니다.

| 자원/확인 항목 | 생성 후 읽기 전용 확인 결과 |
| --- | --- |
| D1 | `gnc-cooling-development` 1개, 상세 조회 ID가 개발 설정과 일치, 테이블 0개 |
| R2 | `gnc-cooling-development-files` 1개, 기본 저장 등급 Standard, 파일 0개 |
| R2 공개 접근 | r2.dev 공개 URL 비활성화, 연결된 사용자 지정 도메인 0개 |
| 배치 | 생성 시 D1·R2 모두 APAC 위치 힌트 사용; 한국 저장 보장으로 해석하지 않음 |
| 요금제·청구 | Workers 요금제·R2 결제 상세·잔여 무료량은 미확인. R2 목록·상세 조회 가능 상태만 확인 |

생성 명령은 설정 자동 갱신을 끈 `--update-config=false`로 실행했습니다. 계정 ID와 반환된 D1 UUID는 Git 제외 `configs/wrangler.development.jsonc`에만 기록했고 파일 권한은 0600입니다. R2 이름과 기존 템플릿의 `DB`/`FILES` 바인딩을 유지했습니다. API 토큰 등 비밀값은 설정 파일에 넣지 않았습니다. 실제 설정은 두 자원의 바인딩 대상 정보를 기록한 것이며 Worker 런타임 연결 시험 완료를 뜻하지 않습니다.

생성 후 `check-cloudflare-account.mjs`, `d1 info --json`, `r2 bucket info --json`, `r2 bucket dev-url get`, `r2 bucket domain list`를 읽기 전용으로 실행했습니다. 공개 URL·도메인 활성화 명령은 실행하지 않았습니다. 로컬 루트 설정과 운영 템플릿, 로컬 DB·R2·서버는 보존했습니다. 실제 개발 설정과 시험 번들은 Git 제외 상태이며 이번 후속 커밋은 README와 이 문서만 포함합니다.

### 생성 당시의 다음 단계: 개발 D1 마이그레이션 계획

1. 원격 개발 DB 변경에 대한 별도 승인을 받습니다. 실제 설정의 계정·D1 UUID가 이번 생성 대상인지 확인하고 운영 대상으로 변경되지 않았는지 재검토합니다.
2. 계정·D1·R2 목록과 DB 상태를 재조회합니다. 지금은 테이블 0개지만 이후 데이터가 생겼다면 중단하고 기존 상태·백업을 먼저 확인합니다. 원격 백업 위치·암호화·복원 절차를 마련하며 로컬 백업 스크립트를 원격 백업으로 간주하지 않습니다.
3. `migrations/0001`~`0012`의 12개 SQL을 검토하고 새로운 격리 로컬 환경에서 순차 적용을 검증합니다. 구조 변경 외에 `0002`의 기본 제품군 입력과 기존 테이블 이관 SQL도 포함되므로 순수 스키마 변경으로 보고하지 않습니다. 로컬 시연 계정·비밀번호·콘텐츠·고객 자료는 원격으로 가져오지 않습니다.
4. 승인된 설정과 `--remote`를 명시해 **개발 D1에만** 적용합니다. 아래 명령은 계획이며 이번에는 실행하지 않았습니다.

   ```sh
   pnpm exec wrangler d1 migrations apply DB --remote --config configs/wrangler.development.jsonc --env=''
   ```

5. 적용 후 마이그레이션 이력·스키마·기본 제품군·테이블별 행 수·무결성을 확인합니다. 실패하면 자동 재생성/삭제하지 않고 실패 단계와 부분 적용 상태를 확인한 뒤 복구합니다. 승인 시 구조뿐 아니라 기본 제품군 입력 범위도 포함되어야 합니다.
6. R2에는 파일을 올리지 않고 직원 인증·검사·메일·고객 접수·예약 작업 잠금을 유지합니다. Worker 배포·외부 공개·실제 직원 계정 연결은 별도 단계입니다.


## 후속: 개발 D1 마이그레이션 적용 완료 (2026-10-14)

별도 승인 후 계정·DB 이름·ID 일치와 빈 상태를 재확인하고 새 격리 로컬 DB에서 12개를 검증한 뒤 개발 D1에만 적용했습니다. 전체 예상 스키마와 열·인덱스·외래키·행 수가 원격 결과와 일치합니다. 앱 테이블 41개·열 346개·명시적 인덱스 19개·외래키 45개, 이력 12건·미적용 0개, quick_check 정상·외래키 위반 0건입니다.

기본 제품군 3건은 마이그레이션 자체의 입력이며 나머지 업무 테이블은 모두 0건입니다. 위 자원 생성 당시의 테이블 0개 기록과 미실행 명령 설명은 당시 이력입니다. 현재의 결과·SQL 영향·전체 예상 스키마·재현 및 읽기 전용 점검 명령은 [개발 D1 마이그레이션 검증 기록](development-d1-migrations.md)을 따릅니다. R2 업로드·Worker 배포·외부 공개·인증/메일/검사 연결은 수행하지 않았습니다.


## 후속: 개발 미리보기 준비

개발 템플릿과 Git 제외 실제 개발 설정에 환경 식별과 비어 있는 Access 팀 도메인/audience를 추가했습니다. 내부 JWT 검증과 관리자/고객 업무·예약 작업 잠금, 실제 바인딩 dry-run을 준비했습니다. 공개 주소·DNS·Access 권한은 활성화하지 않았습니다. 최신 절차와 미확인 조건은 [개발 미리보기 준비](development-preview.md)를 따릅니다. 초기 템플릿의 일반 설정 4개 기록에 이 3개 개발 전용 변수가 추가됐으며 운영 템플릿은 보존했습니다.
