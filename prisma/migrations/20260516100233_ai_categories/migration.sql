/*
  Warnings:

  - You are about to drop the column `category` on the `feedback_items` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "feedback_items" DROP COLUMN "category",
ADD COLUMN     "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ideas" ADD COLUMN     "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];
