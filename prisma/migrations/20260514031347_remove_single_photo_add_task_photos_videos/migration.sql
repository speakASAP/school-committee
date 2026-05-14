/*
  Warnings:

  - You are about to drop the column `photo_file_id` on the `tasks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "photo_file_id",
ADD COLUMN     "ai_draft_meta" JSONB,
ADD COLUMN     "audio_file_id" UUID,
ADD COLUMN     "raw_transcript" TEXT;

-- CreateTable
CREATE TABLE "task_photos" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_videos" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_videos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "task_photos" ADD CONSTRAINT "task_photos_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_videos" ADD CONSTRAINT "task_videos_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
