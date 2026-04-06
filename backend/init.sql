-- init.sql
-- Create necessary tables for the application

-- 1. Users table (if you are storing custom user data alongside Clerk/Supabase)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. AI Conversations (for History)
CREATE TABLE IF NOT EXISTS ai_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,      -- e.g., 'Summarize', 'Fix Grammar'
    input_text TEXT NOT NULL,
    output_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Document Conversions (for History)
CREATE TABLE IF NOT EXISTS document_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    original_format TEXT NOT NULL,
    target_format TEXT NOT NULL,
    file_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Audio Conversion History
CREATE TABLE IF NOT EXISTS audio_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    source_format TEXT NOT NULL,
    target_format TEXT NOT NULL,
    file_name TEXT NOT NULL,
    output_file_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert some dummy data so the user has something to see in the Data Explorer immediately
INSERT INTO ai_conversations (user_id, tool_name, input_text, output_text) 
VALUES ('demo_user_1', 'Fix Grammar', 'Their going to the store.', 'They are going to the store.');

INSERT INTO document_history (user_id, original_format, target_format, file_name)
VALUES ('demo_user_1', 'pdf', 'docx', 'invoice_2024.pdf');

INSERT INTO audio_history (user_id, source_format, target_format, file_name, output_file_name)
VALUES ('demo_user_1', 'mp4', 'mp3', 'sample_video.mp4', 'sample_video.mp3');
