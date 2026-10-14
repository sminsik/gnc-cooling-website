# 개발 미리보기 배포 준비

2026-10-14. 이번 단계는 코드·템플릿·절차 준비와 배포 없는 빌드만 수행했습니다. Worker 배포, URL 활성화, DNS 변경, Access 애플리케이션 생성/권한 부여, 원격 데이터 입력은 수행하지 않았습니다.

## 배포 대상과 현재 결과

대상 Worker 이름은 `gnc-cooling-development`입니다. Git 제외 `configs/wrangler.development.jsonc`의 `DB`는 개발 D1 `gnc-cooling-development`, `FILES`는 비공개 Standard R2 `gnc-cooling-development-files`입니다. D1의 12개 마이그레이션 적용/검증은 [기록](development-d1-migrations.md)을 따릅니다. 운영 템플릿과 루트 로컬 설정은 변경하지 않았습니다. 준비 시작 시 HEAD와 origin/main이 `09e2dc1`로 일치했고 작업 트리는 깨끗했습니다.

실제 개발 설정과 개발 템플릿에 `DEPLOYMENT_ENVIRONMENT=development`, 비어 있는 `ACCESS_TEAM_DOMAIN`·`ACCESS_AUD`를 추가했습니다. 이 값은 Zero Trust 팀 도메인(프로토콜 없는 `팀명.cloudflareaccess.com`)과 승인된 앱의 audience 태그로 나중에 채웁니다. 비밀번호가 아닌 식별 설정도 실제 파일은 Git에서 제외합니다. 후속 사용자 지정으로 실제 개발 설정의 팀 도메인은 채웠고 audience는 아직 비어 있습니다. 따라서 Worker는 계속 요청을 503으로 거부합니다.

`workers_dev:false`, `preview_urls:false`, `routes:[]`, 예약 작업·서비스 바인딩 없음, 관측 로그 비활성은 유지합니다. R2 공개 URL/도메인도 그대로 비활성 상태입니다. 실제 계정/DB 바인딩을 가진 개발 설정으로 dry-run이 통과했지만 이는 원격 Worker 배포나 런타임 연결 완료를 뜻하지 않습니다.

## 권장 접근 제한과 조건

**개발 Worker 하나의 All traffic Access 정책 + 승인한 개별 이메일 allowlist + workers.dev 주소**를 권장합니다. Workers의 다른 자원이나 운영 도메인에 영향을 주는 계정 전체 정책은 적용하지 않습니다. Previews only는 개발 Worker의 일반 배포 주소를 보호하지 않으므로 선택하지 않습니다. 후속으로 사용자가 개별 이메일 1개와 이메일 일회용 코드·1시간 세션을 지정했습니다. 실제 이메일은 Git 제외 적용 요청 파일에만 기록합니다. 정책에서 Everyone, 이메일 도메인 전체, Bypass를 사용하지 않습니다.

Workers Access에는 Zero Trust 활성화와 Workers/Access 앱 관리 권한이 필요합니다. Worker 수준 정책은 그 Worker의 여러 경로/주소를 함께 보호합니다. 호스트 기반 정책은 정확한 주소만 보호하므로 대체 주소 누락을 점검해야 합니다. [공식 Workers Access 안내](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)

| 방식 | 도메인·계정 조건 | 판단 |
| --- | --- | --- |
| 개발 Worker All traffic + workers.dev | 계정 workers.dev 서브도메인, Zero Trust 팀, 해당 Worker ID/Access 정책 필요 | 권장. 회사 DNS 변경·도메인 구매 없이 개발용으로 사용 가능 |
| 개발 전용 Custom Domain + Access | Cloudflare에 연결된 도메인/존 관리 권한, 새 개발 호스트·TLS·DNS 및 Access 범위 검토 | 대안. 기존 운영 도메인에 대한 변경 승인 전 적용하지 않음 |
| 비밀 URL·noindex·IP 제한만 사용 | 별도 사용자 신원 확인 없음 | 지정 사용자 인증을 대신하지 못함 |

workers.dev는 계정 서브도메인 아래 제공되며 사용자 정의 도메인 등록 없이 시작할 수 있습니다. 실제 서브도메인 설정 여부와 정확한 주소는 미확인입니다. [workers.dev 안내](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)

Zero Trust Free는 최대 50 사용자 범위를 제공하며 공식 Pay-as-you-go 표시는 $7/사용자·월입니다. Zero Trust 팀 초기 설정에서는 Free를 선택해도 결제 정보 입력이 필요하다고 공식 안내에 명시돼 있습니다. 실제 결제 주기/가입 조건·좌석 사용량은 대시보드에서 확인하고 유료 전환하지 않습니다. [Zero Trust 초기 조건](https://developers.cloudflare.com/cloudflare-one/setup/) 기존 Zero Trust 팀·플랜·인증 제공자·권한은 이번에 조회하지 않아 미확인입니다. Workers·D1·R2 사용 비용은 Access와 별도이며 [기존 비용 정리](cloudflare-development-plan.md)를 참고합니다. [공식 Zero Trust 요금](https://www.cloudflare.com/plans/)

로그인은 기존 IdP 또는 Cloudflare 이메일 일회용 코드 중 별도로 결정합니다. 일회용 코드는 외부 인증 이메일을 발송하므로 향후 활성화 승인 범위에 포함해야 합니다. 회사 앱의 고객 메일 연결과는 별개입니다. 이번에는 인증 메일·권한 부여도 실행하지 않았습니다.

## 기능 잠금과 Worker 내부 검증

`DEPLOYMENT_ENVIRONMENT=development`에서는 모든 요청이 라우팅·DB/R2/자산 접근 전에 Access JWT 검증을 거칩니다. `Cf-Access-Jwt-Assertion` 헤더의 존재만 신뢰하지 않고 RS256 서명, issuer, audience, exp/iat/sub/email 필수 클레임을 확인합니다. 공개 키는 승인된 팀 도메인의 JWKS에서 가져오며 조회 실패/시간 초과·위조·만료·잘못된 audience는 차단합니다. 사용자 이메일/토큰은 반환하거나 로그에 남기지 않습니다. 앱 자체에 별도 이메일 목록을 복제하지 않으므로 지정 사용자 제한은 Access 정책이 정확히 승인·적용돼 있어야 합니다. 정책 허용 사용자가 곧 직원 계정이나 관리 권한을 얻는 것은 아닙니다.

이 Worker에는 Static Assets가 있습니다. 공식 문서에 따르면 자산 라우터는 `ctx.access`를 사용자 Worker에 전달하지 않으므로 그 값만 검사하는 방식은 쓰지 않았습니다. `run_worker_first:true`를 유지해 자산도 내부 검증을 거치도록 합니다. 실제 Access 정책에서 JWT 헤더 전달과 브라우저 허용/거부는 배포 후 검증해야 하며 현재 **미확인**입니다. 전달이 안 되면 차단 상태를 유지하고 원인을 확인합니다. [JWT 검증 안내](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)

| 기능 | 개발 미리보기 정책 |
| --- | --- |
| 홈페이지·제품/사례/자료/공지 조회·정적 자산 | Access 검증 후 GET/HEAD만 허용 |
| 관리자·직원 로그인/계정 API·파일 예약/업로드 | Access를 통과해도 503 잠금; 실수로 직원 인증 설정을 채워도 열리지 않음 |
| 고객 접수·본인 확인·고객 파일/업무 API | 503 잠금, 추가 고객 데이터 입력 없음 |
| 문의 안내 페이지 | 접수 설정을 강제로 닫아 준비 안내만 표시 |
| 기타 POST/PUT/PATCH/DELETE | 거부 |
| scheduled 작업 | development에서 실행하지 않음; DB 정리·메일·검사 작업도 실행 안 함 |
| 로컬 실행 | 환경 식별값을 넣지 않은 기존 로컬·HTTPS 실행의 인증/검사는 유지 |

로컬 Python/ClamAV의 127.0.0.1:8790은 클라우드 Worker가 접속할 검사 서비스가 아닙니다. 현재 개발 Worker에는 검사·메일 바인딩을 추가하지 않았습니다. 향후 검사 서비스의 비공개 실행 환경·메모리/시간·비용·인증·차단 검증이 끝나기 전 업로드 잠금을 해제하지 않습니다.

## 식별·연결 확인·로그

개발 응답에는 `X-GNC-Environment: development`, no-store, noindex/nofollow를 붙입니다. noindex는 접근 제어를 대신하지 않습니다.

개발 `/api/health`는 Access 검증 후에만 실행합니다. D1의 migration 이력 수 12와 R2 list(limit=1)를 읽기 전용으로 확인하고 응답은 `{ok,environment:"development"}`로 제한합니다. DB UUID·계정 ID·버킷 이름·파일 키·행 내용·예외 문자열을 반환하지 않습니다. 정상 200, 연결/스키마 확인 실패 503입니다. 비개발 환경에서는 이 점검 주소를 localhost/127.0.0.1/IPv6 loopback에만 제공해 원격 공개 상태 조회를 막습니다.

health가 이력 수만 검사하는 것으로 전체 스키마·정확한 자원 ID를 증명하지는 않습니다. 배포 전 실제 설정과 읽기 전용 CLI 점검으로 자원 일치를 확인하고 배포 후 플랫폼 바인딩을 다시 대조해야 합니다. 아래 개발 D1 검증 명령은 전체 스키마·이력을 검사합니다.

직접 기록하는 로그는 `preview-binding-check`, ok, 임의 requestId뿐입니다. 로그인 토큰·이메일·쿠키·고객 정보·예외 원문을 로그에 넣지 않습니다. 배포 후 승인된 운영자가 `wrangler tail`로 확인하거나 보관 로그를 별도 승인으로 켤 수 있습니다. 플랫폼 로그에는 URL 등 추가 메타데이터가 있을 수 있으므로 저장·공유 전에 검토합니다. 관측 로그는 이번에는 켜지 않았고 실제 로그/Access 감사 이벤트·보관 비용도 아직 검증하지 않았습니다.

## 적용 절차 — 이번에는 미실행

1. Zero Trust 활성화/플랜·좌석, 계정 workers.dev 서브도메인, 승인할 개별 이메일·IdP/코드 방식·1시간 세션을 확정합니다. Workers와 Access 관리 권한을 확인합니다. DNS 쓰기 권한은 권장 방식에 필요하지 않습니다.
2. 아래 로컬 검증을 실행하고 대상 자원 상태를 읽기 전용으로 확인합니다. `configs/access-development.example.json`은 정책의 **미적용 계획 템플릿**이며 Worker ID와 승인 이메일을 실제 Git 제외 설정에서 채웁니다.
3. **별도 배포 승인 후** Worker를 모든 URL/route가 꺼진 설정으로 처음 배포합니다. 처음에는 Access 식별값도 미정이므로 요청을 차단합니다. 배포 과정/후에 모든 Deployment/Version/Preview URL 및 route의 실제 노출 상태를 확인하고, 열려 있으면 접근을 허용하지 않고 중단합니다.
4. **별도 Access 권한 부여 승인 후** 새 개발 Worker의 All traffic 앱/정책만 만듭니다. 승인 이메일 allowlist, Bypass/Everyone 없음, 앱 audience와 팀 도메인을 확인합니다. 기존 운영/계정 전체 정책을 바꾸지 않습니다.
5. 개발 실제 설정에 팀 도메인/audience를 반영하고, Access 준비 확인 후에만 workers.dev 활성화/재배포를 별도 승인으로 진행합니다. 다른 Preview/Version URL은 필요 없으면 계속 꺼 둡니다. URL 활성화 후 익명·허용 외 사용자·허용 사용자를 브라우저에서 검증합니다.
6. 승인된 사용자만 health/페이지/자산에 접근 가능한지 확인하고 위조 JWT·대체 주소·인증 없이 health·관리자 업로드·고객 접수 차단을 점검합니다. 키/연결 장애 때도 차단/503을 확인합니다. 권한 부여와 실배포 전에는 이 항목들을 완료로 처리하지 않습니다.

## 재현 명령과 되돌리기

프로젝트 루트에서 실행하는 다음 명령은 이번에 검증했습니다. 번들은 `.cloudflare-plan/`에만 저장하며 실제 설정/식별자/인증 원문을 출력하지 않습니다.

```sh
nvm use
pnpm check
pnpm test
pnpm ui:build
node scripts/build-development-preview.mjs
node scripts/validate-cloudflare-templates.mjs --dry-run
```

`build-development-preview.mjs`는 실제 개발 설정이 닫힌 템플릿과 일치하는지 확인하고 `wrangler deploy --dry-run`만 호출합니다. 빌드 성공은 Access 적용·실제 배포·운영 연결 검증이 아닙니다. 테스트는 합성 서명 JWT/JWKS와 가상 바인딩을 사용했고 고객 파일·실제 Access 로그인은 사용하지 않았습니다. 최초 제한된 환경에서 기존 CLI 테스트가 외부 시험 폴더 접근으로 실패했으나 권한 승인 후 전체 126개가 통과했습니다.

다음 명령은 **향후 배포 후 운영 점검/복구용**이며 이번에 실행하지 않았습니다.

```sh
pnpm exec wrangler deployments list --config configs/wrangler.development.jsonc --env=''
pnpm exec wrangler tail gnc-cooling-development --config configs/wrangler.development.jsonc --env=''
# 승인된 이전 개발 Worker version ID와 사유를 확인한 뒤만 실행:
pnpm exec wrangler rollback APPROVED_PREVIOUS_DEVELOPMENT_VERSION_ID --config configs/wrangler.development.jsonc --env='' --message 'approved development rollback'
```

배포 전에 Git 커밋·현재/이전 Worker version ID·대상 계정/바인딩·Access 정책/앱·노출 설정을 Git 제외 운영 기록에 보존합니다. 실패 시 자동 재배포/Access 해제/DB 삭제를 하지 않고 실제 활성 version과 오류를 먼저 확인합니다. 이전 검증된 버전이 있으면 바인딩/스키마 호환성을 검토하고 개발 Worker만 롤백합니다. 첫 배포에는 이전 버전이 없으므로 모든 URL을 꺼 두고 수정 빌드를 준비합니다. 정보 노출이 의심되면 별도 승인된 사고 대응 범위에서 URL을 닫거나 Access 차단을 강화하며 Access를 해제해 해결하지 않습니다.

Worker rollback은 D1 데이터·마이그레이션·R2 파일·DNS·Access 정책을 되돌리지 않습니다. 바인딩 자원 변경에 따라 롤백이 제한될 수 있으므로 DB/R2 복구는 별도 절차와 승인으로 진행합니다. [공식 Rollback 안내](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)

## 완료와 미확인

완료: 실제 개발 바인딩 dry-run, UI 빌드·코드 검사·자동 테스트 126개, Access JWT 검증/장애 차단·업무/예약 작업 잠금·내부 정보 응답 방지. 루트 로컬 설정·운영 템플릿 보존, 실제 설정·번들·비밀값 Git 제외.

미확인/남은 설정: Zero Trust 활성화·요금제/좌석·Access 관리 권한, workers.dev 서브도메인, 승인 사용자·로그인 제공자, 실제 개발 Worker ID, 앱 audience·팀 도메인, 실제 Access 정책·JWT 헤더 전달·브라우저 시험·JWT 검증의 Free CPU 한도 적합성, 원격 Worker D1/R2 런타임 연결, 플랫폼 로그, 첫 실배포 및 롤백 시험. 코드 준비를 서비스 연결/배포 완료로 표시하지 않습니다.


## 후속: 지정 사용자·OTP 정책의 실제 적용 준비 (2026-10-14)

사용자가 지정한 팀 도메인은 `sminsik-workspace.cloudflareaccess.com`, 대상은 `gnc-cooling-development`, 허용 대상은 지정한 개인 이메일 **1개**, 로그인은 이메일 일회용 코드, 세션은 **1시간**입니다. 이 지정은 이번 원격 적용 승인이 아닙니다. 실제 이메일과 개인화된 앱/정책 요청은 Git 제외 `.cloudflare-plan/`에 기록했고 공유 템플릿은 그대로 유지합니다.

### 읽기 전용 API 확인

설정 파일의 계정이 인증된 계정 목록에 포함됨을 재확인했습니다. 이후 동일 계정에 GET 요청만 실행했습니다. 토큰·credential 원문·IdP 비밀 설정은 출력/문서 저장하지 않았습니다.

| 조회 | 실제 결과 | 해석 |
| --- | --- | --- |
| Access apps | HTTP 200, 0개 | 조회된 계정에 기존 앱 없음 |
| Access reusable policies | HTTP 200, 0개 | 기존 재사용 정책 없음 |
| Access identity providers | HTTP 200, 0개 | OTP 제공자도 아직 없음 |
| Access organization | HTTP 403, 오류 10000 | 팀 도메인과 이 계정의 일치 여부 미확인. 조직 부재로 단정하지 않음 |
| Worker scripts/Worker 목록 | HTTP 200, 대상 없음 | 신규 Worker ID가 아직 없어 Worker destination 요청 완성 불가 |
| workers.dev subdomain | HTTP 404, 오류 10007 | 실제 주소 미확인. 대시보드에서 서브도메인 준비 상태 확인 필요 |
| OAuth 선언 scope | workers:write 있음, access:read/access:write 없음 | 앱/IdP 읽기는 실제로 성공했지만 조직 조회는 실패. Access 생성 권한은 쓰기 요청 없이 확정할 수 없음 |

읽기 성공을 쓰기 가능으로 보고하지 않습니다. 현 인증은 Access 쓰기 scope를 선언하지 않아 API 자동 적용 권한이 확인되지 않았습니다. Workers 쓰기 scope도 선언 상태만 확인했고 실제 배포 권한·플랜 제한은 쓰기로 시험하지 않았습니다. 요금제·청구·좌석 상태는 미확인입니다.

### 준비한 실제 요청과 배포 설정

모든 개인화 파일은 Git 제외이며 0600 권한입니다. 미정 ID는 `REPLACE_...`로 표시하고 **적용하지 않았습니다**.

| 파일 | 구체적 내용 |
| --- | --- |
| `.cloudflare-plan/access-otp.request.json` | name=GNC One-time PIN login, type=onetimepin, config={} |
| `.cloudflare-plan/access-development.request.json` | self_hosted 앱, 개발 Worker 1개 destination(type=worker, All traffic), allowed_idps=OTP 제공자 ID 1개, 자동 IdP 연결, WARP 인증 우회 비허용, 앱 세션 1h |
| 위 앱의 정책 | allow 정책 1개, Include Email=승인 이메일 1개만, Require Login method=해당 OTP 제공자, 정책 세션 1h. Everyone/email_domain/bypass 규칙 없음 |
| `.cloudflare-plan/development-worker-deployment-plan.json` | 처음은 모든 URL 비활성 배포 → 단일 Worker Access 적용 → audience 기록 → 별도 승인 후 workers.dev 활성화 순서와 미정 항목 |
| `configs/wrangler.development.jsonc` | 요청한 팀 도메인 반영, ACCESS_AUD는 빈 값 유지. workers_dev/preview_urls=false, routes=[], crons/services 없음, 관리자/업로드/고객 업무 잠금 |
| `.cloudflare-plan/access-readonly-report.json` | 비밀값 없는 API 상태/건수/선언 scope 확인 요약 |

OTP provider ID·Worker ID·앱 audience가 없으므로 요청 파일을 API에 그대로 전송하면 안 됩니다. 실제 설정을 반영한 배포 없는 빌드와 단일 이메일/OTP/1h 정책의 구조 검증은 통과했습니다. 코드는 변경하지 않았으며 관리/업로드/고객/예약 작업 잠금은 유지됩니다.

### 권한과 대시보드에서 필요한 설정

현재 조직 조회 403 및 Access 쓰기 권한 미확인 때문에 대시보드에서 같은 계정의 상태를 확인하는 것이 선행입니다. 화면 경로는 Cloudflare 대시보드의 버전에 따라 명칭이 달라질 수 있습니다.

1. 로그인한 Cloudflare 계정이 개발 D1/R2 설정의 계정과 같은지 확인합니다. Zero Trust > Settings에서 팀 도메인이 요청한 값인지 확인합니다. 다른 팀 도메인이면 기존 조직을 임의로 변경하지 말고 차이를 보고합니다. Free/좌석·결제 조건도 확인하되 유료 전환하지 않습니다.
2. OTP 준비는 Zero Trust의 Integrations/Identity providers(또는 Authentication > Login methods)에서 One-time PIN을 추가합니다. **원격 변경이므로 별도 승인 후만** 진행합니다. 앱의 Login methods에서는 이 제공자만 선택하고 Accept all identity providers를 끕니다. [공식 OTP 설정](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/)
3. Workers & Pages에서 계정 workers.dev 서브도메인을 확인합니다. 미등록이면 선택·등록할 이름을 먼저 확정하고 별도 승인 후 설정합니다. 회사 DNS·운영 도메인은 수정하지 않습니다.
4. 별도 배포 승인 후 URL 비활성 개발 Worker를 생성합니다. Workers & Pages > 해당 Worker > Access에서 All traffic 보호를 선택합니다. 고급 정책은 Zero Trust > Access > Applications에서 **앱의 단일 Allow 정책에 개별 Email 1개만** 넣습니다. 기본 Everyone/계정 전체 회원/이메일 도메인 허용 정책이 생성되면 그대로 승인하지 않고 단일 이메일 규칙으로 정정해야 합니다. 앱/정책의 session duration은 둘 다 1h, OTP만 선택합니다.
5. 앱 생성 후 audience 태그를 실제 개발 설정에 기록하고 정책·다른 앱의 호스트 범위/우선순위와 Bypass 없음 여부를 읽기 전용으로 재확인합니다. 그 후에만 별도 URL 활성화/재배포 승인으로 진행합니다. 허용 이메일 OTP, 다른 이메일·익명 거부, JWT 전달·업무 잠금 검증은 실제 적용 이후 진행하며 현재 미확인입니다.

API를 사용할 경우 대시보드에서 **해당 계정만** 대상으로 `Access: Apps and Policies Write/Edit`, OTP 생성용 `Access: Organizations, Identity Providers, and Groups Write/Edit` 권한을 준비합니다. Read 권한은 상태 조회에 사용합니다. Workers 배포에는 Workers Scripts Write/Edit 및 개발 바인딩 접근 권한이 필요합니다. 전체 계정/Global API Key·DNS 쓰기 권한을 요구하지 않습니다. 토큰은 비밀 저장소나 환경변수로 제공하고 문서·요청 JSON·Git에 넣지 않습니다. 권한 생성/재로그인은 이번에 실행하지 않았습니다. [공식 권한 목록](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)

실제 적용 승인 전에는 API POST/PUT/PATCH/DELETE, Worker deploy, 공개 URL 활성화와 인증 코드 이메일 발송을 실행하지 않습니다. 이번에는 개인화 준비 파일과 문서만 갱신했고 커밋/push 요청이 없어 작업 트리에 문서를 남겨 둡니다.


## 후속: URL 비활성 최초 배포 결과 (2026-10-14)

사용자의 명시적 최초 배포 승인으로 소스 커밋 `9cfbf07`와 최신 Git 제외 개발 설정을 사용했습니다. 코드 검사·관련 테스트·배포 없는 빌드 및 실제 미완성 Access 설정의 24개 페이지/자산/API 요청 차단 검증 후 한 번 배포했습니다. 설정은 workers_dev/preview_urls=false, routes/crons/services 비어 있음, run_worker_first=true, development 식별, ACCESS_AUD 빈 값으로 유지했습니다. 자동 구성·자동 자원 생성 흐름은 사용하지 않았습니다.

배포 CLI는 오류 **10063**으로 종료했습니다. 이 오류는 계정 workers.dev 서브도메인 초기화 필요와 관련 있습니다. 다만 실패 후 읽기 전용 재조회에서 `gnc-cooling-development` Worker 생성, 버전 1의 deployment 존재와 100% 배정, 개발 D1/R2 바인딩 일치를 확인했습니다. 따라서 단순히 미생성으로 보고하거나 전체 배포를 재시도하지 않았습니다. 계정 서브도메인 등록이나 공개 주소 활성화로 오류를 해결하지 않았습니다. [Cloudflare SDK 이슈의 오류 설명](https://github.com/cloudflare/workers-sdk/issues/9045)

| 실제 조회 | 확인 결과 |
| --- | --- |
| Worker/버전 | 개발 Worker 생성, 버전 1 활성 배정 100% |
| workers.dev·미리보기 URL | enabled=false, previews_enabled=false |
| 라우트·사용자 지정 도메인 | 각 0개 |
| 예약 작업 | 0개 |
| 바인딩/변수 | 지정 개발 D1 UUID·R2 이름과 일치. development·빈 audience·직원 인증/접수 잠금 확인 |
| 데이터 | 배포 전후 D1 전체 스키마/행 수 검증 동일: 기본 제품군 3건·나머지 업무 데이터 0건. R2 Standard·파일 0개 유지 |

정적 자산은 모든 공개 URL/라우트가 꺼진 상태이며, 소스·배포 설정의 Worker 우선 실행과 빈 audience에서 자산을 포함한 요청이 DB/R2/ASSETS 접근 전에 503으로 거부됨을 로컬 검증했습니다. 조회한 원격 설정/버전 API에는 run_worker_first 필드가 노출되지 않아 해당 필드의 원격 직접 재조회는 미확인입니다. 공개 URL을 켜서 HTTP 응답을 시험하지 않았습니다.

Worker ID·version ID·실제 오류/확인 요약은 Git 제외 `.cloudflare-plan/initial-private-deployment.json`과 `.cloudflare-plan/private-worker-verification.json`에 저장했습니다. 개인화 Access 요청 파일에는 확인된 Worker ID만 반영했습니다. Access 앱/정책·OTP 제공자·권한은 적용하지 않았고 audience는 여전히 빈 값입니다. 따라서 이제 Access 화면에서 생성된 Worker를 선택할 수 있으나 정책 적용과 인증/URL 활성화는 별도 단계입니다. 대시보드 목록이 갱신되지 않으면 같은 계정인지 확인하고 새로고침합니다.

코드·루트 로컬 설정·운영 템플릿은 변경하지 않았습니다. 이번 요청에는 커밋/push 지시가 없어 문서 기록은 기존 후속 문서 변경과 함께 작업 트리에 남깁니다.


## 후속: 대시보드 생성 앱 확인 단계 — URL 활성화 보류 (2026-10-14)

사용자가 대시보드에서 지정 이메일 1개·OTP만·앱/정책 1h의 앱을 만들었다고 보고했으며 화면의 ‘할당된 대상 없음’을 함께 알렸습니다. 이 상태를 연결 완료로 간주하지 않고 같은 개발 계정에서 앱 목록·Worker·IdP·조직·계정 서브도메인을 GET으로 조회했습니다.

| 항목 | 이번에 확인된 상태 |
| --- | --- |
| 개발 Worker | 조회 성공, 생성 상태 유지 |
| Access 앱 목록 | HTTP 200, 반환 앱 0개; 이름 또는 Worker ID 일치 앱 없음 |
| 조직 | HTTP 403; 팀 도메인이 개발 계정에 속하는지 미확인 |
| 계정 서브도메인 | HTTP 404/10007; 등록 이름 미확인 |
| Worker URL | enabled=false, previews_enabled=false 유지 |
| 대상·이메일 정책·OTP·세션 | API에서 앱을 식별하지 못해 미확인 |
| AUD | 조회하지 못함; 실제 설정의 빈 audience 유지 |

API 결과와 대시보드 보고가 불일치합니다. 계정 차이·앱 저장 상태·현재 인증의 Access 조회 범위를 확인해야 하며, 앱이 실제로 존재하지 않는다고 단정하지 않습니다. 실행 도구에 연결된 브라우저가 없어 대시보드 직접 확인도 하지 못했습니다. 사용자에게 상세 화면 URL을 요청했습니다. 원격 앱이 정확한 Worker ID를 대상으로 연결됐다는 증거가 없으므로 재배포·계정 서브도메인 등록·URL 활성화는 진행하지 않았습니다.

계정 서브도메인은 **sminsik-workspace**를 후보로 먼저 보고했습니다. 가정한 주소 `https://gnc-cooling-development.sminsik-workspace.workers.dev`는 아직 등록/활성화된 완료 주소가 아닙니다. 이름의 사용 가능 여부도 미확인입니다. 기존 회사 DNS·운영 서비스·요금제·D1/R2 데이터는 변경하지 않았습니다.

독립적으로 코드 검사·개발 dry-run과 관련 JWT 테스트를 확인했습니다. 합성 JWT/JWKS 테스트에 페이지·JS·CSS·이미지·폰트·API의 GET/HEAD × 비로그인/잘못된 JWT 48개 요청 조합을 추가했고 모든 바인딩 접근 전에 차단됨을 확인했습니다. 이는 로컬 자동 검증이며 실제 Cloudflare Access 보호·원격 HTTP 검증의 완료를 뜻하지 않습니다. 실서비스 로그인·외부 OTP 발송·공개 주소를 이용한 검사는 진행하지 않았습니다.

### 대시보드에서 확인할 위치

1. 현재 앱의 상세 URL에서 계정이 개발 Worker 계정과 같은지 확인합니다. Worker ID는 Git 제외 `.cloudflare-plan/private-worker-verification.json`에서 대조할 수 있습니다.
2. Workers & Pages > `gnc-cooling-development` > Access에서 이 Worker의 **All traffic** 보호 연결을 확인합니다. 앱 이름만 같거나 ‘할당된 대상 없음’이면 연결 증거로 인정하지 않습니다. 기존 앱의 연결 대상·우선순위와 Worker ID가 일치하는지 확인한 뒤 원격 적용 범위를 정합니다. [Worker Access 범위](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)
3. Zero Trust > Access controls > Applications > 해당 앱 Configure > Additional settings의 **Application Audience (AUD) Tag**를 확인합니다. AUD는 앱 식별자이며 비밀번호·API 토큰이 아닙니다. 로컬 Git 제외 설정의 ACCESS_AUD에 기록하고 문서·커밋에는 실제 값을 적지 않습니다. [공식 AUD 위치](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
4. API 확인이 필요하면 동일 계정에 범위를 제한한 Access Apps/Policies Read와 Organizations/Identity Providers/Groups Read 권한을 확인합니다. 실제 토큰·OTP·세션 쿠키는 보내거나 공개하지 않습니다.
5. 대상 연결, 개별 이메일 1개 Allow, Everyone/email_domain/Bypass 없음, OTP만 선택, 앱/정책 모두 1h, AUD·팀 도메인을 읽기 전용으로 재확인한 후에만 재배포/주소 활성화 조건이 충족됩니다. 문제가 있으면 URL을 비활성화한다는 사용자 승인 범위도 유지합니다.

현재 완료 주소는 없습니다. 이번에는 누적 준비/최초 배포/이번 미확인 상태를 포함한 문서와 인증 전 자산 차단 테스트만 커밋/push합니다. 실제 설정·API 응답 파일·AUD·비밀값은 제외합니다. 나머지 배포·URL 활성화와 원격 HTTP 시험은 대상 확인이 가능해진 다음에 이어서 진행해야 합니다.
