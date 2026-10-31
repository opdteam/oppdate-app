-- Add preferences column to users for onboarding personalisation data
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferences" jsonb DEFAULT '{}';
