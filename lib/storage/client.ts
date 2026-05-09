import { S3Client } from "@aws-sdk/client-s3";

export function getStorageClient(): S3Client {
  return new S3Client({
    endpoint: process.env.STORAGE_ENDPOINT ?? "http://minio-microservice.statex-apps.svc.cluster.local:9000",
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY ?? "",
      secretAccessKey: process.env.STORAGE_SECRET_KEY ?? "",
    },
    forcePathStyle: true,
  });
}

export const STORAGE_BUCKET = process.env.STORAGE_BUCKET ?? "school-committee";
