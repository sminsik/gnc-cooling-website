# Mac·Ubuntu 로컬 파일 검사 환경

2026-10-14. 검사 코드는 [서비스 계약](file-scanner.md)을 따릅니다. 실제 고객 파일·원격 검사 서비스·Cloudflare 원격 자원·실제 배포는 사용하지 않습니다.

## 경로 선택과 Mac 호환

| 대상 | Ubuntu 기본 경로 | 기존 Mac 기본 경로 |
| --- | --- | --- |
| 작업 자료 | 저장소의 `.local-scanner/` | 저장소 상위의 `../.work/c-local/` |
| Python | `.local-scanner/venv/bin/python` | `../.work/c-local/scanner-venv/bin/python` |
| ClamAV | `.local-scanner/clamav/usr/bin/{clamscan,freshclam}` | 기존 `clamav-expanded/clamav-1.5.4.macos.universal-programs.pkg/Payload/usr/local/clamav/bin/` |
| 정의 파일 | 작업 자료의 `clamav-db/` | 기존 위치 유지 |
| 서명 검증 인증서 | `.local-scanner/clamav/etc/clamav/certs/` | 기존 ClamAV의 `etc/certs/` |
| 공유 키 | 작업 자료의 `scanner-secret` | 기존 파일 유지 |

`pnpm scanner:local`은 새 Node 실행기를 사용하며 해당 OS의 가상환경 Python을 실행합니다. 기존 Mac 경로와 `scanner-venv` 이름은 보존했고 Mac 기본 경로 선택 회귀 시험을 추가했습니다. 이번 Ubuntu 작업에서 실제 Mac 컴퓨터의 재실행은 하지 않았습니다.

다른 경로가 필요하면 `SCANNER_WORK_DIR`로 작업 자료 위치를 지정하고 그 안의 Git 제외 `scanner-config.json`에 `clamscan`, `freshclam`, `database`, `certs`, `freshclam_config`, `library_dirs`를 설정합니다. 실행 파일·정의 파일 경로는 각각 `SCANNER_CLAMSCAN`, `SCANNER_FRESHCLAM`, `SCANNER_DATABASE`, `SCANNER_CERTS`, `SCANNER_FRESHCLAM_CONFIG` 환경변수로도 선택할 수 있습니다. 설정값은 로컬 관리자 설정이며 고객 입력으로 받지 않습니다.

Ubuntu에서 압축을 푼 라이브러리는 검사/업데이트 자식 프로세스에만 `LD_LIBRARY_PATH`를 적용합니다. 셸 전체와 시스템 라이브러리 설정은 변경하지 않습니다. Mac은 기존 패키지 경로를 유지하며 명시한 라이브러리 경로가 있을 때만 `DYLD_LIBRARY_PATH`를 적용합니다.

## Python 준비

Ubuntu 26.04.1 x86_64에서 Python **3.14.4**, Pillow **12.3.0**, pikepdf **10.16.0**의 wheel 설치와 실제 실행을 확인했습니다. 호환 버전으로 낮출 필요가 없었습니다. 현재 전용 가상환경의 추가 의존성은 lxml 6.1.3·packaging 26.3입니다. 시스템 Python 패키지는 변경하지 않았습니다.

설치된 uv를 사용하는 Ubuntu 재구성 명령입니다.

```sh
uv venv --python /usr/bin/python3 .local-scanner/venv
uv pip install --python .local-scanner/venv/bin/python -r dev/scanner/requirements.txt
```

다른 컴퓨터에서는 호환되는 Python으로 `python3 -m venv <작업자료>/venv`와 해당 Python의 `-m pip install -r dev/scanner/requirements.txt`를 사용할 수 있습니다. Python 모듈을 시스템 환경에 설치하지 않습니다. 가상환경이 이미 있으면 재생성 전에 해당 환경을 확인합니다.

## 관리자 권한 없이 ClamAV 준비

이번 Ubuntu에서는 apt 저장소의 패키지를 다운로드해 프로젝트 경로에만 풀었습니다. `sudo apt install`·시스템 서비스 등록·systemd 활성화는 하지 않았으므로 관리자 권한 요청이 필요하지 않았습니다. 검증한 패키지는 `clamav`, `clamav-freshclam`, `libclamav12` **1.5.4+dfsg-0ubuntu0.26.04.1**, `libmspack0t64` **0.11-1.1build2**입니다. 재설정 시에는 해당 Ubuntu 릴리스와 아키텍처에 맞는 패키지를 사용하고 로컬 라이브러리 누락 여부를 확인합니다.

```sh
mkdir -p .local-scanner/packages .local-scanner/clamav
(cd .local-scanner/packages && apt-get download clamav clamav-freshclam libclamav12 libmspack0t64)
for package in .local-scanner/packages/*.deb; do
  dpkg-deb -x "$package" .local-scanner/clamav
done
.local-scanner/venv/bin/python dev/scanner/setup-local.py
.local-scanner/venv/bin/python dev/scanner/update.py
```

`setup-local.py`는 로컬 경로 설정·FreshClam 설정·공유 키를 준비합니다. 기존 키와 설정은 덮어쓰지 않습니다. 키가 이미 있는데 어댑터 키와 다르면 중단합니다. 다른 프로그램의 실행 파일을 대신 생성하지 않습니다.

## 공유 키와 로컬 연결

암호학적 난수 32바이트를 hex로 저장합니다. 키를 출력하지 않으며 `scanner-secret`, `dev/scanner/.dev.vars`, `dev/scanner/.dev.vars.c-local`에 일치하는 값을 저장합니다. 두 어댑터 파일은 기본 환경과 `c-local` 환경을 각각 지원합니다. 파일 0600·작업 폴더 0700을 적용하며 기존 `.dev.vars*` 및 새 `.local-scanner/` 제외 설정으로 Git에 올라가지 않습니다.

서비스는 **127.0.0.1:8790**에만 바인딩합니다. 어댑터 목적지도 이 주소에 고정됩니다. 공개 콜백이나 원격 파일 전송을 추가하지 않았습니다. 홈페이지의 인증 비밀값·직원 계정은 만들지 않았습니다.

```sh
nvm use
pnpm scanner:local
```

## 정의 파일 업데이트와 제한

FreshClam은 공식 `database.clamav.net`에서 main·daily·bytecode와 서명 자료를 내려받고 테스트합니다. 현재 준비된 버전은 main 63·daily 28152·bytecode 339이며 각각의 DB 테스트가 통과했습니다. 수동 업데이트는 위 `update.py` 명령입니다. 서비스 시작 시와 이후 24시간마다 업데이트를 시도합니다. 실행 중인 동안만 자동 업데이트되며 OS 예약 작업은 설치하지 않았습니다.

main·daily·bytecode 중 하나라도 없거나 daily 파일 수정 시각이 48시간을 넘으면 정상 판정을 제공하지 않습니다. 엔진 오류·정의 파일 오류·업데이트 실패로 정의 파일이 만료된 경우에도 미검사 파일을 통과시키지 않습니다. 원본과 재처리 결과를 모두 실제 엔진으로 검사합니다. 서명과 인증서 경로의 의미는 [ClamAV 1.5 공식 안내](https://blog.clamav.net/2025/10/clamav-150-released.html), 업데이트는 [공식 설정 문서](https://docs.clamav.net/manual/Usage/Configuration.html)를 참고합니다.

| 자원/시간 | 적용 제한 |
| --- | --- |
| 동시 검사 | 단일 HTTP 서버의 순차 검사 |
| 입력·출력 | 입력 최대 20MiB, 출력 12바이트 이상·원본 크기 이하 |
| 이미지 | 최대 40메가픽셀, 단일 프레임, 메타데이터 제거·재인코딩 |
| PDF | 최대 500페이지·100,000 객체, 암호화·실행 동작·첨부·폼·외부 링크 차단 |
| 검사 프로세스 | CPU 35초, 파일 생성 45MiB, 전체 경과 50초 |
| 메모리 | 프로세스 그룹 RSS 2GiB 초과 시 종료. 0.25초마다 확인 |
| ClamAV | 호출별 25초, 스캔 총량 40MiB·파일 20개·재귀 10, 한도 초과는 경보 |
| 어댑터 | 기본 55초, 앱 처리 60초. 시험/로컬 설정은 `SCANNER_TIMEOUT_MS`로 100~55,000ms 범위 안에서 낮출 수 있음 |
| 요청 수신 | 소켓 읽기 대기 15초 |

주기적 RSS 감시는 강제 cgroup 격리와 같지 않으며 정의 파일 업데이트 프로세스도 별도로 실행됩니다. 운영용 격리·강제 자원 제한·장애 알림·업데이트 및 서비스 자동 시작은 후속입니다.

## 시험 명령과 완료 범위

```sh
# 안전한 가상 이미지/PDF 및 무해한 EICAR 시험 문자열만 생성
.local-scanner/venv/bin/python dev/scanner/generate-fixtures.py
# 결정적인 서비스 오류·시간 초과·정의 파일·경로 시험 (실제 파일 악성 판정 시험과 구분)
.local-scanner/venv/bin/python dev/scanner/test_service.py
# 실제 검사 서비스가 켜진 상태에서: 실제 엔진 + 격리된 workerd 바인딩/처리 흐름
pnpm test:scanner-local
# 실제 검사 서비스를 Ctrl+C로 중지한 뒤:
pnpm test:scanner-local --offline
pnpm test:scanner-local --timeout
# 시험 후 서비스 재실행
pnpm scanner:local
```

`--timeout`은 8790에 응답을 보내지 않는 **가상 서버**를 잠깐 실행하고 실제 어댑터의 시간 초과 경로를 짧은 제한으로 확인합니다. 실제 검사기가 실행 중이면 포트 충돌로 시작할 수 없습니다. mock 성공 판정을 실제 검사 서비스에 연결하지 않습니다.

| 검증 구분 | 이번 결과 |
| --- | --- |
| Python·ClamAV 단독 환경 | 준비 완료. Python 3.14.4 의존성 및 실제 ClamAV 1.5.4 실행, 공식 정의 파일 테스트 통과 |
| 실제 가상 파일 검사 | PNG·JPEG·WebP·PDF 정상 4개, 암호화·JavaScript·첨부·EICAR·손상 PDF 차단 5개 |
| 격리 통합 검사 | 실제 workerd 서비스 바인딩 → 실제 검사 엔진 → 새 객체 → ready 전환 통과. 메모리 DB·가상 직원·가상 객체 저장소 사용 |
| 서비스 장애·시간 초과 | 실제 검사 서비스 중지와 응답 지연 시험에서 어댑터 503, 처리 파일 validating 유지·새 안전 객체 없음 |
| 결정적 회귀 시험 | Python 11개 통과. 서비스 오류·실제 엔진 누락·불완전 결과·인증·자식 프로세스 시간 초과·누락/만료 정의 파일·Mac 경로 선택 확인 |
| 코드 검사·기존 자동 시험 | `pnpm check`, 어댑터 단독 TypeScript 검사, 기존 `pnpm test` 122개 통과 |
| 실제 홈페이지 관리자 업무 통합 | **미완료**. Ubuntu HTTPS 인증서·직원 인증 비밀 설정·책임자 계정과 실제 역할별 로그인·업로드 검수가 선행 조건 |
| 실제 Mac 재실행·운영 검사 | **미확인/미실시**. Mac 경로 선택 회귀 시험을 실제 Mac 실행 완료로 표시하지 않음 |

가상 파일·재처리 결과·시험 보고서는 작업 자료의 `fixtures/`와 `results/`에 남기며 Git에서 제외합니다. 실제 회사 파일·기존 업무 DB에는 쓰지 않습니다. 실제 고객 접수 잠금은 유지합니다.

정상 처리한 이미지 3개의 재디코딩·EXIF 제거와 PNG 설명 메타데이터 제거도 확인했습니다. 검증 종료 후 실제 검사 서비스를 127.0.0.1:8790에서 재실행했습니다. 공개 홈페이지 서버는 중지하지 않았습니다.
