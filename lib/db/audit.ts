import type { PrismaClient, Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";

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
}
