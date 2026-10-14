ALTER TABLE staff_passwords ADD COLUMN local_only INTEGER NOT NULL DEFAULT 0 CHECK(local_only IN (0,1));
