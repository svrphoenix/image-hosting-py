
CREATE TABLE images (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL UNIQUE,
    original_name TEXT NOT NULL,
    size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    views INTEGER NOT NULL DEFAULT 0,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_images_file_hash ON images(file_hash);
CREATE INDEX idx_images_deleted_at ON images(deleted_at);
CREATE INDEX idx_images_upload_time ON images(upload_time);