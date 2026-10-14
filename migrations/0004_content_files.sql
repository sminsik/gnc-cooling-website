ALTER TABLE files ADD COLUMN owner_id TEXT REFERENCES staff(id);
ALTER TABLE files ADD COLUMN target_type TEXT;
ALTER TABLE files ADD COLUMN target_id TEXT;
ALTER TABLE files ADD COLUMN alt TEXT NOT NULL DEFAULT '';
ALTER TABLE files ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE files ADD COLUMN scan_engine TEXT;
ALTER TABLE files ADD COLUMN scan_reason TEXT;
ALTER TABLE files ADD COLUMN source_key TEXT;
ALTER TABLE files ADD COLUMN expires_at INTEGER;
CREATE TABLE upload_permits (
 id TEXT PRIMARY KEY, file_id TEXT NOT NULL UNIQUE REFERENCES files(id), token_hash TEXT NOT NULL,
 owner_id TEXT NOT NULL REFERENCES staff(id), expires_at INTEGER NOT NULL, used_at INTEGER
);
CREATE TABLE file_jobs (
 file_id TEXT PRIMARY KEY REFERENCES files(id), attempts INTEGER NOT NULL DEFAULT 0,
 available_at INTEGER NOT NULL, lease_token TEXT, lease_until INTEGER, completed_at INTEGER
);
CREATE INDEX files_target ON files(target_type,target_id,deleted_at,status);
CREATE INDEX jobs_pending ON file_jobs(completed_at,available_at,lease_until);
