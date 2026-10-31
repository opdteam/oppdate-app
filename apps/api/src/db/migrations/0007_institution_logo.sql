ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "institution_logo_url" text;
ALTER TABLE "opportunities" DROP COLUMN IF EXISTS "cover_image_url";
