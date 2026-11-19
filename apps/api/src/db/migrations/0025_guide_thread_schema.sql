-- Make reference_id nullable (guide threads have no reference entity)
ALTER TABLE message_threads ALTER COLUMN reference_id DROP NOT NULL;

-- Add metadata column for guide thread context (opportunity slug, etc.)
ALTER TABLE message_threads ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Unique index: one guide thread per user
CREATE UNIQUE INDEX IF NOT EXISTS threads_guide_unique_idx
  ON message_threads (user_id) WHERE type = 'guide';
