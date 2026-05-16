/*
  Warnings:

  - Added the required column `first_name` to the `children` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `children` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "children" ADD COLUMN     "first_name" TEXT NOT NULL,
ADD COLUMN     "last_name" TEXT NOT NULL,
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "approval_status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" UUID,
ADD COLUMN     "rejection_reason" TEXT;

-- CreateTable
CREATE TABLE "role_upgrade_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "requested_role" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_upgrade_requests_pkey" PRIMARY KEY ("id")
);
