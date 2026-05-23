CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "from_user_id" UUID NOT NULL,
    "parent_id" UUID,
    "body" TEXT NOT NULL,
    "is_from_committee" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "messages_school_id_idx" ON "messages"("school_id");
CREATE INDEX "messages_from_user_id_idx" ON "messages"("from_user_id");
CREATE INDEX "messages_parent_id_idx" ON "messages"("parent_id");
CREATE INDEX "messages_created_at_idx" ON "messages"("created_at" DESC);

ALTER TABLE "messages" ADD CONSTRAINT "messages_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
