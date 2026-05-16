-- AlterTable
ALTER TABLE "ideas" ADD COLUMN     "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "voice_file_key" TEXT,
ADD COLUMN     "voice_transcript" TEXT;

-- CreateTable
CREATE TABLE "idea_photos" (
    "id" UUID NOT NULL,
    "idea_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "file_ext" TEXT NOT NULL DEFAULT 'jpg',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idea_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea_videos" (
    "id" UUID NOT NULL,
    "idea_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "file_ext" TEXT NOT NULL DEFAULT 'mp4',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idea_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea_comments" (
    "id" UUID NOT NULL,
    "idea_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idea_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea_comment_likes" (
    "id" UUID NOT NULL,
    "comment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idea_comment_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label_cs" TEXT NOT NULL,
    "label_en" TEXT NOT NULL,
    "description_cs" TEXT,
    "tier" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "achievement_key" TEXT NOT NULL,
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "idea_comment_likes_comment_id_user_id_key" ON "idea_comment_likes"("comment_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_key_key" ON "achievements"("key");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_user_id_achievement_key_key" ON "user_achievements"("user_id", "achievement_key");

-- AddForeignKey
ALTER TABLE "idea_photos" ADD CONSTRAINT "idea_photos_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_videos" ADD CONSTRAINT "idea_videos_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_comments" ADD CONSTRAINT "idea_comments_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_comment_likes" ADD CONSTRAINT "idea_comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "idea_comments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
