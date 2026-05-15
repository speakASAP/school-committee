import { S3Client } from "@aws-sdk/client-s3";
import { logger } from "@/lib/logger";

const INTERNAL_ENDPOINT = process.env.STORAGE_ENDPOINT ?? "http://minio-microservice.statex-apps.svc.cluster.local:9000";
// Public endpoint used to rewrite presigned URLs so browsers can reach MinIO
const PUBLIC_ENDPOINT = process.env.STORAGE_PUBLIC_ENDPOINT ?? "https://minio.alfares.cz";

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
    endpoint: INTERNAL_ENDPOINT,
    region: "us-east-1",
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

/** Rewrite a presigned URL from internal K8s endpoint to the public MinIO hostname. */
export function toPublicUrl(signedUrl: string): string {
  try {
    const u = new URL(signedUrl);
    const pub = new URL(PUBLIC_ENDPOINT);
    u.protocol = pub.protocol;
    u.host = pub.host;
    return u.toString();
  } catch {
    return signedUrl;
  }
}

export const STORAGE_BUCKET = process.env.STORAGE_BUCKET ?? "school-committee";
