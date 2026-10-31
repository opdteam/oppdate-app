DO $$ BEGIN
 CREATE TYPE "public"."ad_placement_zone" AS ENUM('listings_feed', 'listing_page', 'dashboard');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."mentorship_session_status" AS ENUM('scheduled', 'completed', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ad_placements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zone" "ad_placement_zone" NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"provider" varchar(100) DEFAULT 'google_ads' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consultation_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"duration_minutes" integer NOT NULL,
	"price_usd" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mentorship_programmes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"duration_weeks" integer NOT NULL,
	"price_usd" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mentorship_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mentorship_id" uuid NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"status" "mentorship_session_status" DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_config" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saved_opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"saved_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saved_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"alerts_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "current_step" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "consultations" ADD COLUMN "price_usd" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "mentorships" ADD COLUMN "programme_id" uuid;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "field_of_study" varchar(255);--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "eligibility_level" varchar(100);--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "award_value_usd" integer;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "csv_import_batch_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "has_paid" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "suspended_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mentorship_programmes" ADD CONSTRAINT "mentorship_programmes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mentorship_sessions" ADD CONSTRAINT "mentorship_sessions_mentorship_id_mentorships_id_fk" FOREIGN KEY ("mentorship_id") REFERENCES "public"."mentorships"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "platform_config" ADD CONSTRAINT "platform_config_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saved_opportunities" ADD CONSTRAINT "saved_opportunities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saved_opportunities" ADD CONSTRAINT "saved_opportunities_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ad_placements_zone_idx" ON "ad_placements" ("zone");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "consultation_pricing_duration_idx" ON "consultation_pricing" ("duration_minutes");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mentorship_sessions_mentorship_idx" ON "mentorship_sessions" ("mentorship_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "saved_opportunities_user_opportunity_idx" ON "saved_opportunities" ("user_id","opportunity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saved_opportunities_user_idx" ON "saved_opportunities" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saved_searches_user_idx" ON "saved_searches" ("user_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mentorships" ADD CONSTRAINT "mentorships_programme_id_mentorship_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."mentorship_programmes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
