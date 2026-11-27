-- Add module permissions to users and assigned_to on mentorships

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "permissions" jsonb DEFAULT '[]';
--> statement-breakpoint

ALTER TABLE "mentorships" ADD COLUMN IF NOT EXISTS "assigned_to" uuid;
--> statement-breakpoint

ALTER TABLE "mentorships" ADD CONSTRAINT "mentorships_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "consultation_sessions" ADD COLUMN IF NOT EXISTS "schedule" jsonb;
