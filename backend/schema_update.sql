-- Add Email Verification and Password Reset columns to the users table
ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN verification_token TEXT;
ALTER TABLE users ADD COLUMN reset_token TEXT;
ALTER TABLE users ADD COLUMN reset_token_expires TIMESTAMP;
