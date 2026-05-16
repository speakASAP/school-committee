import { S3Client } from "@aws-sdk/client-s3";
import { logger } from "@/lib/logger";

const INTERNAL_ENDPOINT = process.env.STORAGE_ENDPOINT ?? "http://minio-microservice.statex-apps.svc.cluster.local:9000";
const PUBLIC_ENDPOINT = process.env.STORAGE_PUBLIC_ENDPOINT ?? "https://minio.alfares.cz";

const commonConfig = {
  region: "us-east-1",
  forcePathStyle: true,
  // Disable automatic checksum injection — MinIO OSS does not support it in presigned URLs
  requestChecksumCalculation: "WHEN_REQUIRED" as const,
  responseChecksumValidation: "WHEN_REQUIRED" as const,
};

function getCredentials() {
  const accessKeyId = process.env.STORAGE_ACCESS_KEY ?? "";
  const secretAccessKey = process.env.STORAGE_SECRET_KEY ?? "";
  if (!accessKeyId || !secretAccessKey) {
    logger.error("storage: STORAGE_ACCESS_KEY or STORAGE_SECRET_KEY is not configured", {
      error_code: "MISCONFIGURATION",
      has_access_key: !!accessKeyId,
      has_secret_key: !!secretAccessKey,
    });
  }
  return { accessKeyId, secretAccessKey };
}

/** Client for server-side operations (GetObject, DeleteObject, etc.) via internal K8s DNS. */
export function getStorageClient(): S3Client {
  return new S3Client({ ...commonConfig, endpoint: INTERNAL_ENDPOINT, credentials: getCredentials() });
}

/**
 * Client for generating presigned URLs. Signs against the public hostname so browsers
 * can use the URL directly — hostname rewriting after signing breaks the signature.
 */
export function getPresignClient(): S3Client {
  return new S3Client({ ...commonConfig, endpoint: PUBLIC_ENDPOINT, credentials: getCredentials() });
}

export const STORAGE_BUCKET = process.env.STORAGE_BUCKET ?? "school-committee";
