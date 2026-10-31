CREATE TABLE IF NOT EXISTS "avatar_presets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"label" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
