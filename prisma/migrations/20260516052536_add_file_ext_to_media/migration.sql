-- AlterTable
ALTER TABLE "task_photos" ADD COLUMN     "file_ext" TEXT NOT NULL DEFAULT 'jpg';

-- AlterTable
ALTER TABLE "task_videos" ADD COLUMN     "file_ext" TEXT NOT NULL DEFAULT 'mp4';
