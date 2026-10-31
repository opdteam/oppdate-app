DO $$ BEGIN
 CREATE TYPE "public"."application_status" AS ENUM('eligibility_screening', 'document_collection', 'awaiting_payment', 'payment_confirmed', 'gmail_setup', 'submitted', 'under_review', 'decision_pending', 'accepted', 'rejected', 'withdrawn');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."consultation_status" AS ENUM('pending', 'confirmed', 'completed', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."document_type" AS ENUM('cv', 'transcript', 'certificate', 'portfolio', 'reference_letter', 'personal_statement', 'passport_photo', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."ebook_status" AS ENUM('published', 'unpublished');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."mentorship_status" AS ENUM('pending', 'active', 'completed', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."message_sender" AS ENUM('user', 'team', 'system');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."notification_type" AS ENUM('application_status_change', 'new_message', 'payment_confirmed', 'gmail_setup_required', 'deadline_reminder', 'consultation_confirmed', 'mentorship_update');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."opportunity_status" AS ENUM('draft', 'published', 'archived', 'expired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."opportunity_type" AS ENUM('internship', 'scholarship', 'training_bootcamp', 'entry_level_job', 'fellowship', 'grant', 'volunteering', 'competition', 'relocation');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_gateway" AS ENUM('stripe', 'flutterwave', 'paystack');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_purpose" AS ENUM('apply_for_me', 'consultation', 'mentorship', 'ebook');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_status" AS ENUM('pending', 'processing', 'succeeded', 'failed', 'refunded');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."thread_status" AS ENUM('active', 'awaiting_user', 'awaiting_team', 'resolved', 'closed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."thread_type" AS ENUM('apply_for_me', 'mentorship');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."user_role" AS ENUM('user', 'staff_admin', 'manager_admin', 'super_admin');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"action" varchar(255) NOT NULL,
	"target_type" varchar(100) NOT NULL,
	"target_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"status" "application_status" DEFAULT 'eligibility_screening' NOT NULL,
	"eligibility_responses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attached_documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"payment_id" uuid,
	"gmail_address_encrypted" text,
	"gmail_password_encrypted" text,
	"gmail_accessed_at" timestamp,
	"gmail_accessed_by" uuid,
	"submitted_at" timestamp,
	"resolved_at" timestamp,
	"admin_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consultations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"duration_minutes" integer NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"status" "consultation_status" DEFAULT 'pending' NOT NULL,
	"meeting_link" text,
	"payment_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "document_type" NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"previous_version_id" uuid,
	"times_reused" integer DEFAULT 0 NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ebook_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ebook_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"last_read_at" timestamp,
	"reading_progress" integer DEFAULT 0 NOT NULL,
	"purchased_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ebooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"slug" varchar(600) NOT NULL,
	"description" text NOT NULL,
	"cover_image_url" text NOT NULL,
	"file_url" text NOT NULL,
	"file_format" varchar(10) DEFAULT 'pdf' NOT NULL,
	"price_usd" integer NOT NULL,
	"status" "ebook_status" DEFAULT 'unpublished' NOT NULL,
	"purchase_count" integer DEFAULT 0 NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mentorships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mentor_id" uuid,
	"duration_weeks" integer NOT NULL,
	"status" "mentorship_status" DEFAULT 'pending' NOT NULL,
	"thread_id" uuid,
	"payment_id" uuid,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "thread_type" NOT NULL,
	"reference_id" uuid NOT NULL,
	"status" "thread_status" DEFAULT 'active' NOT NULL,
	"assigned_to" uuid,
	"last_message_at" timestamp,
	"unread_by_user" integer DEFAULT 0 NOT NULL,
	"unread_by_team" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"sender_type" "message_sender" NOT NULL,
	"content" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"reference_id" uuid,
	"reference_type" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"slug" varchar(600) NOT NULL,
	"type" "opportunity_type" NOT NULL,
	"status" "opportunity_status" DEFAULT 'draft' NOT NULL,
	"institution" varchar(500) NOT NULL,
	"country" varchar(100) NOT NULL,
	"region" varchar(100) NOT NULL,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"who_its_for" text NOT NULL,
	"what_is_offered" text NOT NULL,
	"eligibility_criteria" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required_documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"deadline" timestamp NOT NULL,
	"application_open_date" timestamp,
	"oppdate_service_fee_usd" integer DEFAULT 0 NOT NULL,
	"institution_fee_usd" integer DEFAULT 0 NOT NULL,
	"post_submission_message" text DEFAULT 'Best of luck with your application! We will be in touch with updates.' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"cover_image_url" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"apply_count" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" "payment_purpose" NOT NULL,
	"reference_id" uuid NOT NULL,
	"gateway" "payment_gateway" NOT NULL,
	"gateway_payment_id" varchar(500) NOT NULL,
	"amount_usd" integer NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"password_hash" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"avatar_url" text,
	"google_id" varchar(255),
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "applications" ADD CONSTRAINT "applications_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "consultations" ADD CONSTRAINT "consultations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ebook_purchases" ADD CONSTRAINT "ebook_purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ebook_purchases" ADD CONSTRAINT "ebook_purchases_ebook_id_ebooks_id_fk" FOREIGN KEY ("ebook_id") REFERENCES "public"."ebooks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mentorships" ADD CONSTRAINT "mentorships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mentorships" ADD CONSTRAINT "mentorships_mentor_id_users_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mentorships" ADD CONSTRAINT "mentorships_thread_id_message_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."message_threads"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_message_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."message_threads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_admin_idx" ON "admin_audit_log" ("admin_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_target_idx" ON "admin_audit_log" ("target_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "applications_user_idx" ON "applications" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "applications_opportunity_idx" ON "applications" ("opportunity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "applications_status_idx" ON "applications" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documents_user_idx" ON "documents" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documents_type_idx" ON "documents" ("type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ebook_purchases_user_ebook_idx" ON "ebook_purchases" ("user_id","ebook_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ebooks_slug_idx" ON "ebooks" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ebooks_status_idx" ON "ebooks" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "threads_user_idx" ON "message_threads" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "threads_reference_idx" ON "message_threads" ("reference_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "threads_status_idx" ON "message_threads" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_thread_idx" ON "messages" ("thread_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_sender_idx" ON "messages" ("sender_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_created_idx" ON "messages" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_read_idx" ON "notifications" ("read");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "opportunities_slug_idx" ON "opportunities" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "opportunities_status_idx" ON "opportunities" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "opportunities_type_idx" ON "opportunities" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "opportunities_deadline_idx" ON "opportunities" ("deadline");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "opportunities_featured_idx" ON "opportunities" ("featured");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_user_idx" ON "payments" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_reference_idx" ON "payments" ("reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payments_gateway_payment_idx" ON "payments" ("gateway_payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_google_id_idx" ON "users" ("google_id");