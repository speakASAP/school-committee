import { S3Client } from "@aws-sdk/client-s3";
import { logger } from "@/lib/logger";

export function getStorageClient(): S3Client {
  const accessKeyId = process.env.STORAGE_ACCESS_KEY ?? "";
  const secretAccessKey = process.env.STORAGE_SECRET_KEY ?? "";

  if (!accessKeyId || !secretAccessKey) {
    logger.error("storage: STORAGE_ACCESS_KEY or STORAGE_SECRET_KEY is not configured", {
      error_code: "MISCONFIGURATION",
      has_access_key: !!accessKeyId,
      has_secret_key: !!secretAccessKey,
    });
  }

  return new S3Client({
    endpoint: process.env.STORAGE_ENDPOINT ?? "http://minio-microservice.statex-apps.svc.cluster.local:9000",
    region: "us-east-1",
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });
}

export const STORAGE_BUCKET = process.env.STORAGE_BUCKET ?? "school-committee";
