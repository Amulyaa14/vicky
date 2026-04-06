-- Database Migration for Cloudflare D1
-- This fixes the "table users has no column named password_hash" error

-- Option 1: If the users table exists but is missing the password_hash column
ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';

-- Option 2: If you need to create the users table from scratch
-- Uncomment the following if the table doesn't exist:

/*
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
*/

-- Audio conversion history for MP4 to MP3 exports
CREATE TABLE IF NOT EXISTS audio_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    source_format TEXT NOT NULL,
    target_format TEXT NOT NULL,
    file_name TEXT NOT NULL,
    output_file_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- After running this migration, the registration should work correctly
