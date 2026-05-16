/*
  Warnings:

  - Added the required column `school_id` to the `role_upgrade_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `role_upgrade_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "role_upgrade_requests" ADD COLUMN     "school_id" UUID NOT NULL,
ADD COLUMN     "tenant_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "profiles_approval_status_idx" ON "profiles"("approval_status");

-- CreateIndex
CREATE INDEX "role_upgrade_requests_user_id_idx" ON "role_upgrade_requests"("user_id");

-- CreateIndex
CREATE INDEX "role_upgrade_requests_status_idx" ON "role_upgrade_requests"("status");

-- CreateIndex
CREATE INDEX "role_upgrade_requests_tenant_status_idx" ON "role_upgrade_requests"("tenant_id", "status");
