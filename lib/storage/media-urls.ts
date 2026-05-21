import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getPresignClient, STORAGE_BUCKET } from "@/lib/storage/client";
import { logger } from "@/lib/logger";
import type { TaskMediaResult } from "@/lib/db/task-media";

const PRESIGN_TTL = 3600; // 1 hour

export async function getAvatarUrl(avatarFileKey: string | null, requestId: string): Promise<string | null> {
  if (!avatarFileKey) return null;
  try {
    const client = getPresignClient();
    const command = new GetObjectCommand({ Bucket: STORAGE_BUCKET, Key: avatarFileKey });
    return await getSignedUrl(client, command, { expiresIn: PRESIGN_TTL });
  } catch (err) {
    logger.error("media-urls: avatar presign failed", {
      request_id: requestId,
      avatar_file_key: avatarFileKey,
      error_message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export interface MediaWithUrl {
  id: string;
  fileId: string;
  url: string;
}

export interface MediaUrls {
  photos: MediaWithUrl[];
  videos: MediaWithUrl[];
}

async function presignGet(prefix: string, fileId: string, fileExt: string, requestId: string): Promise<string> {
  const client = getPresignClient();
  const command = new GetObjectCommand({
    Bucket: STORAGE_BUCKET,
    Key: `${prefix}/${fileId}.${fileExt}`,
  });
  try {
    return await getSignedUrl(client, command, { expiresIn: PRESIGN_TTL });
  } catch (err) {
    logger.error("media-urls: presign failed", {
      request_id: requestId,
      file_id: fileId,
      error_message: err instanceof Error ? err.message : String(err),
    });
    return "";
  }
}

export async function getMediaPresignedUrls(media: TaskMediaResult, requestId: string): Promise<MediaUrls> {
  const [photos, videos] = await Promise.all([
    Promise.all(
      media.photos.map(async (p) => ({
        id: p.id,
        fileId: p.fileId,
        url: await presignGet("tasks/photos", p.fileId, p.fileExt, requestId),
      })),
    ),
    Promise.all(
      media.videos.map(async (v) => ({
        id: v.id,
        fileId: v.fileId,
        url: await presignGet("tasks/videos", v.fileId, v.fileExt, requestId),
      })),
    ),
  ]);
  return { photos, videos };
}
