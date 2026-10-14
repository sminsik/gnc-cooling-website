CREATE TABLE staff_passwords (
 staff_id TEXT PRIMARY KEY REFERENCES staff(id),
 salt TEXT NOT NULL, digest TEXT NOT NULL,
 iterations INTEGER NOT NULL CHECK(iterations=600000),
 version INTEGER NOT NULL DEFAULT 1, changed_at INTEGER NOT NULL
);
CREATE TABLE staff_password_resets (
 id TEXT PRIMARY KEY, staff_id TEXT NOT NULL REFERENCES staff(id),
 token_hash TEXT NOT NULL UNIQUE, auth_version INTEGER NOT NULL,
 expires_at INTEGER NOT NULL, used_at INTEGER, revoked_at INTEGER, consumed_by TEXT UNIQUE
);
ALTER TABLE staff_invitations ADD COLUMN consumed_by TEXT;
CREATE UNIQUE INDEX invitation_consumer ON staff_invitations(consumed_by);
