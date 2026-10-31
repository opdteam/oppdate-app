-- Add columns that exist in the Drizzle schema but were never included in a migration

-- compliance_category enum (may already exist from another migration path)
DO $$ BEGIN
 CREATE TYPE "public"."compliance_category" AS ENUM('A', 'B', 'C');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- opportunities: institution_code, oppdate_apply, compliance_category
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "institution_code" varchar(3);
--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "oppdate_apply" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "compliance_category" "compliance_category";
--> statement-breakpoint

-- applications: reference_id
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "reference_id" varchar(20);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "applications_reference_id_idx" ON "applications" ("reference_id");
