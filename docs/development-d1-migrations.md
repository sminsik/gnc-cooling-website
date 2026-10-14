# 개발 D1 마이그레이션 검토·적용·검증

2026-10-14, 대상 `gnc-cooling-development`. 사용자의 명시적 승인에 따라 기존 마이그레이션 12개를 새 격리 로컬 DB에서 검증한 뒤 개발용 원격 D1에만 적용했습니다. 운영 DB·기존 로컬 DB·HTTPS 시연 데이터·R2·Worker·도메인은 변경하지 않았습니다.

## 대상과 사전 조건

Git 제외 `configs/wrangler.development.jsonc`의 계정 ID가 인증된 계정 목록에 포함됨을 확인했습니다. `d1 info --json`의 DB 이름·UUID가 설정과 일치했고 테이블 수는 0개였습니다. `sqlite_master`도 Cloudflare/SQLite 내부 오브젝트를 제외하면 비어 있었습니다. 적용 직전 동일 검사를 재실행했습니다. 실제 ID·계정 이메일·토큰·설정 원문은 문서나 커밋에 포함하지 않습니다.

검토 소스는 커밋 `952264f`의 `migrations/0001`~`0012`이며 이번 작업에서 SQL을 수정하지 않았습니다. 파일명과 원문을 순서대로 JSON 직렬화한 SHA-256은 `a7a12bd0318ab1627bd6c7df434132b9ea5982dced12800fb9eb95f54bf9070b`입니다. 원격 적용 직전에 격리 검증 기록의 해시와 소스 해시 일치를 확인했습니다.

## 12개 SQL의 영향

`DROP`·`DELETE`·`TRUNCATE` 문은 없습니다. 이름 변경·열 추가·데이터 이관/갱신은 있으므로 기존 업무 데이터가 있는 DB에 빈 DB 검증 결과를 그대로 적용하면 안 됩니다.

| 순서·파일 | 구조와 데이터 영향 | 이번 빈 DB에서의 결과 |
| --- | --- | --- |
| 0001_catalog.sql | 최초 products/projects/documents 생성 | 빈 테이블 생성 |
| 0002_product_structure.sql | products를 legacy_products로 보존. 제품군·제품/모델·사양·파일·연결 구조 신설. 기존 제품군은 비활성으로 이관, 제품/모델은 draft로 이관. 기존 공개 플래그와 specifications_json은 legacy에 보존하고 단위/사양을 추정 변환하지 않음 | 기본 제품군 3건만 입력; 이관 대상 0건 |
| 0003_staff_content.sql | 직원·역할·세션·초대·인증 흐름·업무 claim/감사·공지·자료 구조 생성. projects를 legacy_projects로 보존 후 draft로 이관. 제품군 version·관련 인덱스·인증 제한 추가 | 직원·콘텐츠 입력 없음, 사례 이관 0건 |
| 0004_content_files.sql | 파일 소유·대상·검사·만료 등의 열, 업로드 허가·검사 작업 큐·인덱스 추가 | 파일·작업 0건 |
| 0005_file_attachment.sql | files.attached 기본값 0과 boolean 제약 추가 | ready 상태만으로 공개 콘텐츠에 연결하지 않음 |
| 0006_staff_auth_operations.sql | 최초 관리자 bootstrap, 로그인 등 인증 이력·시간 인덱스 생성 | 관리자/계정 자동 생성 없음 |
| 0007_customer_inquiries.sql | 고객 문의·검증·세션·업로드·메일 대기·제한 테이블과 인덱스 생성 | 고객/문의/메일 데이터 없음 |
| 0008_inquiry_workflow.sql | 문의 담당·버전·상태 기록·전달 순서·메시지·견적·알림·읽음 구조 추가. 기존 정상 인증 문의 시각/marker 갱신, 기존 본문을 initial customer 메시지로 이관. 일부 조건부 UNIQUE 인덱스 생성 | UPDATE/이관 대상 0건 |
| 0009_temporary_file_cleanup.sql | 임시 파일 정리 큐 생성; 업무 데이터 보관/삭제 정책 자체는 설정하지 않음 | 파일 삭제 실행 없음 |
| 0010_verification_mail_unknown.sql | unknown_at 추가. 미발송·미실패·lease_token 있는 기존 대기 메일을 불명 상태로 표시하고 lease_until 해제 | 갱신 대상 0건; 외부 메일 발송 없음 |
| 0011_staff_passwords.sql | PBKDF2 600000회 제약을 갖는 비밀번호·재설정 구조, 초대 소비 기록/유일성 추가 | 비밀번호·초대 입력 없음 |
| 0012_local_password_scope.sql | staff_passwords.local_only 기본값 0과 boolean 제약 추가 | 로컬 가상 계정/비밀번호를 가져오지 않음 |

이관 SQL은 테이블을 보존하지만 재실행에 안전한 SQL은 아닙니다. Wrangler의 적용 이력으로 순서를 관리하며 오류가 나면 DB를 삭제하거나 무조건 재실행하지 않습니다. 실패한 파일은 롤백되고 이전 성공 파일은 남을 수 있으므로 적용 이력과 스키마를 읽기 전용으로 확인한 뒤 복구 범위를 결정합니다. 이 동작은 설치된 Wrangler 4.149의 `d1 migrations apply` 설명을 확인했습니다. [공식 마이그레이션 안내](https://developers.cloudflare.com/d1/reference/migrations/)

## 검증 결과

| 검사 | 새 격리 로컬 D1 | 원격 개발 D1 |
| --- | --- | --- |
| 전체 순서·이력 | 0001~0012 순차 적용, 12건 | 0001~0012 순차 적용, 12건 |
| 미적용 파일 | 0개 | 0개 — SQL로 읽은 이력과 현재 12개 파일명 비교 |
| 앱 테이블·열 | 41개·346개 | 전체 정의와 PRAGMA 열 목록 일치 |
| 인덱스 | 명시적 19개, 자동 포함 78개 | 정의·unique/partial 속성·인덱스 열 목록 모두 일치 |
| 외래키 | 45개 | 전체 foreign_key_list 일치, foreign_key_check 위반 0건 |
| 무결성 | 실제 시험 SQLite integrity_check 및 quick_check 정상 | D1 지원 quick_check 정상 |
| 행 수 | product_categories 3건, 나머지 40개 앱 테이블 0건 | 동일 |

41개는 앱 테이블만 센 값입니다. 별도로 `d1_migrations` 적용 이력 테이블에 12건이 있으며 Cloudflare/SQLite 내부 테이블은 집계에서 제외했습니다. 기본 데이터는 `cooling-towers`/냉각탑, `chillers`/칠러, `heat-exchangers`/열교환기 3건이며 sort_order 1~3, active=1, version=1입니다. 실제 제품·직원·고객·문의·첨부·시연 콘텐츠는 입력하지 않았습니다.

독립적인 SQLite 참조 DB에 같은 SQL을 적용해 예상 스키마와 행 수를 만들고, Wrangler 격리 DB 및 원격 D1의 sqlite_master, 모든 table_info·foreign_key_list·index_list·index_info 결과와 비교했습니다. CHECK/기본값/조건부 인덱스 표현은 정규화한 CREATE 정의까지 비교합니다. 원격에서는 물리 SQLite 파일을 받지 않았고, integrity_check를 원격에서 실행한 것으로 보고하지 않습니다. 지원되는 quick_check와 외래키 검사를 사용했습니다. [D1 지원 SQL·PRAGMA](https://developers.cloudflare.com/d1/sql-api/sql-statements/)

검증은 여러 읽기 전용 배치로 실행했으며 단일 트랜잭션의 원자적 스냅샷은 아닙니다. 현재 배포/업무 데이터 입력이 없는 개발 DB의 점검 결과입니다. 향후 동시 쓰기가 생기면 일관성 확보 방법을 별도로 마련해야 합니다. 빈 DB 검증은 실제 legacy 데이터 이관·활성 직원 인증·메일/검사 통합·장애 복원 시험을 대신하지 않습니다.

## 재현·재점검 명령

프로젝트 루트에서 Node.js 24.21.0과 pnpm 12.11.2를 사용합니다. 실제 개발 설정은 이 컴퓨터의 Git 제외 경로에 있어야 합니다.

```sh
nvm use

# 새 격리 DB를 매번 생성. 원격 API/기존 로컬 DB에 적용하지 않음.
node scripts/check-development-d1.mjs --local

# 현재 원격 스키마·이력·기본 데이터·업무 데이터 0건 상태의 읽기 전용 검증
node scripts/check-development-d1.mjs --verify-remote
```

`--local`은 `.cloudflare-plan/migration-validation-*/` 아래에 가짜 계정/DB ID를 가진 시험 설정, Wrangler state와 검증 요약을 만듭니다. 이 디렉터리는 Git 제외 상태입니다. 인증 관련 환경변수를 제거하고 `--local --persist-to`를 명시합니다. Wrangler의 로컬 소켓 사용이 제한된 실행 환경에서는 권한 승인 후 실행해야 합니다. 최초 제한된 환경의 시도는 실패했으며, 새 시험 경로에서 실행한 검증은 통과했습니다. 실제 SQLite 무결성 조회 시 Wrangler의 metadata.sqlite/cache DB를 제외하고 시험 D1 파일만 선택합니다.

다음은 **적용 전 빈 DB 확인 및 이번에 실행한 원격 적용 명령**의 기록입니다. 현재 DB는 이미 적용됐으므로 `--preflight`는 테이블 0개 조건에서 의도적으로 중단됩니다. 기존 DB 재실행 지시가 아닙니다.

```sh
node scripts/check-development-d1.mjs --preflight
pnpm exec wrangler d1 migrations apply DB --remote --config configs/wrangler.development.jsonc --env=''
node scripts/check-development-d1.mjs --verify-remote
```

스크립트의 원격 두 모드는 계정/DB 확인과 SELECT·읽기 전용 PRAGMA만 실행합니다. 원격 적용 기능은 스크립트에 넣지 않았습니다. `--verify-remote`는 최초 마이그레이션 직후의 빈 업무 테이블을 기준으로 하므로 향후 업무 데이터가 입력되면 행 수 차이로 실패할 수 있습니다. 이를 데이터 삭제나 자동 재시도로 해결하지 않습니다. 이력에는 파일명이 저장되며 SQL 원문 체크섬이 자동 저장되는 것은 아니므로 검증 소스 해시와 Git 기록을 함께 보존합니다.

## 보존 범위와 다음 작업

이번 커밋은 검증 스크립트와 문서만 포함합니다. 마이그레이션 SQL·루트 로컬 설정·운영 템플릿은 변경하지 않았습니다. 실제 개발 설정·시험 DB·검증 임시 기록·비밀값은 제외했습니다. Worker 배포·외부 공개·R2 파일 업로드·메일/검사 연결·직원 계정 생성은 수행하지 않았습니다.

다음 단계는 원격 백업/격리 복원 기반, 클라우드 파일 검사 실행 환경과 비공개 통신·실패 시 차단 정책, 인증/메일/개인정보 선행 조건의 별도 설계·승인입니다. 현재 기능 잠금은 유지합니다.

## 예상 스키마 목록

아래는 검토한 마이그레이션으로 생성한 예상 목록입니다. 실제 데이터나 DB 덤프가 아니며 원격 조회 결과와 전체 비교했습니다.

| 테이블 | 열 (정의 순서) | 외래키 수 | 초기 행 수 |
| --- | --- | --- | --- |
| `audit_logs` | id, operation_id, actor_id, target_type, target_id, action, at, reason, before_json, after_json | 2 | 0 |
| `customer_read_positions` | scope_hash, inquiry_id, auth_version, last_delivery, seen_at | 1 | 0 |
| `customer_sessions` | token_hash, csrf_hash, email, snapshot_json, created_at, expires_at | 0 | 0 |
| `customer_upload_groups` | id, owner_hash, purpose, expires_at, inquiry_id | 1 | 0 |
| `customer_upload_permits` | file_id, group_id, token_hash, expires_at, used_at | 2 | 0 |
| `customer_verifications` | token_hash, email, scope, snapshot_json, expires_at, consumed_at, revoked_at, consume_marker, created_at | 0 | 0 |
| `documents` | id, title, object_key, published, created_at | 0 | 0 |
| `file_cleanup_jobs` | file_id, attempts, available_at, completed_at, last_result | 1 | 0 |
| `file_jobs` | file_id, attempts, available_at, lease_token, lease_until, completed_at | 1 | 0 |
| `file_links` | file_id, product_id, purpose, alt, caption, sort_order | 2 | 0 |
| `files` | id, object_key, original_name, mime, size_bytes, purpose, status, validated_at, deleted_at, created_at, owner_id, target_type, target_id, alt, version, scan_engine, scan_reason, source_key, expires_at, attached | 1 | 0 |
| `inquiries` | id, receipt, owner_hash, request_id, input_hash, kind, work, title, company, name, phone, email, region, body, equipment, dimensions, connection_json, consent_json, status, classification, signals_json, verified_at, auth_version, created_at, deleted_at, version, updated_at, assignee_id, closed_at, first_normal_received_at, first_normal_marker, delivery_seq, purge_started_at | 1 | 0 |
| `inquiry_events` | id, inquiry_id, action, at, actor_id, reason, before_json, after_json | 2 | 0 |
| `inquiry_mail_outbox` | id, verification_hash, payload_cipher, attempts, available_at, lease_token, lease_until, sent_at, provider_receipt, failed_at, unknown_at | 1 | 0 |
| `inquiry_message_actions` | customer_message_id, response_message_id, handled_by, at, reason | 3 | 0 |
| `inquiry_messages` | id, inquiry_id, kind, body, staff_id, status, customer_request_id, correction_of_id, version, created_at, updated_at, delivered_at, delivery_seq | 3 | 0 |
| `inquiry_notifications` | id, inquiry_id, event_key, auth_version, audience, staff_id, template, state, attempts, available_at, lease_token, lease_until, provider_receipt, created_at | 2 | 0 |
| `inquiry_quotes` | id, inquiry_id, title, body, file_id, number, status, version, created_by, created_at, updated_at, delivered_at, delivery_seq, previous_id | 4 | 0 |
| `inquiry_rates` | key, count, expires_at | 0 | 0 |
| `inquiry_sessions` | token_hash, csrf_hash, expires_at | 0 | 0 |
| `legacy_products` | id, category, model_name, description, specifications_json, published, created_at | 0 | 0 |
| `legacy_projects` | id, title, work_type, description, published, created_at | 0 | 0 |
| `model_specifications` | id, model_id, name, value_text, unit, sort_order | 1 | 0 |
| `notices` | id, title, body, pinned, publication_status, posted_at, deleted_at, version, created_at, updated_at | 0 | 0 |
| `operation_claims` | id, request_id, actor_id, target_type, target_id, created_at, before_json | 1 | 0 |
| `product_categories` | id, name, parent_id, sort_order, active, version | 1 | 3 |
| `product_models` | id, product_id, name, description, availability, sort_order, publication_status, first_published_at, deleted_at, version, created_at, updated_at | 1 | 0 |
| `products` | id, category_id, name, intro, description, primary_file_id, featured, featured_order, sort_order, publication_status, first_published_at, deleted_at, version, created_at, updated_at | 2 | 0 |
| `projects` | id, title, work_type, description, approval_by, approval_at, primary_file_id, publication_status, first_published_at, deleted_at, version, created_at, updated_at | 1 | 0 |
| `resources` | id, title, category, description, file_id, publication_status, first_published_at, deleted_at, version, created_at, updated_at | 1 | 0 |
| `staff` | id, name, email, provider_issuer, provider_subject, status, auth_version, version, created_at, last_login_at, inquiry_notify | 0 | 0 |
| `staff_auth_events` | id, staff_id, event, at | 1 | 0 |
| `staff_auth_flows` | state_hash, nonce_hash, verifier_hash, invitation_id, return_path, expires_at, used_at, consumed_by | 1 | 0 |
| `staff_auth_rates` | key_hash, count, expires_at | 0 | 0 |
| `staff_bootstrap` | id, staff_id, created_at | 1 | 0 |
| `staff_invitations` | id, staff_id, token_hash, expires_at, used_at, revoked_at, consumed_by | 1 | 0 |
| `staff_password_resets` | id, staff_id, token_hash, auth_version, expires_at, used_at, revoked_at, consumed_by | 1 | 0 |
| `staff_passwords` | staff_id, salt, digest, iterations, version, changed_at, local_only | 1 | 0 |
| `staff_roles` | staff_id, role | 1 | 0 |
| `staff_sessions` | token_hash, staff_id, csrf_hash, auth_version, created_at, last_seen_at, expires_at, revoked_at | 1 | 0 |
| `upload_permits` | id, file_id, token_hash, owner_id, expires_at, used_at | 2 | 0 |

### 명시적 인덱스 19개

| 이름 | 정의 |
| --- | --- |
| `auth_events_time` | `CREATE INDEX auth_events_time ON staff_auth_events(at,id)` |
| `categories_parent` | `CREATE INDEX categories_parent ON product_categories(parent_id,active)` |
| `customer_message_request` | `CREATE UNIQUE INDEX customer_message_request ON inquiry_messages(inquiry_id,customer_request_id) WHERE customer_request_id IS NOT NULL` |
| `customer_notification_event` | `CREATE UNIQUE INDEX customer_notification_event ON inquiry_notifications(event_key) WHERE audience='customer'` |
| `file_links_product` | `CREATE INDEX file_links_product ON file_links(product_id,purpose,sort_order)` |
| `files_target` | `CREATE INDEX files_target ON files(target_type,target_id,deleted_at,status)` |
| `inquiries_email` | `CREATE INDEX inquiries_email ON inquiries(email,classification,deleted_at)` |
| `inquiry_events_parent` | `CREATE INDEX inquiry_events_parent ON inquiry_events(inquiry_id,at,id)` |
| `inquiry_latest_quote` | `CREATE UNIQUE INDEX inquiry_latest_quote ON inquiry_quotes(inquiry_id) WHERE status='sent'` |
| `inquiry_mail_pending` | `CREATE INDEX inquiry_mail_pending ON inquiry_mail_outbox(sent_at,failed_at,available_at)` |
| `inquiry_messages_parent` | `CREATE INDEX inquiry_messages_parent ON inquiry_messages(inquiry_id,created_at,id)` |
| `inquiry_normal_list` | `CREATE INDEX inquiry_normal_list ON inquiries(classification,verified_at,deleted_at,status,created_at,id)` |
| `invitation_consumer` | `CREATE UNIQUE INDEX invitation_consumer ON staff_invitations(consumed_by)` |
| `jobs_pending` | `CREATE INDEX jobs_pending ON file_jobs(completed_at,available_at,lease_until)` |
| `models_product` | `CREATE INDEX models_product ON product_models(product_id,publication_status,deleted_at,sort_order,id)` |
| `notices_public` | `CREATE INDEX notices_public ON notices(publication_status,deleted_at,pinned,posted_at,id)` |
| `products_public_list` | `CREATE INDEX products_public_list ON products(publication_status,deleted_at,category_id,sort_order,id)` |
| `specifications_model` | `CREATE INDEX specifications_model ON model_specifications(model_id,sort_order,id)` |
| `staff_sessions_owner` | `CREATE INDEX staff_sessions_owner ON staff_sessions(staff_id)` |
