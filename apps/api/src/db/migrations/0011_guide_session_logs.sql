DO $$ BEGIN
  CREATE TYPE "guide_session_sentiment" AS ENUM('positive', 'neutral', 'concerned');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "guide_elig_verdict" AS ENUM('eligible', 'borderline', 'ineligible');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "guide_flag_reason" AS ENUM('inaccurate', 'off_brand', 'harmful', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "guide_session_logs" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id"          uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "opportunity_slug" text,
  "started_at"       timestamptz NOT NULL DEFAULT now(),
  "ended_at"         timestamptz,
  "message_count"    integer NOT NULL DEFAULT 0,
  "elig_triggered"   boolean NOT NULL DEFAULT false,
  "elig_verdict"     "guide_elig_verdict",
  "sentiment"        "guide_session_sentiment" NOT NULL DEFAULT 'neutral',
  "messages"         jsonb NOT NULL DEFAULT '[]',
  "flag_count"       integer NOT NULL DEFAULT 0,
  "created_at"       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "guide_response_flags" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id"    uuid NOT NULL REFERENCES "guide_session_logs"("id") ON DELETE CASCADE,
  "message_index" integer NOT NULL,
  "reason"        "guide_flag_reason" NOT NULL,
  "notes"         text,
  "admin_id"      uuid NOT NULL REFERENCES "users"("id"),
  "created_at"    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "guide_sessions_user_idx" ON "guide_session_logs"("user_id");
CREATE INDEX IF NOT EXISTS "guide_sessions_slug_idx" ON "guide_session_logs"("opportunity_slug");
CREATE INDEX IF NOT EXISTS "guide_sessions_created_idx" ON "guide_session_logs"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "guide_flags_session_idx" ON "guide_response_flags"("session_id");
