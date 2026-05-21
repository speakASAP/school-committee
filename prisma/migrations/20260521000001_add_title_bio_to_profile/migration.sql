-- Add academic title fields and bio to profiles
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "title_before" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "title_after" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "bio" TEXT;
