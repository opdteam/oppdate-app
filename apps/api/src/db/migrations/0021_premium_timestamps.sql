ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "premium_since" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "premium_until" timestamp;
