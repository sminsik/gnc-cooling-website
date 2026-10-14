-- Preserve original trial values and their publication flags without exposing them.
ALTER TABLE products RENAME TO legacy_products;
CREATE TABLE product_categories (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, parent_id TEXT REFERENCES product_categories(id),
 sort_order INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),
 CHECK(parent_id IS NULL OR parent_id <> id)
);
CREATE TABLE files (
 id TEXT PRIMARY KEY, object_key TEXT NOT NULL UNIQUE, original_name TEXT NOT NULL,
 mime TEXT NOT NULL, size_bytes INTEGER NOT NULL CHECK(size_bytes>=0),
 purpose TEXT NOT NULL CHECK(purpose IN('public_image','private')),
 status TEXT NOT NULL DEFAULT 'temporary' CHECK(status IN('temporary','validating','ready','blocked','pending_deletion')),
 validated_at TEXT, deleted_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE products (
 id TEXT PRIMARY KEY, category_id TEXT NOT NULL REFERENCES product_categories(id),
 name TEXT NOT NULL, intro TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
 primary_file_id TEXT REFERENCES files(id),
 featured INTEGER NOT NULL DEFAULT 0 CHECK(featured IN(0,1)), featured_order INTEGER NOT NULL DEFAULT 0,
 sort_order INTEGER NOT NULL DEFAULT 0,
 publication_status TEXT NOT NULL DEFAULT 'draft' CHECK(publication_status IN('draft','published','hidden')),
 first_published_at TEXT, deleted_at TEXT, version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE product_models (
 id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id), name TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '', availability TEXT NOT NULL DEFAULT 'available' CHECK(availability IN('available','discontinued')),
 sort_order INTEGER NOT NULL DEFAULT 0,
 publication_status TEXT NOT NULL DEFAULT 'draft' CHECK(publication_status IN('draft','published','hidden')),
 first_published_at TEXT, deleted_at TEXT, version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(product_id,name)
);
CREATE TABLE model_specifications (
 id TEXT PRIMARY KEY, model_id TEXT NOT NULL REFERENCES product_models(id), name TEXT NOT NULL,
 value_text TEXT NOT NULL DEFAULT '', unit TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE file_links (
 file_id TEXT NOT NULL REFERENCES files(id), product_id TEXT NOT NULL REFERENCES products(id),
 purpose TEXT NOT NULL CHECK(purpose IN('primary_image','additional_image')),
 alt TEXT NOT NULL, caption TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(file_id,product_id)
);
CREATE INDEX products_public_list ON products(publication_status,deleted_at,category_id,sort_order,id);
CREATE INDEX models_product ON product_models(product_id,publication_status,deleted_at,sort_order,id);
CREATE INDEX specifications_model ON model_specifications(model_id,sort_order,id);
INSERT INTO product_categories(id,name,sort_order) VALUES
 ('cooling-towers','냉각탑',1),('chillers','칠러',2),('heat-exchangers','열교환기',3);
-- Legacy categories stay inactive until actual company data is confirmed.
INSERT INTO product_categories(id,name,active)
 SELECT DISTINCT 'legacy:'||category,category,0 FROM legacy_products;
INSERT INTO products(id,category_id,name,description,created_at)
 SELECT id,'legacy:'||category,model_name,description,created_at FROM legacy_products;
INSERT INTO product_models(id,product_id,name,created_at)
 SELECT 'legacy:'||id,id,model_name,created_at FROM legacy_products;
-- specifications_json remains intact in legacy_products; units are not guessed.
