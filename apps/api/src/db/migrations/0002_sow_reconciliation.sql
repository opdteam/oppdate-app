-- SOW v9.0 schema reconciliation
-- Adds: applyDisabledNote on opportunities, meeting_type enum + column on consultations,
-- eBook extended fields (author, pageCount, category, whatsInside, premiumPriceUsd),
-- mentor_profiles table, mentorship model adjustments (monthly pricing, mentor_profile_id),
-- lemon_squeezy payment gateway, consultation_pricing description

-- New enums
DO $$ BEGIN
 CREATE TYPE "public"."meeting_type" AS ENUM('google_meet', 'zoom');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Add lemon_squeezy to payment_gateway enum
ALTER TYPE "public"."payment_gateway" ADD VALUE IF NOT EXISTS 'lemon_squeezy';
--> statement-breakpoint

-- Opportunities: add apply_disabled_note
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "apply_disabled_note" text;
--> statement-breakpoint

-- Consultations: add meeting_type
ALTER TABLE "consultations" ADD COLUMN IF NOT EXISTS "meeting_type" "meeting_type";
--> statement-breakpoint

-- Consultation pricing: add description
ALTER TABLE "consultation_pricing" ADD COLUMN IF NOT EXISTS "description" text;
--> statement-breakpoint

-- eBooks: add author, page_count, category, whats_inside, premium_price_usd
ALTER TABLE "ebooks" ADD COLUMN IF NOT EXISTS "author" varchar(255) NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "ebooks" ADD COLUMN IF NOT EXISTS "page_count" integer;
--> statement-breakpoint
ALTER TABLE "ebooks" ADD COLUMN IF NOT EXISTS "category" varchar(255);
--> statement-breakpoint
ALTER TABLE "ebooks" ADD COLUMN IF NOT EXISTS "whats_inside" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "ebooks" ADD COLUMN IF NOT EXISTS "premium_price_usd" integer;
--> statement-breakpoint

-- Remove default on author after migration (it was needed to add NOT NULL to existing rows)
ALTER TABLE "ebooks" ALTER COLUMN "author" DROP DEFAULT;
--> statement-breakpoint

-- Mentor profiles table
CREATE TABLE IF NOT EXISTS "mentor_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "name" varchar(255) NOT NULL,
  "specialty" varchar(255) NOT NULL,
  "bio" text NOT NULL,
  "headshot_url" text,
  "published" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "mentor_profiles" ADD CONSTRAINT "mentor_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Mentorship programmes: replace duration_weeks + price_usd with monthly_price_usd
ALTER TABLE "mentorship_programmes" ADD COLUMN IF NOT EXISTS "monthly_price_usd" integer;
--> statement-breakpoint
-- Migrate existing data: set monthly_price_usd from price_usd if any rows exist
UPDATE "mentorship_programmes" SET "monthly_price_usd" = "price_usd" WHERE "monthly_price_usd" IS NULL;
--> statement-breakpoint
-- Now drop the old columns
ALTER TABLE "mentorship_programmes" DROP COLUMN IF EXISTS "duration_weeks";
--> statement-breakpoint
ALTER TABLE "mentorship_programmes" DROP COLUMN IF EXISTS "price_usd";
--> statement-breakpoint
-- Make monthly_price_usd NOT NULL after migration
ALTER TABLE "mentorship_programmes" ALTER COLUMN "monthly_price_usd" SET NOT NULL;
--> statement-breakpoint

-- Mentorships: replace mentor_id (user ref) with mentor_profile_id, drop duration_weeks
ALTER TABLE "mentorships" ADD COLUMN IF NOT EXISTS "mentor_profile_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mentorships" ADD CONSTRAINT "mentorships_mentor_profile_id_mentor_profiles_id_fk" FOREIGN KEY ("mentor_profile_id") REFERENCES "public"."mentor_profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "mentorships" DROP COLUMN IF EXISTS "mentor_id";
--> statement-breakpoint
ALTER TABLE "mentorships" DROP COLUMN IF EXISTS "duration_weeks";
