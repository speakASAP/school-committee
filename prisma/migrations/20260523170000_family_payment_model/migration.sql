-- CreateTable: families
CREATE TABLE "families" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- CreateTable: family_members
CREATE TABLE "family_members" (
    "family_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'parent',
    CONSTRAINT "family_members_pkey" PRIMARY KEY ("family_id", "user_id")
);

-- AlterTable: children — add optional family_id FK
ALTER TABLE "children" ADD COLUMN "family_id" UUID;

-- AlterTable: payment_intents — add family_id, school_year, semester columns
ALTER TABLE "payment_intents"
    ADD COLUMN "family_id" UUID,
    ADD COLUMN "school_year" TEXT,
    ADD COLUMN "semester" TEXT;

-- CreateIndex
CREATE INDEX "family_members_user_id_idx" ON "family_members"("user_id");
CREATE INDEX "children_family_id_idx" ON "children"("family_id");
CREATE INDEX "payment_intents_family_id_idx" ON "payment_intents"("family_id");
CREATE INDEX "payment_intents_school_year_semester_idx" ON "payment_intents"("school_id", "school_year", "semester");

-- AddForeignKey: family_members → families
ALTER TABLE "family_members"
    ADD CONSTRAINT "family_members_family_id_fkey"
    FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: children → families
ALTER TABLE "children"
    ADD CONSTRAINT "children_family_id_fkey"
    FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: payment_intents → families
ALTER TABLE "payment_intents"
    ADD CONSTRAINT "payment_intents_family_id_fkey"
    FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE SET NULL ON UPDATE CASCADE;
