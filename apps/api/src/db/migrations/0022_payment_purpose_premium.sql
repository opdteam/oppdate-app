-- Add premium to payment_purpose enum
ALTER TYPE "public"."payment_purpose" ADD VALUE IF NOT EXISTS 'premium';
