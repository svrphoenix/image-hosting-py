-- 2_add_fields_to_images.sql
ALTER TABLE images ADD COLUMN views INTEGER DEFAULT 0 NOT NULL;