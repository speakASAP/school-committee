-- Add voice transcription fields to feedback_items
ALTER TABLE "feedback_items" ADD COLUMN "voice_file_key" TEXT;
ALTER TABLE "feedback_items" ADD COLUMN "voice_transcript" TEXT;
