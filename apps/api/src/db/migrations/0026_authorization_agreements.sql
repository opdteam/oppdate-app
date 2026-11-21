-- Create authorization_agreements table and add FK column to applications

CREATE TABLE IF NOT EXISTS "authorization_agreements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"agreement_version" varchar(20) NOT NULL,
	"compliance_category" "compliance_category" NOT NULL,
	"user_approval_record" text NOT NULL,
	"submission_approval_record" text,
	"submission_approved_at" timestamp,
	"signed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "authorization_application_idx" ON "authorization_agreements" ("application_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "authorization_user_idx" ON "authorization_agreements" ("user_id");
--> statement-breakpoint

ALTER TABLE "authorization_agreements" ADD CONSTRAINT "authorization_agreements_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "authorization_agreements" ADD CONSTRAINT "authorization_agreements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "authorization_agreement_id" uuid;
