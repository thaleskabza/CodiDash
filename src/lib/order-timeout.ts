import { prisma } from "@/lib/prisma";

/**
 * Cancel orders that have been in 'pending' (awaiting driver) for > 30 minutes.
 * Called by a Supabase cron job or scheduled function.
 */
export async function processOrderTimeouts(): Promise<void> {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  const timedOutOrders = await prisma.order.findMany({
    where: {
      status: "pending",
      createdAt: { lt: thirtyMinutesAgo },
    },
    select: { id: true, status: true },
  });

  for (const order of timedOutOrders) {
    await prisma.$transaction(async (tx: typeof prisma) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "cancelled", cancelledReason: "No driver accepted within 30 minutes" },
      });
      await tx.orderAudit.create({
        data: {
          orderId: order.id,
          previousStatus: order.status,
          newStatus: "cancelled",
          actorType: "system",
          metadata: { reason: "driver_timeout", timeoutMinutes: 30 },
        },
      });
    });
  }
}

/**
 * Cancel orders that have been in 'accepted' (driver accepted but not picked up) for > 90 minutes.
 * These are reassigned back to pending for re-broadcast.
 * Called by a Supabase cron job or scheduled function.
 */
export async function processPickupTimeouts(): Promise<void> {
  const ninetyMinutesAgo = new Date(Date.now() - 90 * 60 * 1000);

  const staleOrders = await prisma.order.findMany({
    where: {
      status: "accepted",
      updatedAt: { lt: ninetyMinutesAgo },
    },
    select: { id: true, status: true, driverId: true },
  });

  for (const order of staleOrders) {
    await prisma.$transaction(async (tx: typeof prisma) => {
      // Increment driver cancellation count and free them up
      if (order.driverId) {
        await tx.driver.update({
          where: { id: order.driverId },
          data: {
            status: "available",
            cancellationCount: { increment: 1 },
          },
        });
      }

      // Reassign order to pending for re-broadcast
      await tx.order.update({
        where: { id: order.id },
        data: { status: "pending", driverId: null },
      });

      await tx.orderAudit.create({
        data: {
          orderId: order.id,
          previousStatus: "accepted",
          newStatus: "pending",
          actorType: "system",
          metadata: {
            reason: "pickup_timeout",
            timeoutMinutes: 90,
            previousDriverId: order.driverId,
          },
        },
      });
    });
  }
}
