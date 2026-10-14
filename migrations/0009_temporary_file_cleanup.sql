-- Only expired unused reservations enter this queue; no business retention policy.
CREATE TABLE file_cleanup_jobs (
 file_id TEXT PRIMARY KEY REFERENCES files(id),
 attempts INTEGER NOT NULL DEFAULT 0,
 available_at INTEGER NOT NULL,
 completed_at INTEGER,
 last_result TEXT CHECK(last_result IN ('retry','referenced','removed'))
);
