# GitHub Actions 자동 검사

`.github/workflows/ci.yml`은 `main` push와 pull request에서 Ubuntu 24.04의 새 실행 환경으로 검사합니다. Node.js는 `.nvmrc`, pnpm은 `package.json`의 `packageManager`를 읽습니다. 실제 버전과 `engines`의 일치 여부도 검사합니다. 버전 변경 시 세 파일과 잠금 파일을 함께 검토하세요. 외부 Actions는 커밋 SHA로 고정했고 주석에 버전을 기록했습니다.

## 실행 순서와 로컬 재현

저장소 루트에서 다음 명령을 순서대로 실행합니다.

```sh
nvm use
corepack enable pnpm
pnpm install --frozen-lockfile
pnpm ui:build
pnpm check
pnpm test
WRANGLER_SEND_METRICS=false pnpm build
```

CI의 `pnpm build`는 기본 `wrangler.jsonc`의 로컬용 임시 바인딩과 `--dry-run`으로 실행 파일을 생성합니다. 실제 개발 설정 `configs/wrangler.development.jsonc`, Cloudflare 로그인·토큰·GitHub Secrets가 필요하지 않습니다. UI 빌드는 생성 자산을 갱신하고 dry-run 출력은 `dist/`에 남습니다. 실행 환경과 pnpm 캐시에는 실제 설정·DB·첨부파일을 넣지 않습니다.

전체 자동 테스트는 `pnpm test`가 선택하는 `tests/*.test.mjs`입니다. 테스트가 만드는 격리 SQLite DB와 가상 계정·파일은 테스트 환경에서만 사용합니다. 실행 중인 로컬 DB, HTTPS 시연 상태나 원격 DB를 사용하지 않습니다. ClamAV 서비스·HTTPS 브라우저·실제 Access OTP·클라우드 연결 검증은 별도 환경이 필요한 통합 검증이며 이 CI에 포함되지 않습니다. CI 통과를 실제 서비스 통합 검수 완료로 해석하지 않습니다.

## 권한과 작업 범위

기본 권한은 `contents: read`이며 checkout 인증 정보를 작업 폴더에 유지하지 않습니다. 자동 배포·DB 마이그레이션·원격 연결·URL 활성화·예약 작업은 없습니다. Pull request의 코드도 비밀값 없이 검사합니다. 같은 브랜치에 새 커밋이 오면 이전 검사를 취소하며 한 실행의 제한 시간은 20분입니다. pnpm 저장소 캐시만 잠금 파일 기준으로 재사용합니다.

## 결과 확인과 실패 처리

GitHub 저장소의 **Actions → CI → 해당 커밋 → checks**에서 각 단계와 로그를 확인합니다. Pull request의 Checks에서도 결과를 볼 수 있습니다. `main`에 push한 커밋의 검사가 모두 초록색인지 확인하세요. 워크플로 추가 자체는 브랜치 보호의 필수 검사 설정을 변경하지 않습니다.

GitHub CLI 사용 시:

```sh
gh run list --workflow ci.yml --branch main --limit 5
gh run view RUN_ID
gh run view RUN_ID --log-failed
gh run watch RUN_ID --exit-status
```

실패한 단계의 명령을 로컬에서 먼저 재현합니다. 잠금 파일 오류는 `package.json`과 `pnpm-lock.yaml`의 불일치를 확인하고, 버전 오류는 `.nvmrc`·`engines`·`packageManager`를 확인합니다. 타입·테스트·빌드 실패는 해당 로그의 파일과 오류를 수정해 새 커밋을 push합니다. 일시적인 다운로드 장애에만 Actions의 **Re-run failed jobs**를 사용하세요. 실패 해결을 위해 토큰이나 실제 개발 설정을 CI에 추가하지 않습니다.
