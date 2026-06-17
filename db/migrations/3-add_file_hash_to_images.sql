ALTER TABLE images ADD COLUMN file_hash VARCHAR(64);
CREATE INDEX idx_images_file_hash ON images(file_hash);