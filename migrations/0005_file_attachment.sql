-- Ready files enter public content only after an explicit content save.
ALTER TABLE files ADD COLUMN attached INTEGER NOT NULL DEFAULT 0 CHECK(attached IN(0,1));
