-- Add group_key to consultation_sessions so the admin can group duration variants
-- (e.g. Quick Check / Full Review / Comprehensive) under a single named offering

ALTER TABLE "consultation_sessions" ADD COLUMN IF NOT EXISTS "group_key" varchar(100);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "consultation_sessions_group_key_idx" ON "consultation_sessions" ("group_key");
