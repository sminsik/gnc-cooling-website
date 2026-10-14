# 개발 미리보기 배포 준비

2026-10-14. 이번 단계는 코드·템플릿·절차 준비와 배포 없는 빌드만 수행했습니다. Worker 배포, URL 활성화, DNS 변경, Access 애플리케이션 생성/권한 부여, 원격 데이터 입력은 수행하지 않았습니다.

## 배포 대상과 현재 결과

대상 Worker 이름은 `gnc-cooling-development`입니다. Git 제외 `configs/wrangler.development.jsonc`의 `DB`는 개발 D1 `gnc-cooling-development`, `FILES`는 비공개 Standard R2 `gnc-cooling-development-files`입니다. D1의 12개 마이그레이션 적용/검증은 [기록](development-d1-migrations.md)을 따릅니다. 운영 템플릿과 루트 로컬 설정은 변경하지 않았습니다. 준비 시작 시 HEAD와 origin/main이 `09e2dc1`로 일치했고 작업 트리는 깨끗했습니다.

실제 개발 설정과 개발 템플릿에 `DEPLOYMENT_ENVIRONMENT=development`, 비어 있는 `ACCESS_TEAM_DOMAIN`·`ACCESS_AUD`를 추가했습니다. 이 값은 Zero Trust 팀 도메인(프로토콜 없는 `팀명.cloudflareaccess.com`)과 승인된 앱의 audience 태그로 나중에 채웁니다. 비밀번호가 아닌 식별 설정도 실제 파일은 Git에서 제외합니다. 현재 값이 비어 있으므로 Worker는 요청을 503으로 거부합니다.

`workers_dev:false`, `preview_urls:false`, `routes:[]`, 예약 작업·서비스 바인딩 없음, 관측 로그 비활성은 유지합니다. R2 공개 URL/도메인도 그대로 비활성 상태입니다. 실제 계정/DB 바인딩을 가진 개발 설정으로 dry-run이 통과했지만 이는 원격 Worker 배포나 런타임 연결 완료를 뜻하지 않습니다.

## 권장 접근 제한과 조건

**개발 Worker 하나의 All traffic Access 정책 + 승인한 개별 이메일 allowlist + workers.dev 주소**를 권장합니다. Workers의 다른 자원이나 운영 도메인에 영향을 주는 계정 전체 정책은 적용하지 않습니다. Previews only는 개발 Worker의 일반 배포 주소를 보호하지 않으므로 선택하지 않습니다. 실제 사용자 목록은 아직 미정입니다. 정책에서 Everyone, 이메일 도메인 전체, Bypass를 사용하지 않습니다.

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
