-- Consultation sessions and slots
-- Replaces the global pricing-tier model with named, admin-created bookable sessions

CREATE TABLE IF NOT EXISTS "consultation_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "duration_minutes" integer NOT NULL,
  "price_usd" integer NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "consultation_slots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "consultation_sessions"("id"),
  "starts_at" timestamp NOT NULL,
  "claimed" boolean NOT NULL DEFAULT false,
  "consultation_id" uuid,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint

ALTER TABLE "consultations" ADD COLUMN IF NOT EXISTS "session_id" uuid REFERENCES "consultation_sessions"("id");
--> statement-breakpoint
ALTER TABLE "consultations" ADD COLUMN IF NOT EXISTS "slot_id" uuid;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "consultation_sessions_active_idx" ON "consultation_sessions" ("active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consultation_slots_session_claimed_idx" ON "consultation_slots" ("session_id", "claimed");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consultation_slots_starts_at_idx" ON "consultation_slots" ("starts_at");
