-- Add 'guide' to thread_type enum
-- NOTE: ALTER TYPE ADD VALUE cannot run inside a transaction in PostgreSQL.
-- The migrate script detects this and runs it outside BEGIN/COMMIT.
ALTER TYPE thread_type ADD VALUE IF NOT EXISTS 'guide';
