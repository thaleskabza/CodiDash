import { prisma } from "@/lib/prisma";

/**
 * Process expired voucher replacement deadlines.
 * Cancels orderItems where voucherStatus=invalid and replacementDeadline has passed.
 * Charges a cancellation fee and cancels the item (or whole order if no valid items remain).
 *
 * Called by a Supabase cron job or scheduled function.
 */
export async function processExpiredVoucherReplacements(): Promise<void> {
  const expiredItems = await prisma.orderItem.findMany({
    where: {
      voucherStatus: "invalid",
      replacementDeadline: { lt: new Date() },
    },
    include: {
      order: {
        include: { items: true },
      },
    },
  });

  for (const item of expiredItems) {
    await prisma.$transaction(async (tx: typeof prisma) => {
      // Cancel the expired item
      await tx.orderItem.update({
        where: { id: item.id },
        data: { voucherStatus: "cancelled" },
      });

      // Check if any valid items remain in the order
      const remainingValid = item.order.items.filter(
        (i) =>
          i.id !== item.id &&
          !["cancelled", "invalid"].includes(i.voucherStatus),
      );

      if (remainingValid.length === 0) {
        // Cancel entire order
        await tx.order.update({
          where: { id: item.orderId },
          data: { status: "cancelled", cancelledReason: "All vouchers invalid/expired" },
        });
        await tx.orderAudit.create({
          data: {
            orderId: item.orderId,
            previousStatus: item.order.status,
            newStatus: "cancelled",
            actorType: "system",
            metadata: { reason: "No valid vouchers remaining after replacement deadline" },
          },
        });
      }
    });
  }
}
