import type { PrismaClient, Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";
import { logger } from "@/lib/logger";

export interface AuditEventInput {
  tenantId: string;
  schoolId?: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
  ipHash?: string;
}

export async function writeAuditEvent(
  event: AuditEventInput,
  tx?: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
): Promise<void> {
  const client = tx ?? db;
  try {
    await client.auditLog.create({
      data: {
        tenantId: event.tenantId,
        schoolId: event.schoolId ?? null,
        actorUserId: event.actorUserId ?? null,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId ?? null,
        metadata: (event.metadata ?? {}) as Prisma.InputJsonValue,
        requestId: event.requestId ?? null,
        ipHash: event.ipHash ?? null,
      },
    });
  } catch (err) {
    logger.error("audit: failed to write audit event", {
      request_id: event.requestId,
      error_code: "AUDIT_WRITE_FAILED",
      error_message: err instanceof Error ? err.message : String(err),
      error_name: err instanceof Error ? err.name : undefined,
      action: event.action,
      entity_type: event.entityType,
      entity_id: event.entityId,
    });
    throw err;
  }
}
