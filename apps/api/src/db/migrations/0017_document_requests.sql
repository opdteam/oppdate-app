CREATE TABLE IF NOT EXISTS "document_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "thread_id" uuid NOT NULL REFERENCES "message_threads"("id") ON DELETE CASCADE,
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "doc_requests_thread_idx" ON "document_requests" ("thread_id");

CREATE TABLE IF NOT EXISTS "document_request_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "request_id" uuid NOT NULL REFERENCES "document_requests"("id") ON DELETE CASCADE,
  "label" text NOT NULL,
  "document_id" uuid REFERENCES "documents"("id"),
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "doc_request_items_status_check" CHECK ("status" IN ('pending', 'uploaded', 'verified'))
);

CREATE INDEX IF NOT EXISTS "doc_request_items_request_idx" ON "document_request_items" ("request_id");
