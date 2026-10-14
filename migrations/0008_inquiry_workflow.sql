ALTER TABLE inquiries ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE inquiries ADD COLUMN updated_at INTEGER;
ALTER TABLE inquiries ADD COLUMN assignee_id TEXT REFERENCES staff(id);
ALTER TABLE inquiries ADD COLUMN closed_at INTEGER;
ALTER TABLE inquiries ADD COLUMN first_normal_received_at INTEGER;
ALTER TABLE inquiries ADD COLUMN first_normal_marker TEXT;
UPDATE inquiries SET first_normal_received_at=verified_at,first_normal_marker='legacy:'||id WHERE verified_at IS NOT NULL AND classification='normal';
ALTER TABLE inquiries ADD COLUMN delivery_seq INTEGER NOT NULL DEFAULT 0;
ALTER TABLE inquiries ADD COLUMN purge_started_at INTEGER;
ALTER TABLE inquiry_events ADD COLUMN actor_id TEXT REFERENCES staff(id);
ALTER TABLE inquiry_events ADD COLUMN reason TEXT NOT NULL DEFAULT '';
ALTER TABLE inquiry_events ADD COLUMN before_json TEXT;
ALTER TABLE inquiry_events ADD COLUMN after_json TEXT;
ALTER TABLE staff ADD COLUMN inquiry_notify INTEGER NOT NULL DEFAULT 0 CHECK(inquiry_notify IN(0,1));
CREATE TABLE inquiry_messages (
 id TEXT PRIMARY KEY, inquiry_id TEXT NOT NULL REFERENCES inquiries(id),
 kind TEXT NOT NULL CHECK(kind IN('customer','reply','note')), body TEXT NOT NULL DEFAULT '',
 staff_id TEXT REFERENCES staff(id), status TEXT NOT NULL CHECK(status IN('draft','sent')),
 customer_request_id TEXT, correction_of_id TEXT REFERENCES inquiry_messages(id), version INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, delivered_at INTEGER, delivery_seq INTEGER,
 CHECK(kind<>'customer' OR status='sent')
);
INSERT INTO inquiry_messages(id,inquiry_id,kind,body,status,created_at,updated_at)
 SELECT 'initial:'||id,id,'customer',body,'sent',created_at,created_at FROM inquiries;
CREATE TABLE inquiry_message_actions (
 customer_message_id TEXT PRIMARY KEY REFERENCES inquiry_messages(id),
 response_message_id TEXT REFERENCES inquiry_messages(id), handled_by TEXT NOT NULL REFERENCES staff(id),
 at INTEGER NOT NULL, reason TEXT NOT NULL
);
CREATE TABLE inquiry_quotes (
 id TEXT PRIMARY KEY, inquiry_id TEXT NOT NULL REFERENCES inquiries(id), title TEXT NOT NULL,
 body TEXT NOT NULL DEFAULT '', file_id TEXT REFERENCES files(id), number INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN('draft','sent','superseded')),
 version INTEGER NOT NULL DEFAULT 1, created_by TEXT NOT NULL REFERENCES staff(id),
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, delivered_at INTEGER, delivery_seq INTEGER,
 previous_id TEXT REFERENCES inquiry_quotes(id), UNIQUE(inquiry_id,number)
);
CREATE UNIQUE INDEX inquiry_latest_quote ON inquiry_quotes(inquiry_id) WHERE status='sent';
CREATE TABLE customer_read_positions (
 scope_hash TEXT NOT NULL, inquiry_id TEXT NOT NULL REFERENCES inquiries(id), auth_version INTEGER NOT NULL,
 last_delivery INTEGER NOT NULL, seen_at INTEGER NOT NULL, PRIMARY KEY(scope_hash,inquiry_id,auth_version)
);
CREATE TABLE inquiry_notifications (
 id TEXT PRIMARY KEY, inquiry_id TEXT NOT NULL REFERENCES inquiries(id), event_key TEXT NOT NULL,
 auth_version INTEGER NOT NULL, audience TEXT NOT NULL CHECK(audience IN('customer','staff')),
 staff_id TEXT REFERENCES staff(id), template TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN('pending','processing','accepted','failed','unknown','cancelled')),
 attempts INTEGER NOT NULL DEFAULT 0, available_at INTEGER NOT NULL, lease_token TEXT, lease_until INTEGER,
 provider_receipt TEXT, created_at INTEGER NOT NULL, UNIQUE(event_key,audience,staff_id)
);
CREATE UNIQUE INDEX customer_message_request ON inquiry_messages(inquiry_id,customer_request_id) WHERE customer_request_id IS NOT NULL;
CREATE INDEX inquiry_messages_parent ON inquiry_messages(inquiry_id,created_at,id);
CREATE INDEX inquiry_events_parent ON inquiry_events(inquiry_id,at,id);
CREATE INDEX inquiry_normal_list ON inquiries(classification,verified_at,deleted_at,status,created_at,id);

CREATE UNIQUE INDEX customer_notification_event ON inquiry_notifications(event_key) WHERE audience='customer';
