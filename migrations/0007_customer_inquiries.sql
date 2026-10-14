-- No customer seed data. Intake remains disabled until explicitly approved/configured.
CREATE TABLE inquiry_sessions (
 token_hash TEXT PRIMARY KEY, csrf_hash TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE inquiries (
 id TEXT PRIMARY KEY, receipt TEXT NOT NULL UNIQUE, owner_hash TEXT NOT NULL,
 request_id TEXT NOT NULL, input_hash TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN('consultation','as')), work TEXT NOT NULL,
 title TEXT NOT NULL, company TEXT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL,
 email TEXT NOT NULL, region TEXT NOT NULL, body TEXT NOT NULL, equipment TEXT NOT NULL,
 dimensions TEXT NOT NULL, connection_json TEXT NOT NULL, consent_json TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'received' CHECK(status IN('received','in_progress','completed','cancelled')),
 classification TEXT NOT NULL CHECK(classification IN('normal','suspected','spam')),
 signals_json TEXT NOT NULL, verified_at INTEGER, auth_version INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL, deleted_at INTEGER,
 UNIQUE(owner_hash,request_id)
);
CREATE TABLE inquiry_events (
 id TEXT PRIMARY KEY, inquiry_id TEXT NOT NULL REFERENCES inquiries(id), action TEXT NOT NULL, at INTEGER NOT NULL
);
CREATE TABLE customer_verifications (
 token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, scope TEXT NOT NULL,
 snapshot_json TEXT NOT NULL, expires_at INTEGER NOT NULL, consumed_at INTEGER, revoked_at INTEGER,
 consume_marker TEXT UNIQUE, created_at INTEGER NOT NULL
);
CREATE TABLE customer_sessions (
 token_hash TEXT PRIMARY KEY, csrf_hash TEXT NOT NULL, email TEXT NOT NULL,
 snapshot_json TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE inquiry_rates (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE inquiry_mail_outbox (
 id TEXT PRIMARY KEY, verification_hash TEXT NOT NULL UNIQUE REFERENCES customer_verifications(token_hash),
 payload_cipher TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, available_at INTEGER NOT NULL,
 lease_token TEXT, lease_until INTEGER, sent_at INTEGER, provider_receipt TEXT, failed_at INTEGER
);
CREATE TABLE customer_upload_groups (
 id TEXT PRIMARY KEY, owner_hash TEXT NOT NULL, purpose TEXT NOT NULL CHECK(purpose='inquiry'),
 expires_at INTEGER NOT NULL, inquiry_id TEXT UNIQUE REFERENCES inquiries(id)
);
CREATE TABLE customer_upload_permits (
 file_id TEXT PRIMARY KEY REFERENCES files(id), group_id TEXT NOT NULL REFERENCES customer_upload_groups(id),
 token_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER
);
CREATE INDEX inquiries_email ON inquiries(email,classification,deleted_at);
CREATE INDEX inquiry_mail_pending ON inquiry_mail_outbox(sent_at,failed_at,available_at);
