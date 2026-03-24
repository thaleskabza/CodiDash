import { prisma } from "@/lib/prisma";

type ActorType = "customer" | "driver" | "admin" | "system";

interface AuditParams {
  orderId: string;
  previousStatus: string;
  newStatus: string;
  actorType: ActorType;
  actorId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Append an immutable audit record for an order status transition.
 * All order status changes MUST go through this function to maintain the audit trail.
 */
export async function logOrderAudit(params: AuditParams): Promise<void> {
  await prisma.orderAudit.create({
    data: {
      orderId: params.orderId,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      actorType: params.actorType,
      actorId: params.actorId ?? null,
      metadata: (params.metadata ?? {}) as object,
    },
  });
}

/**
 * Retrieve the full audit trail for an order, ordered chronologically.
 */
export async function getOrderAuditTrail(orderId: string) {
  return prisma.orderAudit.findMany({
    where: { orderId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      previousStatus: true,
      newStatus: true,
      actorType: true,
      actorId: true,
      metadata: true,
      createdAt: true,
    },
  });
}
