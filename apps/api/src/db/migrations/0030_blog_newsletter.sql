-- Blog & Newsletter tables

DO $$ BEGIN
  CREATE TYPE "blog_post_status" AS ENUM('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "newsletter_edition_status" AS ENUM('draft', 'scheduled', 'sending', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "subscriber_status" AS ENUM('active', 'unsubscribed', 'bounced');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Blog categories
CREATE TABLE IF NOT EXISTS "blog_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(100) NOT NULL,
  "slug" varchar(120) NOT NULL,
  "description" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "blog_categories_slug_idx" ON "blog_categories" ("slug");

-- Blog posts
CREATE TABLE IF NOT EXISTS "blog_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" varchar(300) NOT NULL,
  "slug" varchar(350) NOT NULL,
  "status" "blog_post_status" NOT NULL DEFAULT 'draft',
  "excerpt" text,
  "content" text,
  "cover_image_url" text,
  "category_id" uuid REFERENCES "blog_categories"("id") ON DELETE SET NULL,
  "tags" jsonb DEFAULT '[]'::jsonb,
  "author_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "reading_time_minutes" integer NOT NULL DEFAULT 1,
  "meta_title" varchar(200),
  "meta_description" varchar(500),
  "view_count" integer NOT NULL DEFAULT 0,
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "blog_posts_slug_idx" ON "blog_posts" ("slug");
CREATE INDEX IF NOT EXISTS "blog_posts_status_idx" ON "blog_posts" ("status");
CREATE INDEX IF NOT EXISTS "blog_posts_category_idx" ON "blog_posts" ("category_id");
CREATE INDEX IF NOT EXISTS "blog_posts_author_idx" ON "blog_posts" ("author_id");

-- Newsletter subscribers
CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255) NOT NULL,
  "name" varchar(255),
  "status" "subscriber_status" NOT NULL DEFAULT 'active',
  "source" varchar(50) NOT NULL DEFAULT 'footer_form',
  "unsubscribe_token" varchar(64) NOT NULL,
  "unsubscribed_at" timestamp with time zone,
  "subscribed_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "newsletter_subscribers_email_idx" ON "newsletter_subscribers" ("email");
CREATE INDEX IF NOT EXISTS "newsletter_subscribers_status_idx" ON "newsletter_subscribers" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "newsletter_subscribers_token_idx" ON "newsletter_subscribers" ("unsubscribe_token");

-- Newsletter editions
CREATE TABLE IF NOT EXISTS "newsletter_editions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "subject" varchar(500) NOT NULL,
  "preheader_text" varchar(300),
  "body_html" text,
  "blog_post_id" uuid REFERENCES "blog_posts"("id") ON DELETE SET NULL,
  "status" "newsletter_edition_status" NOT NULL DEFAULT 'draft',
  "scheduled_at" timestamp with time zone,
  "sent_at" timestamp with time zone,
  "sent_count" integer NOT NULL DEFAULT 0,
  "open_count" integer NOT NULL DEFAULT 0,
  "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "newsletter_editions_status_idx" ON "newsletter_editions" ("status");

-- Newsletter send log
CREATE TABLE IF NOT EXISTS "newsletter_send_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "edition_id" uuid NOT NULL REFERENCES "newsletter_editions"("id") ON DELETE CASCADE,
  "subscriber_id" uuid NOT NULL REFERENCES "newsletter_subscribers"("id") ON DELETE CASCADE,
  "sent_at" timestamp with time zone NOT NULL DEFAULT now(),
  "opened_at" timestamp with time zone
);
CREATE UNIQUE INDEX IF NOT EXISTS "newsletter_send_log_edition_sub_idx" ON "newsletter_send_log" ("edition_id", "subscriber_id");
CREATE INDEX IF NOT EXISTS "newsletter_send_log_edition_idx" ON "newsletter_send_log" ("edition_id");
