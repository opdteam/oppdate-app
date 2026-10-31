-- Create document_readiness_status enum and application_documents table

DO $$ BEGIN
  CREATE TYPE "public"."document_readiness_status" AS ENUM('ready', 'needs_refinement', 'needs_creation');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "application_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL REFERENCES "applications"("id") ON DELETE CASCADE,
  "document_id" uuid REFERENCES "documents"("id"),
  "document_type" "document_type" NOT NULL,
  "readiness_status" "document_readiness_status" NOT NULL DEFAULT 'ready',
  "slot_label" varchar(255) NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "app_documents_application_idx" ON "application_documents" ("application_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "app_documents_document_idx" ON "application_documents" ("document_id");
