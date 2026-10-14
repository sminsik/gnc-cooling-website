CREATE TABLE staff (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
 provider_issuer TEXT NOT NULL, provider_subject TEXT,
 status TEXT NOT NULL DEFAULT 'invited' CHECK(status IN('invited','active','suspended')),
 auth_version INTEGER NOT NULL DEFAULT 1, version INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL, last_login_at INTEGER,
 UNIQUE(provider_issuer,provider_subject)
);
CREATE TABLE staff_roles (
 staff_id TEXT NOT NULL REFERENCES staff(id), role TEXT NOT NULL CHECK(role IN('content_manager','inquiry_manager','admin')),
 PRIMARY KEY(staff_id,role)
);
CREATE TABLE staff_sessions (
 token_hash TEXT PRIMARY KEY, staff_id TEXT NOT NULL REFERENCES staff(id), csrf_hash TEXT NOT NULL,
 auth_version INTEGER NOT NULL, created_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL, revoked_at INTEGER
);
CREATE INDEX staff_sessions_owner ON staff_sessions(staff_id);
CREATE TABLE staff_invitations (
 id TEXT PRIMARY KEY, staff_id TEXT NOT NULL REFERENCES staff(id), token_hash TEXT NOT NULL UNIQUE,
 expires_at INTEGER NOT NULL, used_at INTEGER, revoked_at INTEGER
);
CREATE TABLE staff_auth_flows (
 state_hash TEXT PRIMARY KEY, nonce_hash TEXT NOT NULL, verifier_hash TEXT NOT NULL,
 invitation_id TEXT REFERENCES staff_invitations(id), return_path TEXT NOT NULL,
 expires_at INTEGER NOT NULL, used_at INTEGER, consumed_by TEXT
);
CREATE TABLE operation_claims (
 id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE, actor_id TEXT NOT NULL REFERENCES staff(id), target_type TEXT NOT NULL,
 target_id TEXT NOT NULL, created_at INTEGER NOT NULL, before_json TEXT
);
CREATE TABLE audit_logs (
 id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE REFERENCES operation_claims(id),
 actor_id TEXT NOT NULL REFERENCES staff(id), target_type TEXT NOT NULL, target_id TEXT NOT NULL,
 action TEXT NOT NULL, at INTEGER NOT NULL, reason TEXT NOT NULL DEFAULT '', before_json TEXT, after_json TEXT
);
CREATE TABLE notices (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', pinned INTEGER NOT NULL DEFAULT 0 CHECK(pinned IN(0,1)),
 publication_status TEXT NOT NULL DEFAULT 'draft' CHECK(publication_status IN('draft','published','hidden')),
 posted_at TEXT, deleted_at TEXT, version INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE projects RENAME TO legacy_projects;
CREATE TABLE projects (
 id TEXT PRIMARY KEY,title TEXT NOT NULL,work_type TEXT NOT NULL DEFAULT '',description TEXT NOT NULL DEFAULT '',
 approval_by TEXT NOT NULL DEFAULT '',approval_at TEXT, primary_file_id TEXT REFERENCES files(id),
 publication_status TEXT NOT NULL DEFAULT 'draft' CHECK(publication_status IN('draft','published','hidden')),
 first_published_at TEXT,deleted_at TEXT,version INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO projects(id,title,work_type,description,created_at)
 SELECT id,title,work_type,description,created_at FROM legacy_projects;
CREATE TABLE resources (
 id TEXT PRIMARY KEY,title TEXT NOT NULL,category TEXT NOT NULL DEFAULT '',description TEXT NOT NULL DEFAULT '',
 file_id TEXT REFERENCES files(id),publication_status TEXT NOT NULL DEFAULT 'draft' CHECK(publication_status IN('draft','published','hidden')),
 first_published_at TEXT,deleted_at TEXT,version INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX notices_public ON notices(publication_status,deleted_at,pinned,posted_at,id);
ALTER TABLE product_categories ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
CREATE INDEX file_links_product ON file_links(product_id,purpose,sort_order);
CREATE INDEX categories_parent ON product_categories(parent_id,active);

CREATE TABLE staff_auth_rates (key_hash TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
