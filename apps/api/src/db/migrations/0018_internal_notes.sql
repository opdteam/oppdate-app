ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;
