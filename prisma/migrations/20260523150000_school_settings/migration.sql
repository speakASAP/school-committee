CREATE TABLE "school_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "school_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "school_settings_school_id_key_key" ON "school_settings"("school_id", "key");
