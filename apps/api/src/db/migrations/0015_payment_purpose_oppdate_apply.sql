-- Add oppdate_apply to payment_purpose enum
ALTER TYPE "public"."payment_purpose" ADD VALUE IF NOT EXISTS 'oppdate_apply';
