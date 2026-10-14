-- First phase: public content only. Customer records are designed with authentication later.
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  model_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  specifications_json TEXT NOT NULL DEFAULT '{}',
  published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  work_type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
